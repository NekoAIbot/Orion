import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  AI_CONFIG,
  checkAiRateLimit,
  getCachedAiResponse,
  resolveServerVerifiedRole,
  setCachedAiResponse,
  validateTeacherGeneratorRequest,
  validateTutorRequest,
  verifyFirebaseBearerToken,
} from './src/utils/aiServerSecurity';

dotenv.config();

const PORT = 3000;

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId: string;
}

function getFirebaseAppletConfig(): FirebaseAppletConfig {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8');
    const parsed = JSON.parse(raw) as Partial<FirebaseAppletConfig>;
    return {
      projectId: parsed.projectId || '',
      apiKey: parsed.apiKey || '',
      firestoreDatabaseId: parsed.firestoreDatabaseId || '(default)',
    };
  } catch {
    return { projectId: '', apiKey: '', firestoreDatabaseId: '(default)' };
  }
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface AuthenticatedRequest extends Request {
  verifiedUid?: string;
  verifiedEmail?: string;
  verifiedIdToken?: string;
  effectiveRole?: 'student' | 'independent_learner' | 'teacher' | 'school_admin' | 'platform_admin';
  isPlatformAdmin?: boolean;
}

async function aiSecurityMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const clientIp =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : req.ip) || 'local_client';

  // 1. Sliding-Window Rate Limit Check (Cost & Abuse Safeguard)
  const rateCheck = checkAiRateLimit(clientIp);
  res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));
  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
    res.status(429).json({
      error: 'Too many AI requests. Please wait before submitting another request.',
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    });
    return;
  }

  // 2. Strict Firebase ID Token Authentication (Production Default)
  const authHeader = req.headers.authorization;
  const strictAuth = AI_CONFIG.requireStrictAuth;

  if (strictAuth || authHeader) {
    const fbCfg = getFirebaseAppletConfig();
    const verification = await verifyFirebaseBearerToken(authHeader, fbCfg.apiKey);
    if (!verification.verified || !verification.uid || !verification.idToken) {
      res.status(401).json({
        error:
          verification.error ||
          'Unauthorized: Valid Firebase Authentication ID token is required to access ORION AI services.',
        requiresAuth: true,
      });
      return;
    }

    const requestedRole =
      typeof req.headers['x-orion-role'] === 'string'
        ? req.headers['x-orion-role']
        : typeof req.headers['x-kokolearn-role'] === 'string'
        ? req.headers['x-kokolearn-role']
        : typeof req.body?.role === 'string'
        ? req.body.role
        : undefined;

    const roleResolution = await resolveServerVerifiedRole({
      uid: verification.uid,
      email: verification.email,
      emailVerified: verification.emailVerified,
      idToken: verification.idToken,
      customClaims: verification.customClaims,
      projectId: fbCfg.projectId,
      databaseId: fbCfg.firestoreDatabaseId,
      requestedRole,
    });

    req.verifiedUid = verification.uid;
    req.verifiedEmail = verification.email;
    req.verifiedIdToken = verification.idToken;
    req.effectiveRole = roleResolution.effectiveRole;
    req.isPlatformAdmin = roleResolution.isPlatformAdmin;
  }

  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    const hasKey = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
        process.env.GEMINI_API_KEY.trim() !== ''
    );
    res.json({
      status: 'ok',
      platform: 'ORION — AI-Powered Learning Ecosystem for Nigeria and Beyond',
      geminiConfigured: hasKey,
      configuredModel: AI_CONFIG.model,
      strictFirebaseAuthRequired: AI_CONFIG.requireStrictAuth,
      rateLimitPerMinute: AI_CONFIG.rateLimitMaxRequests,
    });
  });

  // Trusted Server-Side Platform Administrator Provisioning Endpoint
  app.post(
    '/api/admin/provision-platform-admin',
    aiSecurityMiddleware,
    async (req: AuthenticatedRequest, res) => {
      if (!req.verifiedUid || !req.verifiedIdToken) {
        res.status(401).json({
          error: 'Unauthorized: Valid Firebase Authentication ID token required.',
        });
        return;
      }

      if (!req.isPlatformAdmin) {
        res.status(403).json({
          error:
            'Forbidden: Only an explicitly authorized platform administrator can provision platform administrator records. Ordinary users and school administrators cannot grant platform administrator privileges.',
        });
        return;
      }

      const targetAdminId =
        typeof req.body?.targetAdminId === 'string' && req.body.targetAdminId.trim()
          ? req.body.targetAdminId.trim()
          : req.verifiedUid;
      const targetEmail =
        typeof req.body?.targetEmail === 'string' && req.body.targetEmail.trim()
          ? req.body.targetEmail.trim()
          : req.verifiedEmail || '';

      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(targetAdminId) || targetEmail.length < 3) {
        res.status(400).json({
          error: 'Invalid targetAdminId or targetEmail for platform administrator provisioning.',
        });
        return;
      }

      const provisioningMethod =
        targetAdminId === req.verifiedUid ? 'bootstrap_owner_claim' : 'admin_grant';

      res.json({
        status: 'authorized',
        adminRecord: {
          adminId: targetAdminId,
          email: targetEmail,
          role: 'platform_admin',
          status: 'active',
          provisionedBy: req.verifiedUid,
          provisioningMethod,
        },
      });
    }
  );

  // 1. Personalised AI Tutor Endpoint (Hint-First, Step-by-Step, Exam Prep, Project Guidance)
  app.post('/api/ai/tutor', aiSecurityMiddleware, async (req: AuthenticatedRequest, res) => {
    const validation = validateTutorRequest(req.body);
    if (!validation.ok) {
      res.status(validation.status).json({ error: validation.error });
      return;
    }

    const {
      className,
      subject,
      topicTitle,
      learningObjective,
      lessonSummary,
      workedExample,
      mode,
      sanitizedQuestion,
    } = validation.data;

    const cacheKey = `tutor:${className}:${subject}:${topicTitle}:${mode}:${sanitizedQuestion}`;
    const cached = getCachedAiResponse<{ reply: string; mode: string; source: string }>(cacheKey);
    if (cached) {
      res.json({ ...cached, cached: true });
      return;
    }

    const ai = getGenAIClient();

    const modeInstructions: Record<string, string> = {
      hint_first:
        'MODE: HINT-FIRST GUIDED PROBLEM SOLVING. Do NOT reveal the final numerical or direct answer yet. Give a clear, encouraging Socratic hint, identify any likely misconception in the student’s question, and guide them to take the next step themselves.',
      step_by_step:
        'MODE: STEP-BY-STEP EXPLANATION. Break the concept or problem down into clear numbered steps using age-appropriate Nigerian examples (e.g. Naira, local cities, everyday school science). Explain WHY each step works.',
      exam_prep:
        'MODE: EXAMINATION PREPARATION. Provide a targeted Common Entrance / BECE / WASSCE / NECO style practice question on this topic, show the marking rubric breakdown, and highlight 1 common student pitfall to avoid.',
      project_guidance:
        'MODE: PRACTICAL PROJECT GUIDANCE. Suggest a safe, hands-on practical activity or mini-project the student can carry out using locally available materials in Nigeria to master this skill.',
    };

    const systemInstruction = `You are the ORION AI Tutor (ORION Learn) for Nigerian Primary and Secondary Education.
Target Student Level: ${className} | Subject: ${subject}
Current Topic: ${topicTitle}
Learning Objective: ${learningObjective}
Approved Lesson Context: ${lessonSummary}
Worked Reference: ${workedExample}

CRITICAL RULES:
1. Keep language age-appropriate for ${className} in Nigeria.
2. Ground your response strictly in the provided topic and learning objective. Never fabricate official government policy claims or claim unverified curriculum material is official NERDC text.
3. Never ask for or repeat personal student identifiers (names, emails, phone numbers).
4. ${modeInstructions[mode] || modeInstructions.hint_first}`;

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: AI_CONFIG.model,
          contents: sanitizedQuestion,
          config: {
            systemInstruction,
          },
        });

        const text = response.text || 'Unable to generate response.';
        const payload = {
          reply: text,
          mode,
          source: 'gemini_live',
        };
        setCachedAiResponse(cacheKey, payload);
        res.json(payload);
        return;
      } catch {
        console.warn('Gemini tutor API fallback triggered (safe error boundary).');
      }
    }

    // Curriculum-Grounded Structured Fallback when Gemini API key is not active or quota is reached
    let fallbackReply = '';
    if (mode === 'hint_first') {
      fallbackReply = `**Guided Hint (${className} ${subject} — ${topicTitle}):**\n\nBefore we look at the final answer, let's break your question down:\n1. **What we know from the topic:** ${lessonSummary}\n2. **Your Next Step:** Compare your problem with this pattern:\n\`${workedExample}\`\n\n*Try applying Step 1 to your question: "${sanitizedQuestion}". What value or relationship do you get first?*`;
    } else if (mode === 'step_by_step') {
      fallbackReply = `**Step-by-Step Breakdown (${className} ${subject}):**\n\n**Objective:** ${learningObjective}\n\n**Step 1 — Core Principle:**\n${lessonSummary}\n\n**Step 2 — Worked Model:**\n${workedExample}\n\n**Step 3 — Applying to your question ("${sanitizedQuestion}"):**\nIdentify the known quantities, substitute them into the governing rule above, and check that your units match.`;
    } else if (mode === 'exam_prep') {
      fallbackReply = `**Examination Prep Clinic (${className} ${subject}):**\n\n**Topic Focus:** ${topicTitle}\n• **Key Examiner Requirement:** Always state your formula or governing definition before substituting values.\n• **Model Worked Example:**\n${workedExample}\n• **Common Misconception Alert:** Do not skip intermediate steps or omit units (such as ₦, m/s, Ω, or J), as method marks (M1) depend on visible working.`;
    } else {
      fallbackReply = `**Practical Skill & Project Guide (${className} ${subject}):**\n\n**Topic:** ${topicTitle}\n1. **Goal:** ${learningObjective}\n2. **Hands-On Activity:** Observe how this principle applies in your school or neighbourhood, record 3 measurements or examples in your exercise book, and compare them against the lesson summary:\n${lessonSummary}`;
    }

    const fallbackPayload = {
      reply: fallbackReply,
      mode,
      source: 'curriculum_grounded_engine',
    };
    setCachedAiResponse(cacheKey, fallbackPayload);
    res.json(fallbackPayload);
  });

  // 2. Complete 12-Week Term Scheme of Work Generator (Teacher / Admin Role Protected)
  app.post('/api/ai/scheme-of-work', aiSecurityMiddleware, async (req: AuthenticatedRequest, res) => {
    const resolvedRole =
      req.effectiveRole ||
      (typeof req.headers['x-orion-role'] === 'string'
        ? req.headers['x-orion-role']
        : typeof req.headers['x-kokolearn-role'] === 'string'
        ? req.headers['x-kokolearn-role']
        : (req.body && req.body.role) || 'teacher');

    const validation = validateTeacherGeneratorRequest(req.body, String(resolvedRole));
    if (!validation.ok) {
      res.status(validation.status).json({ error: validation.error });
      return;
    }

    const { className, subject, term, customFocus } = validation.data;
    const cacheKey = `scheme:${className}:${subject}:${term}:${customFocus}`;
    const cached = getCachedAiResponse<{ rows: unknown[]; source: string }>(cacheKey);
    if (cached) {
      res.json({ ...cached, cached: true });
      return;
    }

    const ai = getGenAIClient();

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: AI_CONFIG.model,
          contents: `Generate a complete 12-week ${term} Scheme of Work for ${className} ${subject} in a Nigerian school.${
            customFocus ? ` Incorporate school emphasis on: ${customFocus}.` : ''
          } Include Weeks 1 to 12 with Week 6 as Mid-Term Continuous Assessment and Weeks 11-12 as Revision and Terminal Examination.`,
          config: {
            systemInstruction:
              'You are a Senior Nigerian Curriculum Planner. Generate a practical, pedagogically sound 12-week scheme of work appropriate for the specified Nigerian class level.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  week: { type: Type.INTEGER },
                  topic: { type: Type.STRING },
                  performanceObjectives: { type: Type.STRING },
                  teacherActivities: { type: Type.STRING },
                  studentActivities: { type: Type.STRING },
                  teachingResources: { type: Type.STRING },
                  evaluationGuide: { type: Type.STRING },
                },
              },
            },
          },
        });

        const parsed = JSON.parse((response.text ?? '[]').trim());
        if (Array.isArray(parsed) && parsed.length > 0) {
          const payload = { rows: parsed, source: 'gemini_live' };
          setCachedAiResponse(cacheKey, payload);
          res.json(payload);
          return;
        }
      } catch {
        console.warn('Gemini scheme-of-work fallback triggered (safe error boundary).');
      }
    }

    // Structured 12-week generator fallback
    const focusNote = customFocus ? ` (${customFocus})` : '';
    const rows = [
      {
        week: 1,
        topic: `Introduction & Foundational Concepts in ${className} ${subject}${focusNote}`,
        performanceObjectives: `Define core terms and demonstrate baseline skills for ${term} ${subject}.`,
        teacherActivities: `Lead diagnostic review of previous term concepts and introduce Week 1 concepts with Nigerian examples.`,
        studentActivities: `Participate in baseline diagnostic exercise and group concept mapping.`,
        teachingResources: `Wall charts, ${subject} demonstration kit, ORION Learn digital library.`,
        evaluationGuide: `Define 3 key terms and solve 2 introductory problems.`,
      },
      {
        week: 2,
        topic: `Core Principles & Representation in ${subject}`,
        performanceObjectives: `Classify and represent fundamental ${subject} relationships accurately.`,
        teacherActivities: `Demonstrate step-by-step worked examples on the board.`,
        studentActivities: `Practice structured exercises in pairs and verify units.`,
        teachingResources: `Flashcards, worked example posters, classroom models.`,
        evaluationGuide: `Complete 4 graded classwork exercises.`,
      },
      {
        week: 3,
        topic: `Quantitative & Analytical Operations in ${subject}`,
        performanceObjectives: `Apply rules and formulas to solve standard ${className} problems.`,
        teacherActivities: `Guide students through multi-step problem solving and error checking.`,
        studentActivities: `Solve worksheet problems and explain reasoning steps.`,
        teachingResources: `Problem-solving rubric, scientific/mathematical instruments.`,
        evaluationGuide: `Solve 3 multi-step problems showing full working.`,
      },
      {
        week: 4,
        topic: `Real-World Nigerian Applications of ${subject}`,
        performanceObjectives: `Connect ${subject} concepts to Nigerian industry, agriculture, commerce, or daily life.`,
        teacherActivities: `Present local case studies and facilitate practical demonstration.`,
        studentActivities: `Analyze a local community or market scenario using ${subject} principles.`,
        teachingResources: `Local case study cards, Nigerian statistical/environmental samples.`,
        evaluationGuide: `Write a short application summary with 2 worked calculations.`,
      },
      {
        week: 5,
        topic: `Practical Investigation & Skill Consolidation`,
        performanceObjectives: `Conduct a guided practical activity or simulation and record observations.`,
        teacherActivities: `Supervise practical/simulation session and guide data tabulation.`,
        studentActivities: `Record observations, plot or tabulate results, and draw conclusions.`,
        teachingResources: `Virtual Discovery Lab simulation, observation logbook.`,
        evaluationGuide: `Submit completed practical observation table.`,
      },
      {
        week: 6,
        topic: `Mid-Term Continuous Assessment (CA 1) & Diagnostic Remediation`,
        performanceObjectives: `Demonstrate mastery of Weeks 1–5 learning objectives and correct misconceptions.`,
        teacherActivities: `Administer Mid-Term CA test, mark scripts, and conduct remedial clinic.`,
        studentActivities: `Complete Mid-Term test and work through corrections.`,
        teachingResources: `CA question paper and marking scheme.`,
        evaluationGuide: `Achieve >= 70% mastery on Weeks 1–5 topics.`,
      },
      {
        week: 7,
        topic: `Intermediate Concepts & Structured Problem Solving in ${subject}`,
        performanceObjectives: `Solve intermediate ${className} ${subject} problems involving multiple variables.`,
        teacherActivities: `Introduce intermediate methodology with scaffolded hints.`,
        studentActivities: `Work through graded exercises from simple to complex.`,
        teachingResources: `Scaffolded task cards, ORION AI Tutor.`,
        evaluationGuide: `Complete 5 intermediate exercises accurately.`,
      },
      {
        week: 8,
        topic: `Comparative Analysis & Critical Thinking in ${subject}`,
        performanceObjectives: `Compare methods, identify patterns, and evaluate valid vs invalid solutions.`,
        teacherActivities: `Present common student misconceptions and facilitate peer critique.`,
        studentActivities: `Spot and correct deliberate errors in sample worked solutions.`,
        teachingResources: `Error-analysis worksheet, comparison chart.`,
        evaluationGuide: `Identify and correct 3 misconception scenarios.`,
      },
      {
        week: 9,
        topic: `Extended Applications & Project Work (${subject})`,
        performanceObjectives: `Design and execute a mini-project demonstrating practical mastery.`,
        teacherActivities: `Assign group/individual project milestones and rubric criteria.`,
        studentActivities: `Build or document project prototype using locally available materials.`,
        teachingResources: `Locally sourced materials, project assessment rubric.`,
        evaluationGuide: `Present project milestone and explain underlying principle.`,
      },
      {
        week: 10,
        topic: `Synthesis & Past Examination Question Clinic`,
        performanceObjectives: `Solve standard examination questions under timed conditions.`,
        teacherActivities: `Model examination marking scheme expectations and time allocation.`,
        studentActivities: `Practice past Common Entrance / BECE / WASSCE style questions.`,
        teachingResources: `Past question compilation and model marking guides.`,
        evaluationGuide: `Score >= 75% on timed practice section.`,
      },
      {
        week: 11,
        topic: `Full-Term Comprehensive Revision & Skill-Gap Clinic`,
        performanceObjectives: `Consolidate all ${term} topics and resolve remaining skill gaps.`,
        teacherActivities: `Review high-priority skill gaps flagged by student mastery analytics.`,
        studentActivities: `Participate in peer-tutoring and targeted revision drills.`,
        teachingResources: `Term revision summary sheet, mastery diagnostic dashboard.`,
        evaluationGuide: `Completion of full-term revision checklist.`,
      },
      {
        week: 12,
        topic: `${term} Terminal Examination, Marking & Result Recording`,
        performanceObjectives: `Evaluate overall terminal achievement across all ${term} objectives.`,
        teacherActivities: `Conduct terminal examination, grade scripts, and record mastery outcomes.`,
        studentActivities: `Sit for ${term} examination.`,
        teachingResources: `Terminal examination papers and official grade sheet.`,
        evaluationGuide: `Terminal Examination Grading (A1–F9).`,
      },
    ];

    const fallbackPayload = { rows, source: 'curriculum_grounded_engine' };
    setCachedAiResponse(cacheKey, fallbackPayload);
    res.json(fallbackPayload);
  });

  // 3. Comprehensive Lesson Note Generator (Teacher / Admin Role Protected)
  app.post('/api/ai/lesson-note', aiSecurityMiddleware, async (req: AuthenticatedRequest, res) => {
    const resolvedRole =
      req.effectiveRole ||
      (typeof req.headers['x-orion-role'] === 'string'
        ? req.headers['x-orion-role']
        : typeof req.headers['x-kokolearn-role'] === 'string'
        ? req.headers['x-kokolearn-role']
        : (req.body && req.body.role) || 'teacher');

    const validation = validateTeacherGeneratorRequest(req.body, String(resolvedRole));
    if (!validation.ok) {
      res.status(validation.status).json({ error: validation.error });
      return;
    }

    const {
      className,
      subject,
      term,
      weekNumber,
      topicTitle,
      learningObjective,
      durationMinutes,
    } = validation.data;

    const cacheKey = `note:${className}:${subject}:${term}:${weekNumber}:${topicTitle}:${durationMinutes}`;
    const cached = getCachedAiResponse<{ content: string; source: string }>(cacheKey);
    if (cached) {
      res.json({ ...cached, cached: true });
      return;
    }

    const ai = getGenAIClient();

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: AI_CONFIG.model,
          contents: `Write a comprehensive, classroom-ready Nigerian Teacher's Lesson Note for:
Class: ${className}
Subject: ${subject}
Term: ${term} | Week: ${weekNumber} | Duration: ${durationMinutes} Minutes
Topic: ${topicTitle}
Learning Objective: ${learningObjective}

Include:
1. Heading Metadata (Class, Subject, Term, Week, Duration, Topic)
2. Behavioural Objectives (measurable)
3. Entry Behaviour / Previous Knowledge
4. Instructional Materials (locally accessible in Nigeria)
5. Detailed Lesson Presentation (Step I Introduction, Step II Concept Development, Step III Worked Examples with Nigerian context, Step IV Guided Student Practice)
6. Chalkboard / Whiteboard Summary
7. Evaluation Questions (with answers)
8. Take-Home Assignment`,
          config: {
            systemInstruction:
              'You are an experienced Nigerian Master Teacher and Head of Department. Produce a thorough, structured lesson note following Nigerian Ministry of Education / NERDC pedagogical standards.',
          },
        });

        const text = response.text || '';
        if (text.trim().length > 0) {
          const payload = { content: text, source: 'gemini_live' };
          setCachedAiResponse(cacheKey, payload);
          res.json(payload);
          return;
        }
      } catch {
        console.warn('Gemini lesson-note fallback triggered (safe error boundary).');
      }
    }

    const fallbackNote = `CLASS: ${className}
SUBJECT: ${subject}
TERM: ${term} | WEEK: ${weekNumber} | DURATION: ${durationMinutes} Minutes
TOPIC: ${topicTitle}

1. BEHAVIOURAL OBJECTIVES
By the end of the lesson, students should be able to:
(a) Define and explain the core concepts of "${topicTitle}" in their own words.
(b) ${learningObjective}
(c) Apply the principle to solve at least three real-world Nigerian problems accurately.

2. PREVIOUS KNOWLEDGE (ENTRY BEHAVIOUR)
Students have completed the preceding week's foundational exercises in ${className} ${subject} and can relate the topic to everyday household and community experiences.

3. INSTRUCTIONAL MATERIALS
• Chart showing step-by-step illustrations of ${topicTitle}
• Locally sourced demonstration counters / measuring tools
• ORION Learn Digital Library & ORION Labs Virtual Science Laboratory

4. LESSON PRESENTATION
• STEP I — Introduction (5 mins):
  Teacher asks 2 oral questions linking students' prior knowledge to ${topicTitle} using a familiar Nigerian market or school scenario.
• STEP II — Concept Development (12 mins):
  Teacher explains the governing rules and key definitions clearly on the board, highlighting common mistakes to avoid.
• STEP III — Guided Worked Examples (13 mins):
  Teacher works through two graded examples step-by-step on the board, inviting students to supply intermediate steps and check units.
• STEP IV — Student Classwork & Supervision (7 mins):
  Students solve two practice problems in their exercise books while the teacher circulates to inspect working and support learners needing extra help.

5. EVALUATION QUESTIONS
1. State the main rule or principle governing ${topicTitle}.
2. Solve the classwork problem on the board and show every step clearly.
3. Explain one practical application of ${topicTitle} in Nigeria.

6. CONCLUSION & ASSIGNMENT (3 mins)
Teacher reviews the board summary, marks sample notebooks, and assigns 3 practice questions for homework.`;

    const fallbackPayload = { content: fallbackNote, source: 'curriculum_grounded_engine' };
    setCachedAiResponse(cacheKey, fallbackPayload);
    res.json(fallbackPayload);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ORION server running on http://localhost:${PORT}`);
  });
}

startServer();
