import {
  EducationLevelType,
  NigerianClassName,
  NigerianTerm,
  TopicRecord,
  StudentSkillMasteryRecord,
} from '../types/database';
import { EDUCATION_LEVEL_CLASSES } from '../data/nigerianCurriculumData';

/**
 * Resolves the Education Level ('Primary' | 'JSS' | 'SSS') for any Nigerian class name.
 */
export function getEducationLevelForClass(className: NigerianClassName): EducationLevelType {
  if (className.startsWith('Primary')) return 'Primary';
  if (className.startsWith('JSS')) return 'JSS';
  return 'SSS';
}

/**
 * Returns all classes belonging to a given education level.
 */
export function getClassesForLevel(level: EducationLevelType): NigerianClassName[] {
  return EDUCATION_LEVEL_CLASSES[level] || [];
}

/**
 * Merges the platform-wide Nigerian curriculum topics with a school's custom topics
 * according to the school's configured curriculumMode ('built_in' | 'custom' | 'hybrid'),
 * while strictly guaranteeing that platform-wide topics are NEVER mutated or overwritten.
 */
export function mergeSchoolCurriculumOverlay(
  platformTopics: readonly TopicRecord[],
  schoolCustomTopics: readonly TopicRecord[],
  curriculumMode: 'built_in' | 'custom' | 'hybrid',
  schoolId: string
): TopicRecord[] {
  // Deep clone platform topics to guarantee zero mutation of platform-wide curriculum
  const safePlatform = platformTopics
    .filter((t) => t.isPlatformWide)
    .map((t) => ({ ...t, assessmentOptions: [...t.assessmentOptions] }));

  const safeCustom = schoolCustomTopics
    .filter((t) => !t.isPlatformWide && t.schoolId === schoolId)
    .map((t) => ({ ...t, assessmentOptions: [...t.assessmentOptions] }));

  if (curriculumMode === 'built_in') {
    return safePlatform;
  }
  if (curriculumMode === 'custom') {
    return safeCustom;
  }
  // 'hybrid': combine built-in Nigerian curriculum + school custom overlay sorted by weekNumber
  return [...safePlatform, ...safeCustom].sort((a, b) => a.weekNumber - b.weekNumber);
}

/**
 * Filters topics by class, subject, and term.
 * If no exact topic exists for a newly selected class/subject/term combination in the sample bank,
 * synthesizes a clearly labeled Demonstration Structure topic so all 12 classes (Primary 1-6, JSS 1-3, SSS 1-3)
 * and subjects have functional, interactive curriculum nodes.
 */
export function getTopicsForSelection(
  allTopics: readonly TopicRecord[],
  className: NigerianClassName,
  subject?: string,
  term?: NigerianTerm
): TopicRecord[] {
  const filtered = allTopics.filter((t) => {
    const matchClass = t.className === className;
    const matchSubject = !subject || subject === 'All Subjects' || t.subject === subject;
    const matchTerm = !term || t.term === term;
    return matchClass && matchSubject && matchTerm;
  });

  if (filtered.length > 0) {
    return filtered;
  }

  // Provide an honest, clearly labeled sample placeholder node when browsing a class/subject/term
  // not yet populated in the initial sample list
  const level = getEducationLevelForClass(className);
  const resolvedSubject = subject && subject !== 'All Subjects' ? subject : 'Mathematics';
  const resolvedTerm: NigerianTerm = term || 'First Term';

  return [
    {
      topicId: `sample_${className.replace(/\s+/g, '_').toLowerCase()}_${resolvedSubject.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${resolvedTerm.replace(/\s+/g, '_').toLowerCase()}`,
      curriculumId: level === 'Primary' ? 'curr_ng_primary_demo' : level === 'JSS' ? 'curr_ng_jss_demo' : 'curr_ng_sss_demo',
      country: 'Nigeria',
      curriculumName: `Nigerian ${level} Demonstration Structure (Sample)`,
      curriculumVersion: 'v2026.1-sample',
      educationLevel: level,
      className,
      subject: resolvedSubject,
      term: resolvedTerm,
      weekNumber: 1,
      title: `${className} ${resolvedSubject} (${resolvedTerm}) — Foundational Principles & Problem Solving`,
      learningObjective: `Demonstrate core understanding of ${resolvedSubject} concepts for ${className} (${resolvedTerm}) and apply them to practical Nigerian problems.`,
      lessonSummary: `[Demonstration Sample Content] This topic node provides the structured curriculum slot for ${className} ${resolvedSubject} (${resolvedTerm}). Schools and curriculum administrators can import verified NERDC/WAEC syllabus topics or generate detailed lesson notes using the Teacher Workspace.`,
      workedExample: `Step 1: Identify the given values and units in the ${resolvedSubject} problem.\nStep 2: Apply the fundamental ${className} principle.\nStep 3: Verify your answer with a practical check.`,
      nigerianContextApplication: `Applied ${resolvedSubject} problem-solving in Nigerian schools, households, and community enterprises.`,
      assessmentPrompt: `When solving a structured problem in ${className} ${resolvedSubject}, what is the best first step before computing the final answer?`,
      assessmentOptions: [
        'Guess an answer immediately without reading the units',
        'Identify the known quantities, required unknown, and applicable principle',
        'Skip the working steps and write any number',
        'Ignore the units of measurement',
      ],
      correctOptionIndex: 1,
      explanationHint: 'Always list the given data, check that units are consistent, and select the governing relationship.',
      skillTag: `${resolvedSubject} Core Foundations (${className})`,
      schoolId: 'platform_nigeria',
      isPlatformWide: true,
      approvalStatus: 'sample_unverified',
      ownerId: 'system_platform',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ];
}

/**
 * Compares platform-wide curriculum topics against school custom overlay topics
 * for a given class or education level.
 */
export interface CurriculumComparisonSummary {
  platformTopicsCount: number;
  schoolCustomTopicsCount: number;
  unverifiedSampleCount: number;
  approvedVerifiedCount: number;
  addedSubjects: string[];
  addedSkillTags: string[];
}

export function compareCurriculumVersions(
  platformTopics: readonly TopicRecord[],
  schoolTopics: readonly TopicRecord[],
  className?: NigerianClassName
): CurriculumComparisonSummary {
  const pList = className ? platformTopics.filter((t) => t.className === className) : platformTopics;
  const sList = className ? schoolTopics.filter((t) => t.className === className) : schoolTopics;

  const platformSubjects = new Set(pList.map((t) => t.subject));
  const addedSubjects = Array.from(new Set(sList.map((t) => t.subject))).filter(
    (subj) => !platformSubjects.has(subj)
  );

  const addedSkillTags = Array.from(new Set(sList.map((t) => t.skillTag)));

  const combined = [...pList, ...sList];
  const unverifiedSampleCount = combined.filter((t) => t.approvalStatus === 'sample_unverified').length;
  const approvedVerifiedCount = combined.filter((t) => t.approvalStatus === 'approved').length;

  return {
    platformTopicsCount: pList.length,
    schoolCustomTopicsCount: sList.length,
    unverifiedSampleCount,
    approvedVerifiedCount,
    addedSubjects,
    addedSkillTags,
  };
}

/**
 * Calculates updated student skill mastery based on demonstrated understanding,
 * improvement, and practical application (not time spent).
 */
export function calculateUpdatedMastery(
  previousScore: number,
  previousAttempts: number,
  assessmentPercentage: number,
  usedHint: boolean
): { masteryScore: number; attemptsCount: number; status: 'needs_remedial' | 'developing' | 'mastered' } {
  const clampedPrev = Math.max(0, Math.min(100, previousScore));
  const clampedAssessment = Math.max(0, Math.min(100, assessmentPercentage));
  // Reward demonstrated understanding; slight adjustment if hint was required, but still rewards correct reasoning
  const effectiveScore = usedHint ? Math.max(0, clampedAssessment - 5) : clampedAssessment;

  const newScore =
    previousAttempts === 0
      ? Math.round(effectiveScore)
      : Math.round(clampedPrev * 0.4 + effectiveScore * 0.6);

  const boundedScore = Math.max(0, Math.min(100, newScore));
  const status: 'needs_remedial' | 'developing' | 'mastered' =
    boundedScore >= 80 ? 'mastered' : boundedScore >= 65 ? 'developing' : 'needs_remedial';

  return {
    masteryScore: boundedScore,
    attemptsCount: previousAttempts + 1,
    status,
  };
}

/**
 * Identifies skill gaps (< 65% mastery) and recommends targeted remedial topics.
 */
export interface RemedialRecommendation {
  masteryRecord: StudentSkillMasteryRecord;
  recommendedTopic?: TopicRecord;
  priority: 'High' | 'Medium';
  actionPlan: string;
}

export function identifySkillGaps(
  masteryList: readonly StudentSkillMasteryRecord[],
  availableTopics: readonly TopicRecord[]
): RemedialRecommendation[] {
  return masteryList
    .filter((m) => m.masteryScore < 65 || m.status === 'needs_remedial')
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .map((record) => {
      const matchingTopic = availableTopics.find(
        (t) =>
          t.skillTag.toLowerCase() === record.skillTag.toLowerCase() ||
          (t.className === record.className && t.subject === record.subject)
      );
      return {
        masteryRecord: record,
        recommendedTopic: matchingTopic,
        priority: record.masteryScore < 55 ? 'High' : 'Medium',
        actionPlan: `Assign guided Hint-First AI Tutor practice and worked example review on "${record.skillTag}" (${record.className} ${record.subject}).`,
      };
    });
}

/**
 * Pure Scientific Calculators for the Virtual Discovery Lab
 */
export function checkChemicalEquationBalance(
  reactants: { N?: number; H?: number; C?: number; O?: number },
  products: { N?: number; H?: number; C?: number; O?: number }
): { isBalanced: boolean; atomDiffs: Record<string, { left: number; right: number }> } {
  const elements = ['N', 'H', 'C', 'O'] as const;
  const atomDiffs: Record<string, { left: number; right: number }> = {};
  let isBalanced = true;

  for (const el of elements) {
    const left = reactants[el] ?? 0;
    const right = products[el] ?? 0;
    if (left > 0 || right > 0) {
      atomDiffs[el] = { left, right };
      if (left !== right) {
        isBalanced = false;
      }
    }
  }

  return { isBalanced, atomDiffs };
}

export function calculateOhmAndPendulum(
  voltageV: number,
  resistanceOhms: number,
  pendulumLengthM: number,
  gravityMs2 = 9.8
): { currentAmps: number; powerWatts: number; pendulumPeriodSec: number } {
  const safeR = Math.max(0.1, resistanceOhms);
  const safeL = Math.max(0.1, pendulumLengthM);
  const safeG = Math.max(1, gravityMs2);

  const currentAmps = Number((voltageV / safeR).toFixed(2));
  const powerWatts = Number((voltageV * currentAmps).toFixed(2));
  const pendulumPeriodSec = Number((2 * Math.PI * Math.sqrt(safeL / safeG)).toFixed(2));

  return { currentAmps, powerWatts, pendulumPeriodSec };
}
