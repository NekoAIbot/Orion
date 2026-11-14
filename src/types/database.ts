/**
 * Scalable 27-Entity Data Model for ORION — AI-Powered Learning Ecosystem for Nigeria and Beyond
 * Supports Primary 1–6, Junior Secondary School 1–3 (JSS1–3), and Senior Secondary School 1–3 (SSS1–3).
 *
 * Curriculum Hierarchy:
 * Country → Curriculum → Education Level → Class → Subject → Term → Topic → Learning Objective → Lesson → Assessment → Skill
 */

export type EducationLevelType = 'Primary' | 'JSS' | 'SSS';

export type NigerianClassName =
  | 'Primary 1'
  | 'Primary 2'
  | 'Primary 3'
  | 'Primary 4'
  | 'Primary 5'
  | 'Primary 6'
  | 'JSS 1'
  | 'JSS 2'
  | 'JSS 3'
  | 'SSS 1'
  | 'SSS 2'
  | 'SSS 3';

export type NigerianTerm = 'First Term' | 'Second Term' | 'Third Term';

export type UserRole =
  | 'student'
  | 'teacher'
  | 'school_admin'
  | 'independent_learner'
  | 'platform_admin';

export type CurriculumApprovalStatus =
  | 'sample_unverified'
  | 'draft'
  | 'pending_review'
  | 'approved';

// 1. Users
export interface UserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  schoolId?: string;
  educationLevel: EducationLevelType;
  selectedClass: NigerianClassName;
  learningInterests?: string[];
  createdAt: string;
  updatedAt: string;
}

// 2. Roles and Permissions
export interface RolePermissionRecord {
  roleId: UserRole;
  title: string;
  description: string;
  permissions: string[];
  createdAt: string;
}

// 3. Schools
export interface SchoolRecord {
  schoolId: string;
  name: string;
  state: string;
  lga: string;
  curriculumMode: 'built_in' | 'custom' | 'hybrid';
  activeSession: string;
  activeTerm: NigerianTerm;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// 4. School Memberships
export interface SchoolMembershipRecord {
  membershipId: string; // deterministic: `${schoolId}_${userId}`
  schoolId: string;
  userId: string;
  role: UserRole;
  status: 'active' | 'invited' | 'suspended';
  authorizedBy: string;
  joinedAt: string;
  updatedAt?: string;
}

// 5. Students
export interface StudentProfileRecord {
  studentId: string;
  userId: string;
  schoolId: string; // 'independent' or schoolId
  isIndependentLearner: boolean;
  educationLevel: EducationLevelType;
  currentClass: NigerianClassName;
  enrolledSubjects: string[];
  learningInterests: string[];
  createdAt: string;
  updatedAt?: string;
}

// 6. Teachers
export interface TeacherProfileRecord {
  teacherId: string;
  userId: string;
  schoolId: string;
  assignedClasses: NigerianClassName[];
  assignedSubjects: string[];
  qualification: string;
  createdAt: string;
  updatedAt?: string;
}

// 7. Classes
export interface ClassArmRecord {
  classId: string;
  schoolId: string;
  educationLevel: EducationLevelType;
  className: NigerianClassName;
  armLabel: string; // e.g., "JSS 2 Gold"
  classTeacherId: string;
  studentCount: number;
  createdAt?: string;
  updatedAt?: string;
}

// 8. Academic Sessions
export interface AcademicSessionRecord {
  sessionId: string;
  schoolId: string;
  name: string; // e.g., "2026/2027 Academic Session"
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 9. Terms
export interface TermRecord {
  termId: string;
  sessionId: string;
  schoolId: string;
  name: NigerianTerm;
  weeksCount: number;
  isCurrent: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 10. Curricula
export interface CurriculumRecord {
  curriculumId: string;
  name: string;
  country: string; // "Nigeria"
  source: string; // e.g., "NERDC-Aligned Demonstration Structure" or School Name
  version: string; // e.g., "v2026.1-demo"
  academicPeriod: string; // e.g., "2026/2027"
  educationLevel: EducationLevelType;
  className: NigerianClassName;
  schoolId: string; // "platform_nigeria" for built-in, or schoolId for school custom
  isPlatformWide: boolean;
  approvalStatus: CurriculumApprovalStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// 11. Curriculum Versions
export interface CurriculumVersionRecord {
  versionId: string;
  curriculumId: string;
  schoolId: string;
  isPlatformWide: boolean;
  versionNumber: string;
  changelog: string;
  comparedAgainstCurriculumId?: string;
  approvalStatus: CurriculumApprovalStatus;
  createdBy: string;
  createdAt: string;
}

// 12. Subjects
export interface SubjectRecord {
  subjectId: string;
  curriculumId: string;
  schoolId: string;
  isPlatformWide: boolean;
  educationLevel: EducationLevelType;
  className: NigerianClassName;
  name: string;
  category: 'Core' | 'Science' | 'Humanities' | 'Business & Vocational' | 'School Custom';
  isCompulsory: boolean;
  ownerId?: string;
  createdAt?: string;
}

// 13. Topics (incorporating full 11-tier hierarchy metadata for fast traversal)
export interface TopicRecord {
  topicId: string;
  curriculumId: string;
  country: string;
  curriculumName: string;
  curriculumVersion: string;
  educationLevel: EducationLevelType;
  className: NigerianClassName;
  subject: string;
  term: NigerianTerm;
  weekNumber: number;
  title: string;
  learningObjective: string;
  lessonSummary: string;
  workedExample: string;
  nigerianContextApplication: string;
  assessmentPrompt: string;
  assessmentOptions: string[];
  correctOptionIndex: number;
  explanationHint: string;
  skillTag: string;
  schoolId: string;
  isPlatformWide: boolean;
  approvalStatus: CurriculumApprovalStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// 14. Learning Objectives
export interface LearningObjectiveRecord {
  objectiveId: string;
  topicId: string;
  schoolId: string;
  isPlatformWide: boolean;
  description: string;
  bloomTaxonomyLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
  measurableCriteria: string;
  ownerId: string;
  createdAt: string;
}

// 15. Lessons
export interface LessonRecord {
  lessonId: string;
  topicId: string;
  schoolId: string;
  isPlatformWide: boolean;
  title: string;
  durationMinutes: number;
  bodyMarkdown: string;
  workedExamples: string[];
  keyFormulas: string[];
  offlineAvailable: boolean;
  approvalStatus: 'draft' | 'pending_approval' | 'approved_published';
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
}

// 16. Learning Resources
export interface LearningResourceRecord {
  resourceId: string;
  topicId: string;
  schoolId: string;
  isPlatformWide: boolean;
  title: string;
  resourceType: 'digital_textbook_chapter' | 'interactive_diagram' | 'simulation_link' | 'practice_worksheet';
  summary: string;
  estimatedReadMinutes: number;
  ownerId: string;
  createdAt?: string;
}

// 17. Assignments
export interface AssignmentRecord {
  assignmentId: string;
  schoolId: string;
  classId: string;
  className: NigerianClassName;
  subject: string;
  topicId: string;
  title: string;
  instructions: string;
  dueDate: string;
  maxScore: number;
  createdByTeacherId: string;
  createdAt?: string;
  updatedAt?: string;
}

// 18. Questions
export interface QuestionRecord {
  questionId: string;
  topicId: string;
  schoolId: string;
  isPlatformWide: boolean;
  className: NigerianClassName;
  subject: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  socraticHint: string;
  stepByStepSolution: string;
  skillTag: string;
  examStandard: 'Common Entrance' | 'BECE / JSCE' | 'WAEC / WASSCE' | 'NECO' | 'School Continuous Assessment';
  ownerId?: string;
  createdAt?: string;
}

// 19. Assessments
export interface AssessmentRecord {
  assessmentId: string;
  schoolId: string;
  title: string;
  className: NigerianClassName;
  subject: string;
  term: NigerianTerm;
  assessmentType: 'continuous_assessment' | 'term_examination' | 'diagnostic_quiz';
  questionIds: string[];
  durationMinutes: number;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
}

// 20. Submissions
export interface SubmissionRecord {
  submissionId: string;
  assessmentId: string;
  studentId: string;
  schoolId: string;
  className: NigerianClassName;
  subject: string;
  answers: number[];
  scoreObtained: number;
  maxScore: number;
  submittedAt: string;
}

// 21. Results
export interface ResultRecord {
  resultId: string;
  submissionId: string;
  studentId: string;
  schoolId: string;
  className: NigerianClassName;
  subject: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: 'A1' | 'B2' | 'B3' | 'C4' | 'C5' | 'C6' | 'D7' | 'E8' | 'F9';
  teacherRemark: string;
  recordedBy: string;
  recordedAt: string;
}

// 22. Student Skill Mastery
export interface StudentSkillMasteryRecord {
  masteryId: string;
  studentId: string;
  studentName?: string;
  schoolId?: string;
  className: NigerianClassName;
  subject: string;
  skillTag: string;
  masteryScore: number; // 0 to 100
  attemptsCount: number;
  status: 'needs_remedial' | 'developing' | 'mastered';
  createdAt: string;
  updatedAt: string;
}

// 23. AI Learning Sessions
export interface AILearningSessionRecord {
  sessionId: string;
  studentId: string;
  className: NigerianClassName;
  subject: string;
  topicTitle: string;
  mode: 'hint_first' | 'step_by_step' | 'exam_prep' | 'project_guidance';
  lastPrompt: string;
  lastResponse: string;
  createdAt: string;
  updatedAt: string;
}

// 24. Teacher-Generated Materials (Schemes of Work & Lesson Notes)
export interface SchemeOfWorkWeekRow {
  week: number;
  topic: string;
  performanceObjectives: string;
  teacherActivities: string;
  studentActivities: string;
  teachingResources: string;
  evaluationGuide: string;
}

export interface TeacherMaterialRecord {
  materialId: string;
  materialType: 'scheme_of_work' | 'lesson_note';
  title: string;
  className: NigerianClassName;
  subject: string;
  term: NigerianTerm;
  content: string;
  schemeRows?: SchemeOfWorkWeekRow[];
  approvalStatus: 'draft' | 'pending_approval' | 'approved_published';
  ownerId: string;
  ownerName: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

// 25. Approval Records
export interface ApprovalRecord {
  approvalId: string;
  schoolId: string;
  targetType: 'curriculum' | 'topic' | 'teacher_material';
  targetId: string;
  targetTitle: string;
  submittedBy: string;
  reviewedBy: string;
  status: 'pending' | 'approved' | 'revision_requested';
  reviewerComment: string;
  createdAt?: string;
  updatedAt: string;
}

// 26. Student Projects
export interface StudentProjectRecord {
  projectId: string;
  studentId: string;
  schoolId?: string;
  className: NigerianClassName;
  subject: string;
  title: string;
  practicalSkillFocus: string;
  milestoneSteps: { step: string; completed: boolean }[];
  reflectionNotes: string;
  status: 'in_progress' | 'submitted' | 'evaluated';
  createdAt?: string;
  updatedAt?: string;
}

// 27. Learning Achievements
export interface LearningAchievementRecord {
  achievementId: string;
  studentId: string;
  schoolId?: string;
  title: string;
  criteriaDemonstrated: string;
  skillTag: string;
  earnedAt: string;
}
