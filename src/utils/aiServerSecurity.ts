const ALLOWED_NIGERIAN_CLASSES = new Set([
  'Primary 1',
  'Primary 2',
  'Primary 3',
  'Primary 4',
  'Primary 5',
  'Primary 6',
  'JSS 1',
  'JSS 2',
  'JSS 3',
  'SSS 1',
  'SSS 2',
  'SSS 3',
]);

const ALLOWED_TERMS = new Set(['First Term', 'Second Term', 'Third Term']);

const ALLOWED_TUTOR_MODES = new Set([
  'hint_first',
  'step_by_step',
  'exam_prep',
  'project_guidance',
]);

export const AI_CONFIG = {
  model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  requireStrictAuth: process.env.REQUIRE_STRICT_FIREBASE_AUTH !== 'false',
  bootstrapAdminEmails: (process.env.PLATFORM_ADMIN_BOOTSTRAP_EMAILS || 'ahow0166@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  maxQuestionChars: 1000,
  maxTopicChars: 200,
  maxContextChars: 2000,
  maxCustomFocusChars: 300,
  rateLimitWindowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60_000,
  rateLimitMaxRequests: Number(process.env.AI_RATE_LIMIT_MAX) || 15,
  cacheTtlMs: Number(process.env.AI_CACHE_TTL_MS) || 600_000,
  maxCacheEntries: 150,
};

/**
 * Redacts student PII (emails, Nigerian phone numbers, 11-digit NIN/BVN sequences)
 * before any prompt is sent to Gemini or written to logs.
 */
export function redactStudentPII(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    // Email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    // Nigerian phone numbers (+234... or 070/080/081/090/091...)
    .replace(/(?:\+234|234|0)(?:70|80|81|90|91)\d{8}\b/g, '[REDACTED_PHONE]')
    // 11-digit NIN/BVN style identifiers
    .replace(/\b\d{11}\b/g, '[REDACTED_ID]');
}

export interface ValidatedTutorInput {
  className: string;
  subject: string;
  topicTitle: string;
  learningObjective: string;
  lessonSummary: string;
  workedExample: string;
  mode: 'hint_first' | 'step_by_step' | 'exam_prep' | 'project_guidance';
  sanitizedQuestion: string;
}

export function validateTutorRequest(
  body: unknown
): { ok: true; data: ValidatedTutorInput } | { ok: false; status: number; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Request body must be a valid JSON object.' };
  }
  const raw = body as Record<string, unknown>;
  const studentQuestion =
    typeof raw.studentQuestion === 'string' ? raw.studentQuestion.trim() : '';

  if (studentQuestion.length < 2) {
    return {
      ok: false,
      status: 400,
      error: 'Please provide a question or problem attempt (at least 2 characters).',
    };
  }
  if (studentQuestion.length > AI_CONFIG.maxQuestionChars) {
    return {
      ok: false,
      status: 400,
      error: `Question exceeds maximum allowed length of ${AI_CONFIG.maxQuestionChars} characters.`,
    };
  }

  const className = typeof raw.className === 'string' ? raw.className.trim() : 'JSS 2';
  if (!ALLOWED_NIGERIAN_CLASSES.has(className)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid Nigerian class level: ${className}.`,
    };
  }

  const modeRaw = typeof raw.mode === 'string' ? raw.mode.trim() : 'hint_first';
  if (!ALLOWED_TUTOR_MODES.has(modeRaw)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid AI tutor mode: ${modeRaw}.`,
    };
  }

  const subject =
    typeof raw.subject === 'string' && raw.subject.trim().length > 0
      ? raw.subject.trim().slice(0, 100)
      : 'Mathematics';
  const topicTitle =
    typeof raw.topicTitle === 'string' && raw.topicTitle.trim().length > 0
      ? raw.topicTitle.trim().slice(0, AI_CONFIG.maxTopicChars)
      : 'Core Topic';
  const learningObjective =
    typeof raw.learningObjective === 'string'
      ? raw.learningObjective.trim().slice(0, 600)
      : '';
  const lessonSummary =
    typeof raw.lessonSummary === 'string'
      ? raw.lessonSummary.trim().slice(0, AI_CONFIG.maxContextChars)
      : '';
  const workedExample =
    typeof raw.workedExample === 'string'
      ? raw.workedExample.trim().slice(0, 1000)
      : '';

  return {
    ok: true,
    data: {
      className,
      subject,
      topicTitle,
      learningObjective,
      lessonSummary,
      workedExample,
      mode: modeRaw as ValidatedTutorInput['mode'],
      sanitizedQuestion: redactStudentPII(studentQuestion),
    },
  };
}

export interface ValidatedTeacherGeneratorInput {
  className: string;
  subject: string;
  term: string;
  weekNumber: number;
  topicTitle: string;
  learningObjective: string;
  durationMinutes: number;
  customFocus: string;
}

export function validateTeacherGeneratorRequest(
  body: unknown,
  requesterRole?: string
):
  | { ok: true; data: ValidatedTeacherGeneratorInput }
  | { ok: false; status: number; error: string } {
  const allowedStaffRoles = new Set(['teacher', 'school_admin', 'platform_admin']);
  if (!requesterRole || !allowedStaffRoles.has(requesterRole)) {
    return {
      ok: false,
      status: 403,
      error: 'Forbidden: Only authorized teachers or administrators may invoke teaching material generators.',
    };
  }

  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Request body must be a valid JSON object.' };
  }

  const raw = body as Record<string, unknown>;
  const className = typeof raw.className === 'string' ? raw.className.trim() : 'JSS 2';
  if (!ALLOWED_NIGERIAN_CLASSES.has(className)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid Nigerian class level: ${className}.`,
    };
  }

  const term = typeof raw.term === 'string' ? raw.term.trim() : 'First Term';
  if (!ALLOWED_TERMS.has(term)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid academic term: ${term}.`,
    };
  }

  const subject =
    typeof raw.subject === 'string' && raw.subject.trim().length >= 2
      ? raw.subject.trim().slice(0, 100)
      : 'Mathematics';

  const weekNumber =
    typeof raw.weekNumber === 'number' && Number.isInteger(raw.weekNumber)
      ? raw.weekNumber
      : 1;
  if (weekNumber < 1 || weekNumber > 14) {
    return {
      ok: false,
      status: 400,
      error: 'weekNumber must be an integer between 1 and 14.',
    };
  }

  const durationMinutes =
    typeof raw.durationMinutes === 'number' && Number.isInteger(raw.durationMinutes)
      ? raw.durationMinutes
      : 40;
  if (durationMinutes < 5 || durationMinutes > 240) {
    return {
      ok: false,
      status: 400,
      error: 'durationMinutes must be between 5 and 240 minutes.',
    };
  }

  const topicTitle =
    typeof raw.topicTitle === 'string' && raw.topicTitle.trim().length > 0
      ? redactStudentPII(raw.topicTitle.trim().slice(0, AI_CONFIG.maxTopicChars))
      : 'Core Curriculum Topic';

  const learningObjective =
    typeof raw.learningObjective === 'string'
      ? redactStudentPII(raw.learningObjective.trim().slice(0, 600))
      : 'Master the core curriculum objective.';

  const customFocus =
    typeof raw.customFocus === 'string'
      ? redactStudentPII(raw.customFocus.trim().slice(0, AI_CONFIG.maxCustomFocusChars))
      : '';

  return {
    ok: true,
    data: {
      className,
      subject,
      term,
      weekNumber,
      topicTitle,
      learningObjective,
      durationMinutes,
      customFocus,
    },
  };
}

// Sliding-Window Rate Limiter
const rateLimitBuckets = new Map<string, number[]>();

export function checkAiRateLimit(
  clientKey: string,
  nowMs: number = Date.now(),
  maxRequests: number = AI_CONFIG.rateLimitMaxRequests,
  windowMs: number = AI_CONFIG.rateLimitWindowMs
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const key = clientKey || 'anonymous_client';
  const existing = rateLimitBuckets.get(key) || [];
  const validTimestamps = existing.filter((ts) => nowMs - ts < windowMs);

  if (validTimestamps.length >= maxRequests) {
    const oldest = validTimestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (nowMs - oldest)) / 1000));
    rateLimitBuckets.set(key, validTimestamps);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  validTimestamps.push(nowMs);
  rateLimitBuckets.set(key, validTimestamps);
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - validTimestamps.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitBuckets(): void {
  rateLimitBuckets.clear();
}

// Bounded TTL Response Cache to prevent duplicate Gemini charges
interface CacheEntry {
  value: unknown;
  expiresAt: number;
}
const aiResponseCache = new Map<string, CacheEntry>();

export function getCachedAiResponse<T>(cacheKey: string, nowMs: number = Date.now()): T | null {
  const entry = aiResponseCache.get(cacheKey);
  if (!entry) return null;
  if (nowMs > entry.expiresAt) {
    aiResponseCache.delete(cacheKey);
    return null;
  }
  return entry.value as T;
}

export function setCachedAiResponse(
  cacheKey: string,
  value: unknown,
  nowMs: number = Date.now(),
  ttlMs: number = AI_CONFIG.cacheTtlMs
): void {
  if (aiResponseCache.size >= AI_CONFIG.maxCacheEntries) {
    const firstKey = aiResponseCache.keys().next().value;
    if (firstKey) aiResponseCache.delete(firstKey);
  }
  aiResponseCache.set(cacheKey, {
    value,
    expiresAt: nowMs + ttlMs,
  });
}

// Server-side Firebase ID Token Verification against Google Identity Toolkit
export async function verifyFirebaseBearerToken(
  authHeader: string | undefined,
  firebaseApiKey: string
): Promise<{
  verified: boolean;
  uid?: string;
  email?: string;
  emailVerified?: boolean;
  idToken?: string;
  customClaims?: Record<string, unknown>;
  error?: string;
}> {
  if (!authHeader) {
    return {
      verified: false,
      error:
        'Missing Authorization header. Valid Firebase Authentication ID token is required.',
    };
  }
  if (!authHeader.startsWith('Bearer ')) {
    return { verified: false, error: 'Malformed Authorization header; expected Bearer token' };
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (idToken.length < 20 || idToken.length > 4096) {
    return { verified: false, error: 'Invalid Bearer token length' };
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
        firebaseApiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!res.ok) {
      return { verified: false, error: 'Invalid or expired Firebase ID token' };
    }
    const data = (await res.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        emailVerified?: boolean;
        customAttributes?: string;
      }>;
    };
    const user = data.users && data.users[0];
    if (!user || !user.localId) {
      return { verified: false, error: 'Token lookup returned no matching user' };
    }
    if (!user.emailVerified) {
      return {
        verified: false,
        error: 'Verified email address is required for ORION authentication.',
      };
    }

    let customClaims: Record<string, unknown> = {};
    if (typeof user.customAttributes === 'string' && user.customAttributes.trim()) {
      try {
        customClaims = JSON.parse(user.customAttributes) as Record<string, unknown>;
      } catch {
        customClaims = {};
      }
    }

    return {
      verified: true,
      uid: user.localId,
      email: user.email,
      emailVerified: Boolean(user.emailVerified),
      idToken,
      customClaims,
    };
  } catch {
    return { verified: false, error: 'Identity Toolkit verification failed' };
  }
}

/**
 * Determines whether a verified caller is authorized to provision or manage platform administrators.
 * Ordinary users, students, independent learners, teachers, and school administrators cannot become or grant platform_admin.
 */
export function isAuthorizedPlatformAdminCaller(input: {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  customClaims?: Record<string, unknown>;
  hasActiveAdminDoc?: boolean;
  userProfileRole?: string;
  schoolMembershipRole?: string;
}): boolean {
  if (!input.uid || !input.emailVerified) return false;
  // Note: userProfileRole and schoolMembershipRole are intentionally IGNORED here
  // so that editing /users/{uid} or owning a school can NEVER grant platform_admin authority.
  if (input.customClaims && input.customClaims.platformAdmin === true) {
    return true;
  }
  if (input.hasActiveAdminDoc === true) {
    return true;
  }
  if (
    typeof input.email === 'string' &&
    AI_CONFIG.bootstrapAdminEmails.includes(input.email.toLowerCase())
  ) {
    return true;
  }
  return false;
}

/**
 * Resolves the authoritative role for a verified Firebase user by querying live Cloud Firestore
 * with the user's verified ID token, preventing client header role spoofing.
 */
export async function resolveServerVerifiedRole(input: {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  idToken: string;
  customClaims?: Record<string, unknown>;
  projectId: string;
  databaseId: string;
  requestedRole?: string;
}): Promise<{
  effectiveRole: 'student' | 'independent_learner' | 'teacher' | 'school_admin' | 'platform_admin';
  isPlatformAdmin: boolean;
}> {
  let hasActiveAdminDoc = false;
  let firestoreUserRole: string | undefined;

  const baseDocUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    input.projectId
  )}/databases/${encodeURIComponent(input.databaseId)}/documents`;

  try {
    const [adminRes, userRes] = await Promise.all([
      fetch(`${baseDocUrl}/admins/${encodeURIComponent(input.uid)}`, {
        headers: { Authorization: `Bearer ${input.idToken}` },
        signal: AbortSignal.timeout(3000),
      }),
      fetch(`${baseDocUrl}/users/${encodeURIComponent(input.uid)}`, {
        headers: { Authorization: `Bearer ${input.idToken}` },
        signal: AbortSignal.timeout(3000),
      }),
    ]);

    if (adminRes.ok) {
      const adminDoc = (await adminRes.json()) as {
        fields?: {
          status?: { stringValue?: string };
          role?: { stringValue?: string };
        };
      };
      if (
        adminDoc.fields?.status?.stringValue === 'active' &&
        adminDoc.fields?.role?.stringValue === 'platform_admin'
      ) {
        hasActiveAdminDoc = true;
      }
    }

    if (userRes.ok) {
      const userDoc = (await userRes.json()) as {
        fields?: {
          role?: { stringValue?: string };
        };
      };
      firestoreUserRole = userDoc.fields?.role?.stringValue;
    }
  } catch {
    // Fallback to non-privileged learner role if Firestore lookup times out
  }

  const isPlatformAdmin = isAuthorizedPlatformAdminCaller({
    uid: input.uid,
    email: input.email,
    emailVerified: input.emailVerified,
    customClaims: input.customClaims,
    hasActiveAdminDoc,
    userProfileRole: firestoreUserRole,
  });

  if (isPlatformAdmin) {
    const allowedRoles = new Set([
      'student',
      'independent_learner',
      'teacher',
      'school_admin',
      'platform_admin',
    ]);
    const chosen =
      input.requestedRole && allowedRoles.has(input.requestedRole)
        ? (input.requestedRole as
            | 'student'
            | 'independent_learner'
            | 'teacher'
            | 'school_admin'
            | 'platform_admin')
        : 'platform_admin';
    return { effectiveRole: chosen, isPlatformAdmin: true };
  }

  // Non-platform-admin users: Never trust a privileged role from client headers unless backed by Firestore /users/{uid}
  if (
    firestoreUserRole === 'teacher' ||
    firestoreUserRole === 'school_admin' ||
    firestoreUserRole === 'independent_learner' ||
    firestoreUserRole === 'student'
  ) {
    // A user with a student/independent_learner profile can switch between student and independent_learner,
    // but can NEVER escalate to teacher or school_admin via headers.
    if (firestoreUserRole === 'student' || firestoreUserRole === 'independent_learner') {
      return {
        effectiveRole:
          input.requestedRole === 'independent_learner' ? 'independent_learner' : 'student',
        isPlatformAdmin: false,
      };
    }
    return {
      effectiveRole: firestoreUserRole,
      isPlatformAdmin: false,
    };
  }

  // Default for newly authenticated users without a persisted staff profile: strictly learner roles only
  return {
    effectiveRole:
      input.requestedRole === 'independent_learner' ? 'independent_learner' : 'student',
    isPlatformAdmin: false,
  };
}

