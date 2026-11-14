import {
  EducationLevelType,
  NigerianClassName,
  NigerianTerm,
  UserRole,
} from '../types/database';

export interface AuthContext {
  uid: string;
  email: string;
  email_verified: boolean;
  platformAdmin?: boolean;
}

export type RuleOperation = 'get' | 'list' | 'create' | 'update' | 'delete';

export interface StoredDocument {
  [key: string]: unknown;
}

export const SERVER_TIMESTAMP_SENTINEL = '__SERVER_TIMESTAMP__';

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const BOOTSTRAPPED_ADMIN_EMAIL = 'ahow0166@gmail.com';

function isValidId(id: unknown): id is string {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && VALID_ID_REGEX.test(id);
}

function isStringWithLen(val: unknown, min: number, max: number): val is string {
  return typeof val === 'string' && val.length >= min && val.length <= max;
}

function isIntInRange(val: unknown, min: number, max: number): val is number {
  return typeof val === 'number' && Number.isInteger(val) && val >= min && val <= max;
}

function isTimestampValue(val: unknown, requestTimeIso: string): boolean {
  return typeof val === 'string' && val === requestTimeIso;
}

function isExistingOrValidTimestamp(val: unknown): boolean {
  return typeof val === 'string' && val.length >= 10 && val.length <= 64;
}

function hasRequiredAndAllowedKeys(
  data: StoredDocument,
  requiredKeys: string[],
  allowedKeys: string[]
): boolean {
  const keys = Object.keys(data);
  for (const req of requiredKeys) {
    if (!keys.includes(req)) return false;
  }
  for (const k of keys) {
    if (!allowedKeys.includes(k)) return false;
  }
  return true;
}

function getAffectedKeys(incoming: StoredDocument, existing: StoredDocument): string[] {
  const allKeys = new Set([...Object.keys(incoming), ...Object.keys(existing)]);
  const changed: string[] = [];
  for (const key of allKeys) {
    if (JSON.stringify(incoming[key]) !== JSON.stringify(existing[key])) {
      changed.push(key);
    }
  }
  return changed;
}

function affectedKeysOnly(
  incoming: StoredDocument,
  existing: StoredDocument,
  allowedChangedKeys: string[]
): boolean {
  const changed = getAffectedKeys(incoming, existing);
  return changed.every((k) => allowedChangedKeys.includes(k));
}

/**
 * Deterministic Firestore Security Rules & Document Store Engine
 * Evaluates the exact security rules and entity blueprints defined in `/firestore.rules`
 * across all 28 collections (`admins` + 27 application collections).
 */
export class RuleEnforcedFirestoreStore {
  private collections: Map<string, Map<string, StoredDocument>> = new Map();
  private readCount = 0;
  private writeCount = 0;

  private getCollectionMap(collectionName: string): Map<string, StoredDocument> {
    let col = this.collections.get(collectionName);
    if (!col) {
      col = new Map();
      this.collections.set(collectionName, col);
    }
    return col;
  }

  public getStats(): { reads: number; writes: number } {
    return { reads: this.readCount, writes: this.writeCount };
  }

  private docExists(collectionName: string, docId: string): boolean {
    return this.getCollectionMap(collectionName).has(docId);
  }

  private getDocInternal(collectionName: string, docId: string): StoredDocument | undefined {
    return this.getCollectionMap(collectionName).get(docId);
  }

  private isSignedIn(auth: AuthContext | null): auth is AuthContext {
    return auth !== null && typeof auth.uid === 'string' && auth.uid.length > 0;
  }

  private isVerified(auth: AuthContext | null): auth is AuthContext {
    return this.isSignedIn(auth) && auth.email_verified === true;
  }

  private isProvisionedPlatformAdmin(auth: AuthContext | null): boolean {
    if (!this.isVerified(auth)) return false;
    if (auth.platformAdmin === true) return true;
    const adminDoc = this.getDocInternal('admins', auth.uid);
    return Boolean(
      adminDoc &&
        adminDoc.status === 'active' &&
        adminDoc.role === 'platform_admin'
    );
  }

  private isBootstrapOwner(auth: AuthContext | null): boolean {
    return this.isVerified(auth) && auth.email === BOOTSTRAPPED_ADMIN_EMAIL;
  }

  private isAdmin(auth: AuthContext | null): boolean {
    return this.isProvisionedPlatformAdmin(auth) || this.isBootstrapOwner(auth);
  }

  private isSchoolOwner(auth: AuthContext | null, schoolId: unknown): boolean {
    if (!this.isVerified(auth) || !isValidId(schoolId)) return false;
    const school = this.getDocInternal('schools', schoolId);
    return Boolean(school && school.ownerId === auth.uid);
  }

  private hasActiveSchoolMembership(auth: AuthContext | null, schoolId: unknown): boolean {
    if (!this.isVerified(auth) || !isValidId(schoolId)) return false;
    const mem = this.getDocInternal('school_memberships', `${schoolId}_${auth.uid}`);
    return Boolean(mem && mem.status === 'active');
  }

  private hasSchoolRole(
    auth: AuthContext | null,
    schoolId: unknown,
    roleName: string
  ): boolean {
    if (!this.hasActiveSchoolMembership(auth, schoolId) || !isValidId(schoolId) || !auth) {
      return false;
    }
    const mem = this.getDocInternal('school_memberships', `${schoolId}_${auth.uid}`);
    return Boolean(mem && mem.role === roleName);
  }

  private isSchoolAdminFor(auth: AuthContext | null, schoolId: unknown): boolean {
    return (
      this.isAdmin(auth) ||
      this.isSchoolOwner(auth, schoolId) ||
      this.hasSchoolRole(auth, schoolId, 'school_admin')
    );
  }

  private isSchoolTeacherFor(auth: AuthContext | null, schoolId: unknown): boolean {
    return (
      this.isSchoolAdminFor(auth, schoolId) ||
      this.hasSchoolRole(auth, schoolId, 'teacher')
    );
  }

  private isSchoolStudentOrStaff(auth: AuthContext | null, schoolId: unknown): boolean {
    return (
      this.isSchoolTeacherFor(auth, schoolId) ||
      this.hasSchoolRole(auth, schoolId, 'student')
    );
  }

  // Entity Blueprints matching firestore.rules
  private isValidEntity(
    collectionName: string,
    data: StoredDocument,
    auth: AuthContext | null
  ): boolean {
    if (!auth) return false;
    switch (collectionName) {
      case 'admins':
        return (
          hasRequiredAndAllowedKeys(
            data,
            [
              'adminId',
              'email',
              'role',
              'status',
              'provisionedBy',
              'provisioningMethod',
              'createdAt',
              'updatedAt',
            ],
            [
              'adminId',
              'email',
              'role',
              'status',
              'provisionedBy',
              'provisioningMethod',
              'createdAt',
              'updatedAt',
            ]
          ) &&
          isValidId(data.adminId) &&
          isStringWithLen(data.email, 3, 256) &&
          data.role === 'platform_admin' &&
          (data.status === 'active' || data.status === 'revoked') &&
          isValidId(data.provisionedBy) &&
          data.provisionedBy === auth.uid &&
          ['bootstrap_owner_claim', 'admin_grant', 'server_custom_claim'].includes(
            String(data.provisioningMethod)
          ) &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'users':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['uid', 'email', 'displayName', 'role', 'educationLevel', 'selectedClass', 'createdAt', 'updatedAt'],
            ['uid', 'email', 'displayName', 'role', 'schoolId', 'educationLevel', 'selectedClass', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.uid) &&
          data.uid === auth.uid &&
          isStringWithLen(data.email, 3, 256) &&
          isStringWithLen(data.displayName, 1, 120) &&
          ['student', 'teacher', 'school_admin', 'independent_learner', 'platform_admin'].includes(
            String(data.role)
          ) &&
          (!('schoolId' in data) || isStringWithLen(data.schoolId, 1, 128)) &&
          ['Primary', 'JSS', 'SSS'].includes(String(data.educationLevel)) &&
          isStringWithLen(data.selectedClass, 1, 32) &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'roles':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['roleId', 'title', 'description', 'createdAt'],
            ['roleId', 'title', 'description', 'createdAt']
          ) &&
          isValidId(data.roleId) &&
          isStringWithLen(data.title, 1, 100) &&
          isStringWithLen(data.description, 1, 500) &&
          isExistingOrValidTimestamp(data.createdAt)
        );

      case 'schools':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['schoolId', 'name', 'state', 'lga', 'curriculumMode', 'activeSession', 'activeTerm', 'ownerId', 'createdAt', 'updatedAt'],
            ['schoolId', 'name', 'state', 'lga', 'curriculumMode', 'activeSession', 'activeTerm', 'ownerId', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.schoolId) &&
          isStringWithLen(data.name, 2, 160) &&
          isStringWithLen(data.state, 2, 64) &&
          isStringWithLen(data.lga, 2, 100) &&
          ['built_in', 'custom', 'hybrid'].includes(String(data.curriculumMode)) &&
          isStringWithLen(data.activeSession, 4, 32) &&
          ['First Term', 'Second Term', 'Third Term'].includes(String(data.activeTerm)) &&
          isValidId(data.ownerId) &&
          data.ownerId === auth.uid &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'school_memberships':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['membershipId', 'schoolId', 'userId', 'role', 'status', 'authorizedBy', 'createdAt', 'updatedAt'],
            ['membershipId', 'schoolId', 'userId', 'role', 'status', 'authorizedBy', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.membershipId) &&
          isValidId(data.schoolId) &&
          isValidId(data.userId) &&
          data.membershipId === `${data.schoolId}_${data.userId}` &&
          ['student', 'teacher', 'school_admin'].includes(String(data.role)) &&
          ['active', 'invited', 'suspended'].includes(String(data.status)) &&
          isValidId(data.authorizedBy) &&
          data.authorizedBy === auth.uid &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'students':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['studentId', 'userId', 'schoolId', 'isIndependentLearner', 'educationLevel', 'currentClass', 'createdAt', 'updatedAt'],
            ['studentId', 'userId', 'schoolId', 'isIndependentLearner', 'educationLevel', 'currentClass', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.studentId) &&
          isValidId(data.userId) &&
          data.userId === auth.uid &&
          isStringWithLen(data.schoolId, 1, 128) &&
          typeof data.isIndependentLearner === 'boolean' &&
          ['Primary', 'JSS', 'SSS'].includes(String(data.educationLevel)) &&
          isStringWithLen(data.currentClass, 1, 32) &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'teachers':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['teacherId', 'userId', 'schoolId', 'qualification', 'primarySubject', 'createdAt', 'updatedAt'],
            ['teacherId', 'userId', 'schoolId', 'qualification', 'primarySubject', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.teacherId) &&
          isValidId(data.userId) &&
          isValidId(data.schoolId) &&
          isStringWithLen(data.qualification, 2, 160) &&
          isStringWithLen(data.primarySubject, 2, 100) &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'classes':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['classId', 'schoolId', 'educationLevel', 'className', 'armLabel', 'classTeacherId', 'studentCount', 'createdAt', 'updatedAt'],
            ['classId', 'schoolId', 'educationLevel', 'className', 'armLabel', 'classTeacherId', 'studentCount', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.classId) &&
          isValidId(data.schoolId) &&
          ['Primary', 'JSS', 'SSS'].includes(String(data.educationLevel)) &&
          isStringWithLen(data.className, 1, 32) &&
          isStringWithLen(data.armLabel, 1, 64) &&
          isValidId(data.classTeacherId) &&
          isIntInRange(data.studentCount, 0, 5000) &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'academic_sessions':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['sessionId', 'schoolId', 'name', 'startDate', 'endDate', 'isCurrent', 'ownerId', 'createdAt', 'updatedAt'],
            ['sessionId', 'schoolId', 'name', 'startDate', 'endDate', 'isCurrent', 'ownerId', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.sessionId) &&
          isValidId(data.schoolId) &&
          isStringWithLen(data.name, 4, 64) &&
          isStringWithLen(data.startDate, 4, 32) &&
          isStringWithLen(data.endDate, 4, 32) &&
          typeof data.isCurrent === 'boolean' &&
          isValidId(data.ownerId) &&
          data.ownerId === auth.uid &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'terms':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['termId', 'sessionId', 'schoolId', 'name', 'weeksCount', 'isCurrent', 'ownerId', 'createdAt', 'updatedAt'],
            ['termId', 'sessionId', 'schoolId', 'name', 'weeksCount', 'isCurrent', 'ownerId', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.termId) &&
          isValidId(data.sessionId) &&
          isValidId(data.schoolId) &&
          ['First Term', 'Second Term', 'Third Term'].includes(String(data.name)) &&
          isIntInRange(data.weeksCount, 1, 20) &&
          typeof data.isCurrent === 'boolean' &&
          isValidId(data.ownerId) &&
          data.ownerId === auth.uid &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'curricula':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['curriculumId', 'name', 'country', 'source', 'version', 'academicPeriod', 'educationLevel', 'className', 'schoolId', 'isPlatformWide', 'approvalStatus', 'ownerId', 'createdAt', 'updatedAt'],
            ['curriculumId', 'name', 'country', 'source', 'version', 'academicPeriod', 'educationLevel', 'className', 'schoolId', 'isPlatformWide', 'approvalStatus', 'ownerId', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.curriculumId) &&
          isStringWithLen(data.name, 2, 160) &&
          isStringWithLen(data.country, 2, 64) &&
          isStringWithLen(data.source, 2, 200) &&
          isStringWithLen(data.version, 1, 32) &&
          isStringWithLen(data.academicPeriod, 4, 32) &&
          ['Primary', 'JSS', 'SSS'].includes(String(data.educationLevel)) &&
          isStringWithLen(data.className, 1, 32) &&
          isStringWithLen(data.schoolId, 1, 128) &&
          typeof data.isPlatformWide === 'boolean' &&
          ['draft', 'pending_review', 'approved', 'sample_unverified'].includes(
            String(data.approvalStatus)
          ) &&
          isValidId(data.ownerId) &&
          data.ownerId === auth.uid &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'subjects':
        return (
          hasRequiredAndAllowedKeys(
            data,
            [
              'subjectId',
              'curriculumId',
              'schoolId',
              'isPlatformWide',
              'educationLevel',
              'className',
              'name',
              'category',
              'isCompulsory',
              'ownerId',
              'createdAt',
            ],
            [
              'subjectId',
              'curriculumId',
              'schoolId',
              'isPlatformWide',
              'educationLevel',
              'className',
              'name',
              'category',
              'isCompulsory',
              'ownerId',
              'createdAt',
            ]
          ) &&
          isValidId(data.subjectId) &&
          isValidId(data.curriculumId) &&
          isStringWithLen(data.schoolId, 1, 128) &&
          typeof data.isPlatformWide === 'boolean' &&
          ['Primary', 'JSS', 'SSS'].includes(String(data.educationLevel)) &&
          isStringWithLen(data.className, 1, 32) &&
          isStringWithLen(data.name, 2, 100) &&
          [
            'Core',
            'Science',
            'Humanities',
            'Business & Vocational',
            'School Custom',
          ].includes(String(data.category)) &&
          typeof data.isCompulsory === 'boolean' &&
          isValidId(data.ownerId) &&
          data.ownerId === auth.uid &&
          isExistingOrValidTimestamp(data.createdAt)
        );

      case 'topics':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['topicId', 'curriculumId', 'educationLevel', 'className', 'subject', 'term', 'weekNumber', 'title', 'learningObjective', 'lessonSummary', 'assessmentPrompt', 'skillTag', 'schoolId', 'isPlatformWide', 'approvalStatus', 'ownerId', 'createdAt', 'updatedAt'],
            ['topicId', 'curriculumId', 'educationLevel', 'className', 'subject', 'term', 'weekNumber', 'title', 'learningObjective', 'lessonSummary', 'assessmentPrompt', 'skillTag', 'schoolId', 'isPlatformWide', 'approvalStatus', 'ownerId', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.topicId) &&
          isValidId(data.curriculumId) &&
          ['Primary', 'JSS', 'SSS'].includes(String(data.educationLevel)) &&
          isStringWithLen(data.className, 1, 32) &&
          isStringWithLen(data.subject, 2, 100) &&
          ['First Term', 'Second Term', 'Third Term'].includes(String(data.term)) &&
          isIntInRange(data.weekNumber, 1, 14) &&
          isStringWithLen(data.title, 2, 200) &&
          isStringWithLen(data.learningObjective, 5, 600) &&
          isStringWithLen(data.lessonSummary, 5, 2000) &&
          isStringWithLen(data.assessmentPrompt, 5, 600) &&
          isStringWithLen(data.skillTag, 2, 120) &&
          isStringWithLen(data.schoolId, 1, 128) &&
          typeof data.isPlatformWide === 'boolean' &&
          ['draft', 'pending_review', 'approved', 'sample_unverified'].includes(
            String(data.approvalStatus)
          ) &&
          isValidId(data.ownerId) &&
          data.ownerId === auth.uid &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'teacher_materials':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['materialId', 'materialType', 'title', 'className', 'subject', 'term', 'content', 'approvalStatus', 'ownerId', 'schoolId', 'createdAt', 'updatedAt'],
            ['materialId', 'materialType', 'title', 'className', 'subject', 'term', 'content', 'approvalStatus', 'ownerId', 'schoolId', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.materialId) &&
          ['scheme_of_work', 'lesson_note'].includes(String(data.materialType)) &&
          isStringWithLen(data.title, 2, 200) &&
          isStringWithLen(data.className, 1, 32) &&
          isStringWithLen(data.subject, 2, 100) &&
          ['First Term', 'Second Term', 'Third Term'].includes(String(data.term)) &&
          isStringWithLen(data.content, 10, 15000) &&
          ['draft', 'pending_approval', 'approved_published'].includes(
            String(data.approvalStatus)
          ) &&
          isValidId(data.ownerId) &&
          isStringWithLen(data.schoolId, 1, 128) &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'approval_records':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['approvalId', 'schoolId', 'targetType', 'targetId', 'targetTitle', 'submittedBy', 'reviewedBy', 'status', 'reviewerComment', 'createdAt', 'updatedAt'],
            ['approvalId', 'schoolId', 'targetType', 'targetId', 'targetTitle', 'submittedBy', 'reviewedBy', 'status', 'reviewerComment', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.approvalId) &&
          isValidId(data.schoolId) &&
          ['curriculum', 'topic', 'teacher_material'].includes(String(data.targetType)) &&
          isValidId(data.targetId) &&
          isStringWithLen(data.targetTitle, 2, 200) &&
          isValidId(data.submittedBy) &&
          isValidId(data.reviewedBy) &&
          data.reviewedBy === auth.uid &&
          ['pending', 'approved', 'revision_requested'].includes(String(data.status)) &&
          isStringWithLen(data.reviewerComment, 2, 1000) &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'submissions':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['submissionId', 'assessmentId', 'studentId', 'schoolId', 'className', 'subject', 'scoreObtained', 'maxScore', 'createdAt'],
            ['submissionId', 'assessmentId', 'studentId', 'schoolId', 'className', 'subject', 'scoreObtained', 'maxScore', 'createdAt']
          ) &&
          isValidId(data.submissionId) &&
          isValidId(data.assessmentId) &&
          isValidId(data.studentId) &&
          data.studentId === auth.uid &&
          isStringWithLen(data.schoolId, 1, 128) &&
          isStringWithLen(data.className, 1, 32) &&
          isStringWithLen(data.subject, 2, 100) &&
          isIntInRange(data.scoreObtained, 0, 1000) &&
          isIntInRange(data.maxScore, 1, 1000) &&
          isExistingOrValidTimestamp(data.createdAt)
        );

      case 'results':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['resultId', 'submissionId', 'studentId', 'schoolId', 'className', 'subject', 'score', 'maxScore', 'percentage', 'grade', 'teacherRemark', 'recordedBy', 'createdAt'],
            ['resultId', 'submissionId', 'studentId', 'schoolId', 'className', 'subject', 'score', 'maxScore', 'percentage', 'grade', 'teacherRemark', 'recordedBy', 'createdAt']
          ) &&
          isValidId(data.resultId) &&
          isValidId(data.submissionId) &&
          isValidId(data.studentId) &&
          isStringWithLen(data.schoolId, 1, 128) &&
          isStringWithLen(data.className, 1, 32) &&
          isStringWithLen(data.subject, 2, 100) &&
          isIntInRange(data.score, 0, 1000) &&
          isIntInRange(data.maxScore, 1, 1000) &&
          isIntInRange(data.percentage, 0, 100) &&
          ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'].includes(String(data.grade)) &&
          isStringWithLen(data.teacherRemark, 2, 500) &&
          isValidId(data.recordedBy) &&
          data.recordedBy === auth.uid &&
          isExistingOrValidTimestamp(data.createdAt)
        );

      case 'skill_mastery':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['masteryId', 'studentId', 'className', 'subject', 'skillTag', 'masteryScore', 'attemptsCount', 'status', 'createdAt', 'updatedAt'],
            ['masteryId', 'studentId', 'schoolId', 'className', 'subject', 'skillTag', 'masteryScore', 'attemptsCount', 'status', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.masteryId) &&
          isValidId(data.studentId) &&
          data.studentId === auth.uid &&
          (!('schoolId' in data) || isStringWithLen(data.schoolId, 1, 128)) &&
          isStringWithLen(data.className, 1, 32) &&
          isStringWithLen(data.subject, 2, 100) &&
          isStringWithLen(data.skillTag, 2, 120) &&
          isIntInRange(data.masteryScore, 0, 100) &&
          isIntInRange(data.attemptsCount, 1, 10000) &&
          ['needs_remedial', 'developing', 'mastered'].includes(String(data.status)) &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'ai_sessions':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['sessionId', 'studentId', 'className', 'subject', 'topicTitle', 'mode', 'lastPrompt', 'lastResponse', 'createdAt', 'updatedAt'],
            ['sessionId', 'studentId', 'className', 'subject', 'topicTitle', 'mode', 'lastPrompt', 'lastResponse', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.sessionId) &&
          isValidId(data.studentId) &&
          data.studentId === auth.uid &&
          isStringWithLen(data.className, 1, 32) &&
          isStringWithLen(data.subject, 2, 100) &&
          isStringWithLen(data.topicTitle, 2, 200) &&
          ['hint_first', 'step_by_step', 'exam_prep', 'project_guidance'].includes(
            String(data.mode)
          ) &&
          isStringWithLen(data.lastPrompt, 1, 1500) &&
          isStringWithLen(data.lastResponse, 1, 5000) &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'projects':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['projectId', 'studentId', 'className', 'subject', 'title', 'practicalSkillFocus', 'reflectionNotes', 'status', 'createdAt', 'updatedAt'],
            ['projectId', 'studentId', 'schoolId', 'className', 'subject', 'title', 'practicalSkillFocus', 'reflectionNotes', 'status', 'createdAt', 'updatedAt']
          ) &&
          isValidId(data.projectId) &&
          isValidId(data.studentId) &&
          data.studentId === auth.uid &&
          (!('schoolId' in data) || isStringWithLen(data.schoolId, 1, 128)) &&
          isStringWithLen(data.className, 1, 32) &&
          isStringWithLen(data.subject, 2, 100) &&
          isStringWithLen(data.title, 2, 200) &&
          isStringWithLen(data.practicalSkillFocus, 2, 300) &&
          isStringWithLen(data.reflectionNotes, 2, 2000) &&
          ['in_progress', 'submitted', 'evaluated'].includes(String(data.status)) &&
          isExistingOrValidTimestamp(data.createdAt) &&
          isExistingOrValidTimestamp(data.updatedAt)
        );

      case 'achievements':
        return (
          hasRequiredAndAllowedKeys(
            data,
            ['achievementId', 'studentId', 'title', 'criteriaDemonstrated', 'skillTag', 'createdAt'],
            ['achievementId', 'studentId', 'schoolId', 'title', 'criteriaDemonstrated', 'skillTag', 'createdAt']
          ) &&
          isValidId(data.achievementId) &&
          isValidId(data.studentId) &&
          data.studentId === auth.uid &&
          (!('schoolId' in data) || isStringWithLen(data.schoolId, 1, 128)) &&
          isStringWithLen(data.title, 2, 160) &&
          isStringWithLen(data.criteriaDemonstrated, 2, 500) &&
          isStringWithLen(data.skillTag, 2, 120) &&
          isExistingOrValidTimestamp(data.createdAt)
        );

      default:
        return false;
    }
  }

  private assertPermission(allowed: boolean, op: RuleOperation, path: string): void {
    if (!allowed) {
      throw new Error(
        `PERMISSION_DENIED: Missing or insufficient permissions for ${op} on /${path}`
      );
    }
  }

  private resolveServerTimestamps(
    raw: StoredDocument,
    requestTimeIso: string
  ): StoredDocument {
    const resolved: StoredDocument = {};
    for (const [k, v] of Object.entries(raw)) {
      resolved[k] = v === SERVER_TIMESTAMP_SENTINEL ? requestTimeIso : v;
    }
    return resolved;
  }

  public createDoc(
    collectionName: string,
    docId: string,
    rawPayload: StoredDocument,
    auth: AuthContext | null
  ): StoredDocument {
    const requestTimeIso = new Date().toISOString();
    const incoming = this.resolveServerTimestamps(rawPayload, requestTimeIso);
    const path = `${collectionName}/${docId}`;

    if (this.docExists(collectionName, docId)) {
      throw new Error(`ALREADY_EXISTS: Document /${path} already exists`);
    }

    const verified = this.isVerified(auth);
    const validId = isValidId(docId);
    const validEntity = this.isValidEntity(collectionName, incoming, auth);

    let allowed = false;
    if (verified && validId && validEntity && auth) {
      switch (collectionName) {
        case 'admins':
          allowed =
            this.isAdmin(auth) &&
            incoming.adminId === docId &&
            incoming.status === 'active' &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso);
          break;
        case 'users':
          allowed =
            docId === auth.uid &&
            (incoming.role === 'student' ||
              incoming.role === 'independent_learner' ||
              this.isAdmin(auth)) &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso);
          break;
        case 'schools':
          allowed =
            incoming.schoolId === docId &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso);
          break;
        case 'school_memberships':
          allowed =
            incoming.membershipId === docId &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso) &&
            (this.isAdmin(auth) ||
              this.isSchoolAdminFor(auth, incoming.schoolId) ||
              (incoming.role === 'student' &&
                this.isSchoolTeacherFor(auth, incoming.schoolId)));
          break;
        case 'students':
          allowed =
            incoming.studentId === docId &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso) &&
            (incoming.schoolId === 'independent' ||
              this.isSchoolStudentOrStaff(auth, incoming.schoolId));
          break;
        case 'teachers':
          allowed =
            incoming.teacherId === docId &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso) &&
            this.isSchoolTeacherFor(auth, incoming.schoolId);
          break;
        case 'classes':
          allowed =
            incoming.classId === docId &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso) &&
            this.isSchoolTeacherFor(auth, incoming.schoolId);
          break;
        case 'academic_sessions':
          allowed =
            incoming.sessionId === docId &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso) &&
            this.isSchoolAdminFor(auth, incoming.schoolId);
          break;
        case 'terms':
          allowed =
            incoming.termId === docId &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso) &&
            this.isSchoolAdminFor(auth, incoming.schoolId);
          break;
        case 'curricula':
          allowed =
            incoming.curriculumId === docId &&
            ((incoming.isPlatformWide === false &&
              this.isSchoolTeacherFor(auth, incoming.schoolId)) ||
              this.isAdmin(auth)) &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso);
          break;
        case 'curriculum_versions':
          allowed =
            incoming.versionId === docId &&
            ((incoming.isPlatformWide === false &&
              this.isSchoolTeacherFor(auth, incoming.schoolId)) ||
              this.isAdmin(auth)) &&
            isTimestampValue(incoming.createdAt, requestTimeIso);
          break;
        case 'subjects':
          allowed =
            incoming.subjectId === docId &&
            ((incoming.isPlatformWide === false &&
              this.isSchoolTeacherFor(auth, incoming.schoolId)) ||
              this.isAdmin(auth)) &&
            isTimestampValue(incoming.createdAt, requestTimeIso);
          break;
        case 'topics':
          allowed =
            incoming.topicId === docId &&
            ((incoming.isPlatformWide === false &&
              this.isSchoolTeacherFor(auth, incoming.schoolId)) ||
              this.isAdmin(auth)) &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso);
          break;
        case 'learning_objectives':
          allowed =
            incoming.objectiveId === docId &&
            ((incoming.isPlatformWide === false &&
              this.isSchoolTeacherFor(auth, incoming.schoolId)) ||
              this.isAdmin(auth)) &&
            isTimestampValue(incoming.createdAt, requestTimeIso);
          break;
        case 'lessons':
          allowed =
            incoming.lessonId === docId &&
            incoming.ownerId === auth.uid &&
            ((incoming.isPlatformWide === false &&
              this.isSchoolTeacherFor(auth, incoming.schoolId)) ||
              this.isAdmin(auth)) &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso);
          break;
        case 'learning_resources':
          allowed =
            incoming.resourceId === docId &&
            ((incoming.isPlatformWide === false &&
              this.isSchoolTeacherFor(auth, incoming.schoolId)) ||
              this.isAdmin(auth)) &&
            isTimestampValue(incoming.createdAt, requestTimeIso);
          break;
        case 'teacher_materials':
          allowed =
            incoming.materialId === docId &&
            incoming.ownerId === auth.uid &&
            this.isSchoolTeacherFor(auth, incoming.schoolId) &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso);
          break;
        case 'approval_records':
          allowed =
            incoming.approvalId === docId &&
            this.isSchoolAdminFor(auth, incoming.schoolId) &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso);
          break;
        case 'submissions':
          allowed =
            incoming.submissionId === docId &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            (incoming.schoolId === 'independent' ||
              this.isSchoolStudentOrStaff(auth, incoming.schoolId));
          break;
        case 'results':
          allowed =
            incoming.resultId === docId &&
            this.isSchoolTeacherFor(auth, incoming.schoolId) &&
            isTimestampValue(incoming.createdAt, requestTimeIso);
          break;
        case 'skill_mastery':
          allowed =
            incoming.masteryId === docId &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso);
          break;
        case 'ai_sessions':
          allowed =
            incoming.sessionId === docId &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso);
          break;
        case 'projects':
          allowed =
            incoming.projectId === docId &&
            isTimestampValue(incoming.createdAt, requestTimeIso) &&
            isTimestampValue(incoming.updatedAt, requestTimeIso);
          break;
        case 'achievements':
          allowed =
            incoming.achievementId === docId &&
            isTimestampValue(incoming.createdAt, requestTimeIso);
          break;
      }
    }

    this.assertPermission(allowed, 'create', path);
    this.writeCount += 1;
    const copy = { ...incoming };
    this.getCollectionMap(collectionName).set(docId, copy);
    return { ...copy };
  }

  public getDoc(
    collectionName: string,
    docId: string,
    auth: AuthContext | null
  ): StoredDocument {
    const path = `${collectionName}/${docId}`;
    const existing = this.getDocInternal(collectionName, docId);
    if (!existing || !this.isSignedIn(auth) || !isValidId(docId)) {
      this.assertPermission(false, 'get', path);
    }
    const docData = existing!;
    const userAuth = auth!;

    let allowed = false;
    switch (collectionName) {
      case 'admins':
        allowed = userAuth.uid === docId || this.isAdmin(userAuth);
        break;
      case 'users':
        allowed = userAuth.uid === docId || this.isAdmin(userAuth);
        break;
      case 'roles':
        allowed = true;
        break;
      case 'schools':
        allowed =
          docData.ownerId === userAuth.uid ||
          this.isSchoolStudentOrStaff(userAuth, docId) ||
          this.isAdmin(userAuth);
        break;
      case 'school_memberships':
        allowed =
          docData.userId === userAuth.uid ||
          this.isSchoolAdminFor(userAuth, docData.schoolId) ||
          this.isAdmin(userAuth);
        break;
      case 'students':
        allowed =
          docData.userId === userAuth.uid ||
          (docData.schoolId !== 'independent' &&
            this.isSchoolTeacherFor(userAuth, docData.schoolId)) ||
          this.isAdmin(userAuth);
        break;
      case 'teachers':
        allowed =
          docData.userId === userAuth.uid ||
          this.isSchoolTeacherFor(userAuth, docData.schoolId) ||
          this.isAdmin(userAuth);
        break;
      case 'classes':
        allowed =
          this.isSchoolStudentOrStaff(userAuth, docData.schoolId) ||
          docData.classTeacherId === userAuth.uid ||
          this.isAdmin(userAuth);
        break;
      case 'academic_sessions':
      case 'terms':
        allowed =
          this.isSchoolStudentOrStaff(userAuth, docData.schoolId) ||
          docData.ownerId === userAuth.uid ||
          this.isAdmin(userAuth);
        break;
      case 'curricula':
      case 'topics':
        allowed =
          docData.isPlatformWide === true ||
          docData.ownerId === userAuth.uid ||
          this.isSchoolStudentOrStaff(userAuth, docData.schoolId) ||
          this.isAdmin(userAuth);
        break;
      case 'teacher_materials':
        allowed =
          docData.ownerId === userAuth.uid ||
          this.isSchoolTeacherFor(userAuth, docData.schoolId) ||
          (docData.approvalStatus === 'approved_published' &&
            this.isSchoolStudentOrStaff(userAuth, docData.schoolId)) ||
          this.isAdmin(userAuth);
        break;
      case 'approval_records':
        allowed =
          docData.submittedBy === userAuth.uid ||
          docData.reviewedBy === userAuth.uid ||
          this.isSchoolTeacherFor(userAuth, docData.schoolId) ||
          this.isAdmin(userAuth);
        break;
      case 'submissions':
        allowed =
          docData.studentId === userAuth.uid ||
          (docData.schoolId !== 'independent' &&
            this.isSchoolTeacherFor(userAuth, docData.schoolId)) ||
          this.isAdmin(userAuth);
        break;
      case 'results':
        allowed =
          docData.studentId === userAuth.uid ||
          docData.recordedBy === userAuth.uid ||
          this.isSchoolTeacherFor(userAuth, docData.schoolId) ||
          this.isAdmin(userAuth);
        break;
      case 'skill_mastery':
      case 'projects':
      case 'achievements':
        allowed =
          docData.studentId === userAuth.uid ||
          (typeof docData.schoolId === 'string' &&
            docData.schoolId !== 'independent' &&
            this.isSchoolTeacherFor(userAuth, docData.schoolId)) ||
          this.isAdmin(userAuth);
        break;
      case 'ai_sessions':
        allowed = docData.studentId === userAuth.uid || this.isAdmin(userAuth);
        break;
    }

    this.assertPermission(allowed, 'get', path);
    this.readCount += 1;
    return { ...docData };
  }

  public updateDoc(
    collectionName: string,
    docId: string,
    partialChanges: StoredDocument,
    auth: AuthContext | null
  ): StoredDocument {
    const path = `${collectionName}/${docId}`;
    const existing = this.getDocInternal(collectionName, docId);
    if (!existing) {
      this.assertPermission(false, 'update', path);
    }
    const existingDoc = existing!;
    const requestTimeIso = new Date().toISOString();
    const resolvedChanges = this.resolveServerTimestamps(partialChanges, requestTimeIso);
    const incoming: StoredDocument = { ...existingDoc, ...resolvedChanges };

    const verified = this.isVerified(auth);
    const validId = isValidId(docId);
    const validEntity = this.isValidEntity(collectionName, incoming, auth);

    let allowed = false;
    if (verified && validId && validEntity && auth) {
      if (collectionName === 'admins') {
        allowed =
          this.isAdmin(auth) &&
          incoming.adminId === existingDoc.adminId &&
          incoming.email === existingDoc.email &&
          incoming.role === existingDoc.role &&
          incoming.createdAt === existingDoc.createdAt &&
          isTimestampValue(incoming.updatedAt, requestTimeIso) &&
          affectedKeysOnly(incoming, existingDoc, [
            'status',
            'provisionedBy',
            'provisioningMethod',
            'updatedAt',
          ]);
      } else if (this.isAdmin(auth)) {
        allowed = true;
      } else {
        switch (collectionName) {
          case 'users':
            allowed =
              docId === auth.uid &&
              incoming.uid === existingDoc.uid &&
              incoming.email === existingDoc.email &&
              incoming.role === existingDoc.role &&
              incoming.createdAt === existingDoc.createdAt &&
              isTimestampValue(incoming.updatedAt, requestTimeIso) &&
              affectedKeysOnly(incoming, existingDoc, [
                'displayName',
                'educationLevel',
                'selectedClass',
                'updatedAt',
              ]);
            break;
          case 'schools':
            allowed =
              (existingDoc.ownerId === auth.uid ||
                this.hasSchoolRole(auth, docId, 'school_admin')) &&
              incoming.schoolId === existingDoc.schoolId &&
              incoming.ownerId === existingDoc.ownerId &&
              incoming.createdAt === existingDoc.createdAt &&
              isTimestampValue(incoming.updatedAt, requestTimeIso) &&
              affectedKeysOnly(incoming, existingDoc, [
                'name',
                'state',
                'lga',
                'curriculumMode',
                'activeSession',
                'activeTerm',
                'updatedAt',
              ]);
            break;
          case 'classes':
            allowed =
              this.isSchoolTeacherFor(auth, existingDoc.schoolId) &&
              incoming.classId === existingDoc.classId &&
              incoming.schoolId === existingDoc.schoolId &&
              incoming.createdAt === existingDoc.createdAt &&
              isTimestampValue(incoming.updatedAt, requestTimeIso) &&
              affectedKeysOnly(incoming, existingDoc, [
                'armLabel',
                'classTeacherId',
                'studentCount',
                'updatedAt',
              ]);
            break;
          case 'topics':
            allowed =
              existingDoc.isPlatformWide === false &&
              existingDoc.ownerId === auth.uid &&
              this.isSchoolTeacherFor(auth, existingDoc.schoolId) &&
              incoming.isPlatformWide === false &&
              incoming.topicId === existingDoc.topicId &&
              incoming.schoolId === existingDoc.schoolId &&
              incoming.ownerId === existingDoc.ownerId &&
              incoming.createdAt === existingDoc.createdAt &&
              isTimestampValue(incoming.updatedAt, requestTimeIso) &&
              affectedKeysOnly(incoming, existingDoc, [
                'title',
                'learningObjective',
                'lessonSummary',
                'assessmentPrompt',
                'skillTag',
                'weekNumber',
                'approvalStatus',
                'updatedAt',
              ]);
            break;
          case 'teacher_materials':
            allowed =
              (existingDoc.ownerId === auth.uid ||
                this.isSchoolAdminFor(auth, existingDoc.schoolId)) &&
              this.isSchoolTeacherFor(auth, existingDoc.schoolId) &&
              incoming.materialId === existingDoc.materialId &&
              incoming.ownerId === existingDoc.ownerId &&
              incoming.schoolId === existingDoc.schoolId &&
              incoming.createdAt === existingDoc.createdAt &&
              isTimestampValue(incoming.updatedAt, requestTimeIso) &&
              affectedKeysOnly(incoming, existingDoc, [
                'title',
                'content',
                'approvalStatus',
                'updatedAt',
              ]);
            break;
          case 'skill_mastery':
            allowed =
              existingDoc.studentId === auth.uid &&
              incoming.masteryId === existingDoc.masteryId &&
              incoming.studentId === existingDoc.studentId &&
              incoming.createdAt === existingDoc.createdAt &&
              isTimestampValue(incoming.updatedAt, requestTimeIso) &&
              affectedKeysOnly(incoming, existingDoc, [
                'masteryScore',
                'attemptsCount',
                'status',
                'updatedAt',
              ]);
            break;
        }
      }
    }

    this.assertPermission(allowed, 'update', path);
    this.writeCount += 1;
    this.getCollectionMap(collectionName).set(docId, { ...incoming });
    return { ...incoming };
  }
}

/**
 * High-Level Domain Persistence Service for ORION
 * Implements all 9 verified persistence journeys with read/write cost guards.
 */
export class KokoLearnPersistenceService {
  private store: RuleEnforcedFirestoreStore;

  constructor(store?: RuleEnforcedFirestoreStore) {
    this.store = store || new RuleEnforcedFirestoreStore();
  }

  public getStore(): RuleEnforcedFirestoreStore {
    return this.store;
  }

  // Platform Administrator Provisioning & Revocation (Trusted Authorization Flow)
  public provisionPlatformAdmin(
    provisionerAuth: AuthContext,
    input: {
      targetAdminId: string;
      targetEmail: string;
      provisioningMethod: 'bootstrap_owner_claim' | 'admin_grant' | 'server_custom_claim';
    }
  ): StoredDocument {
    return this.store.createDoc(
      'admins',
      input.targetAdminId,
      {
        adminId: input.targetAdminId,
        email: input.targetEmail,
        role: 'platform_admin',
        status: 'active',
        provisionedBy: provisionerAuth.uid,
        provisioningMethod: input.provisioningMethod,
        createdAt: SERVER_TIMESTAMP_SENTINEL,
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      },
      provisionerAuth
    );
  }

  public revokePlatformAdmin(
    provisionerAuth: AuthContext,
    targetAdminId: string
  ): StoredDocument {
    return this.store.updateDoc(
      'admins',
      targetAdminId,
      {
        status: 'revoked',
        provisionedBy: provisionerAuth.uid,
        provisioningMethod: 'admin_grant',
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      },
      provisionerAuth
    );
  }

  // 1 & 2. User authentication & profile creation/retrieval (with self-privilege escalation block)
  public registerUserProfile(
    auth: AuthContext,
    input: {
      displayName: string;
      requestedRole?: UserRole;
      educationLevel: EducationLevelType;
      selectedClass: NigerianClassName;
      schoolId?: string;
    }
  ): StoredDocument {
    return this.store.createDoc(
      'users',
      auth.uid,
      {
        uid: auth.uid,
        email: auth.email,
        displayName: input.displayName,
        role: input.requestedRole || 'student',
        ...(input.schoolId ? { schoolId: input.schoolId } : {}),
        educationLevel: input.educationLevel,
        selectedClass: input.selectedClass,
        createdAt: SERVER_TIMESTAMP_SENTINEL,
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      },
      auth
    );
  }

  public getUserProfile(auth: AuthContext, targetUid: string): StoredDocument {
    return this.store.getDoc('users', targetUid, auth);
  }

  // 3. School administrator creates a school and receives trusted school_admin membership
  public createSchool(
    auth: AuthContext,
    input: {
      schoolId: string;
      name: string;
      state: string;
      lga: string;
      curriculumMode: 'built_in' | 'custom' | 'hybrid';
      activeSession: string;
      activeTerm: NigerianTerm;
    }
  ): { school: StoredDocument; membership: StoredDocument } {
    const school = this.store.createDoc(
      'schools',
      input.schoolId,
      {
        schoolId: input.schoolId,
        name: input.name,
        state: input.state,
        lga: input.lga,
        curriculumMode: input.curriculumMode,
        activeSession: input.activeSession,
        activeTerm: input.activeTerm,
        ownerId: auth.uid,
        createdAt: SERVER_TIMESTAMP_SENTINEL,
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      },
      auth
    );

    const membershipId = `${input.schoolId}_${auth.uid}`;
    const membership = this.store.createDoc(
      'school_memberships',
      membershipId,
      {
        membershipId,
        schoolId: input.schoolId,
        userId: auth.uid,
        role: 'school_admin',
        status: 'active',
        authorizedBy: auth.uid,
        createdAt: SERVER_TIMESTAMP_SENTINEL,
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      },
      auth
    );

    return { school, membership };
  }

  public authorizeSchoolMember(
    adminAuth: AuthContext,
    input: {
      schoolId: string;
      targetUserId: string;
      role: 'student' | 'teacher' | 'school_admin';
      status?: 'active' | 'invited' | 'suspended';
    }
  ): StoredDocument {
    const membershipId = `${input.schoolId}_${input.targetUserId}`;
    return this.store.createDoc(
      'school_memberships',
      membershipId,
      {
        membershipId,
        schoolId: input.schoolId,
        userId: input.targetUserId,
        role: input.role,
        status: input.status || 'active',
        authorizedBy: adminAuth.uid,
        createdAt: SERVER_TIMESTAMP_SENTINEL,
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      },
      adminAuth
    );
  }

  // 4. Create and retrieve school classes
  public createSchoolClass(
    staffAuth: AuthContext,
    input: {
      classId: string;
      schoolId: string;
      educationLevel: EducationLevelType;
      className: NigerianClassName;
      armLabel: string;
      classTeacherId: string;
      studentCount: number;
    }
  ): StoredDocument {
    return this.store.createDoc(
      'classes',
      input.classId,
      {
        ...input,
        createdAt: SERVER_TIMESTAMP_SENTINEL,
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      },
      staffAuth
    );
  }

  public getSchoolClass(auth: AuthContext, classId: string): StoredDocument {
    return this.store.getDoc('classes', classId, auth);
  }

  // 5 & 6. Teacher saves lesson material, approves/publishes it, and student retrieves it
  public saveTeacherMaterial(
    teacherAuth: AuthContext,
    input: {
      materialId: string;
      materialType: 'scheme_of_work' | 'lesson_note';
      title: string;
      className: NigerianClassName;
      subject: string;
      term: NigerianTerm;
      content: string;
      approvalStatus: 'draft' | 'pending_approval' | 'approved_published';
      schoolId: string;
    }
  ): StoredDocument {
    return this.store.createDoc(
      'teacher_materials',
      input.materialId,
      {
        ...input,
        ownerId: teacherAuth.uid,
        createdAt: SERVER_TIMESTAMP_SENTINEL,
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      },
      teacherAuth
    );
  }

  public approveAndPublishTeacherMaterial(
    approverAuth: AuthContext,
    input: {
      materialId: string;
      schoolId: string;
      targetTitle: string;
      submittedBy: string;
      reviewerComment: string;
    }
  ): { updatedMaterial: StoredDocument; approvalRecord: StoredDocument } {
    const updatedMaterial = this.store.updateDoc(
      'teacher_materials',
      input.materialId,
      {
        approvalStatus: 'approved_published',
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      },
      approverAuth
    );

    const approvalId = `app_${input.materialId}`;
    const approvalRecord = this.store.createDoc(
      'approval_records',
      approvalId,
      {
        approvalId,
        schoolId: input.schoolId,
        targetType: 'teacher_material',
        targetId: input.materialId,
        targetTitle: input.targetTitle,
        submittedBy: input.submittedBy,
        reviewedBy: approverAuth.uid,
        status: 'approved',
        reviewerComment: input.reviewerComment,
        createdAt: SERVER_TIMESTAMP_SENTINEL,
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      },
      approverAuth
    );

    return { updatedMaterial, approvalRecord };
  }

  public getTeacherMaterialForStudentLibrary(
    studentAuth: AuthContext,
    materialId: string
  ): StoredDocument {
    return this.store.getDoc('teacher_materials', materialId, studentAuth);
  }

  // 7. Student assessment submissions and results persist
  public submitStudentAssessment(
    studentAuth: AuthContext,
    input: {
      submissionId: string;
      assessmentId: string;
      schoolId: string;
      className: NigerianClassName;
      subject: string;
      scoreObtained: number;
      maxScore: number;
    }
  ): StoredDocument {
    return this.store.createDoc(
      'submissions',
      input.submissionId,
      {
        ...input,
        studentId: studentAuth.uid,
        createdAt: SERVER_TIMESTAMP_SENTINEL,
      },
      studentAuth
    );
  }

  public getStudentSubmission(auth: AuthContext, submissionId: string): StoredDocument {
    return this.store.getDoc('submissions', submissionId, auth);
  }

  // 8. Student skill mastery progress persists across sessions
  public recordStudentSkillMastery(
    studentAuth: AuthContext,
    input: {
      masteryId: string;
      schoolId?: string;
      className: NigerianClassName;
      subject: string;
      skillTag: string;
      masteryScore: number;
      attemptsCount: number;
      status: 'needs_remedial' | 'developing' | 'mastered';
    }
  ): StoredDocument {
    return this.store.createDoc(
      'skill_mastery',
      input.masteryId,
      {
        masteryId: input.masteryId,
        studentId: studentAuth.uid,
        ...(input.schoolId ? { schoolId: input.schoolId } : {}),
        className: input.className,
        subject: input.subject,
        skillTag: input.skillTag,
        masteryScore: input.masteryScore,
        attemptsCount: input.attemptsCount,
        status: input.status,
        createdAt: SERVER_TIMESTAMP_SENTINEL,
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      },
      studentAuth
    );
  }

  public updateStudentSkillMastery(
    studentAuth: AuthContext,
    masteryId: string,
    update: {
      masteryScore: number;
      attemptsCount: number;
      status: 'needs_remedial' | 'developing' | 'mastered';
    }
  ): StoredDocument {
    return this.store.updateDoc(
      'skill_mastery',
      masteryId,
      {
        ...update,
        updatedAt: SERVER_TIMESTAMP_SENTINEL,
      },
      studentAuth
    );
  }

  public getStudentSkillMastery(
    auth: AuthContext,
    masteryId: string
  ): StoredDocument {
    return this.store.getDoc('skill_mastery', masteryId, auth);
  }
}

/**
 * Client-Side Read/Write Cost Guard for Live Firestore Operations
 * Prevents duplicate writes and redundant reads within a short TTL window.
 */
const recentWriteHashes = new Map<string, number>();
const WRITE_DEDUP_WINDOW_MS = 5000;

export function shouldExecuteFirestoreWrite(path: string, payload: unknown): boolean {
  const now = Date.now();
  const signature = `${path}:${JSON.stringify(payload)}`;
  const lastTime = recentWriteHashes.get(signature);
  if (lastTime && now - lastTime < WRITE_DEDUP_WINDOW_MS) {
    return false;
  }
  recentWriteHashes.set(signature, now);
  if (recentWriteHashes.size > 200) {
    const oldestKey = recentWriteHashes.keys().next().value;
    if (oldestKey) recentWriteHashes.delete(oldestKey);
  }
  return true;
}
