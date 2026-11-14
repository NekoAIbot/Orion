import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  AuthContext,
  KokoLearnPersistenceService,
  RuleEnforcedFirestoreStore,
  SERVER_TIMESTAMP_SENTINEL,
  shouldExecuteFirestoreWrite,
} from './src/lib/firestorePersistenceService';
import {
  AI_CONFIG,
  checkAiRateLimit,
  getCachedAiResponse,
  isAuthorizedPlatformAdminCaller,
  redactStudentPII,
  resetRateLimitBuckets,
  setCachedAiResponse,
  validateTeacherGeneratorRequest,
  validateTutorRequest,
  verifyFirebaseBearerToken,
} from './src/utils/aiServerSecurity';

const rulesSource = fs.readFileSync('firestore.rules', 'utf8');
const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));
const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

test('1. Firestore rules include global default-deny catch-all and rules_version 2', () => {
  assert.ok(rulesSource.includes("rules_version = '2';"));
  assert.ok(
    rulesSource.includes('match /{document=**} {\n      allow read, write: if false;\n    }')
  );
});

test('2. Every collection in 28-collection firebase-blueprint.json has a match block in firestore.rules', () => {
  const firestorePaths = Object.keys(blueprint.firestore);
  assert.equal(firestorePaths.length, 28, 'Blueprint must define all 28 collections');
  for (const collectionPath of firestorePaths) {
    assert.ok(
      rulesSource.includes(`match ${collectionPath}`),
      `Missing match block for ${collectionPath}`
    );
  }
});

test('3. Static Security Invariants: Self-role escalation block, cross-school checks, and platform curriculum immutability', () => {
  // Self-registration cannot assign teacher or school_admin unless isAdmin()
  assert.ok(
    rulesSource.includes(
      "(incoming().role == 'student' || incoming().role == 'independent_learner' || isAdmin())"
    )
  );
  // Role is immutable by non-admin users during profile updates
  assert.ok(rulesSource.includes('incoming().role == existing().role'));
  // Trusted school authorization helpers
  assert.ok(rulesSource.includes('function isSchoolAdminFor(schoolId)'));
  assert.ok(rulesSource.includes('function isSchoolTeacherFor(schoolId)'));
  assert.ok(rulesSource.includes('function isSchoolStudentOrStaff(schoolId)'));
  // Platform-wide curriculum cannot be overwritten by a school
  assert.ok(rulesSource.includes('existing().isPlatformWide == false'));
  assert.ok(rulesSource.includes('incoming().isPlatformWide == false'));
  // Explicit platform admin provisioning & custom claim check
  assert.ok(rulesSource.includes('function isProvisionedPlatformAdmin()'));
  assert.ok(rulesSource.includes("'platformAdmin' in request.auth.token"));
  assert.ok(
    rulesSource.includes(
      "get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.status == 'active'"
    )
  );
});

test('4. Prohibited Operations (Adversarial Security Tests): Rejects privilege escalation, unverified emails, ghost fields, and unauthorized reads', () => {
  const store = new RuleEnforcedFirestoreStore();
  const service = new KokoLearnPersistenceService(store);

  const unverifiedUser: AuthContext = {
    uid: 'usr_unverified_01',
    email: 'unverified@example.com',
    email_verified: false,
  };

  const studentA: AuthContext = {
    uid: 'usr_student_a',
    email: 'student.a@schoola.edu.ng',
    email_verified: true,
  };

  const studentB: AuthContext = {
    uid: 'usr_student_b',
    email: 'student.b@schoolb.edu.ng',
    email_verified: true,
  };

  // (a) Unverified email cannot create user profile
  assert.throws(
    () =>
      service.registerUserProfile(unverifiedUser, {
        displayName: 'Unverified User',
        requestedRole: 'student',
        educationLevel: 'JSS',
        selectedClass: 'JSS 2',
      }),
    /PERMISSION_DENIED/
  );

  // (b) Non-admin user cannot self-grant school_admin or teacher role on registration
  assert.throws(
    () =>
      service.registerUserProfile(studentA, {
        displayName: 'Escalating Student',
        requestedRole: 'school_admin',
        educationLevel: 'JSS',
        selectedClass: 'JSS 2',
      }),
    /PERMISSION_DENIED/
  );

  assert.throws(
    () =>
      service.registerUserProfile(studentA, {
        displayName: 'Escalating Teacher',
        requestedRole: 'teacher',
        educationLevel: 'JSS',
        selectedClass: 'JSS 2',
      }),
    /PERMISSION_DENIED/
  );

  // Register Student A legitimately as 'student'
  const createdProfile = service.registerUserProfile(studentA, {
    displayName: 'Chisom Okafor',
    requestedRole: 'student',
    educationLevel: 'JSS',
    selectedClass: 'JSS 2',
  });
  assert.equal(createdProfile.role, 'student');

  // (c) Student A cannot escalate role to 'school_admin' via updateDoc
  assert.throws(
    () =>
      store.updateDoc(
        'users',
        studentA.uid,
        {
          role: 'school_admin',
          updatedAt: SERVER_TIMESTAMP_SENTINEL,
        },
        studentA
      ),
    /PERMISSION_DENIED/
  );

  // (d) Student A cannot inject a ghost/shadow field on update
  assert.throws(
    () =>
      store.updateDoc(
        'users',
        studentA.uid,
        {
          displayName: 'Chisom Updated',
          isSuperAdmin: true,
          updatedAt: SERVER_TIMESTAMP_SENTINEL,
        },
        studentA
      ),
    /PERMISSION_DENIED/
  );

  // (e) Student B cannot read Student A's private user profile (PII isolation)
  assert.throws(
    () => service.getUserProfile(studentB, studentA.uid),
    /PERMISSION_DENIED/
  );

  // (f) Student A cannot self-grant school_admin membership in a school they don't own
  assert.throws(
    () =>
      store.createDoc(
        'school_memberships',
        `sch_foreign_${studentA.uid}`,
        {
          membershipId: `sch_foreign_${studentA.uid}`,
          schoolId: 'sch_foreign',
          userId: studentA.uid,
          role: 'school_admin',
          status: 'active',
          authorizedBy: studentA.uid,
          createdAt: SERVER_TIMESTAMP_SENTINEL,
          updatedAt: SERVER_TIMESTAMP_SENTINEL,
        },
        studentA
      ),
    /PERMISSION_DENIED/
  );

  // (g) Ordinary user cannot grant themselves platform_admin in /admins/{uid}
  assert.throws(
    () =>
      service.provisionPlatformAdmin(studentA, {
        targetAdminId: studentA.uid,
        targetEmail: studentA.email,
        provisioningMethod: 'admin_grant',
      }),
    /PERMISSION_DENIED/
  );

  // (h) School administrator cannot grant themselves or anyone else platform_admin in /admins/{uid}
  const schoolAdminUser: AuthContext = {
    uid: 'usr_school_admin_only',
    email: 'principal@lagosgrammar.edu.ng',
    email_verified: true,
  };
  service.createSchool(schoolAdminUser, {
    schoolId: 'sch_lagos_grammar_01',
    name: 'Lagos Grammar School',
    state: 'Lagos',
    lga: 'Mainland',
    curriculumMode: 'built_in',
    activeSession: '2026/2027',
    activeTerm: 'First Term',
  });
  assert.throws(
    () =>
      service.provisionPlatformAdmin(schoolAdminUser, {
        targetAdminId: schoolAdminUser.uid,
        targetEmail: schoolAdminUser.email,
        provisioningMethod: 'admin_grant',
      }),
    /PERMISSION_DENIED/
  );

  // (i) Authorized bootstrap owner can provision their own /admins/{uid} record and grant a secondary platform_admin, and revoke them
  const bootstrapOwner: AuthContext = {
    uid: 'usr_owner_ahow0166',
    email: 'ahow0166@gmail.com',
    email_verified: true,
  };
  const ownerAdminDoc = service.provisionPlatformAdmin(bootstrapOwner, {
    targetAdminId: bootstrapOwner.uid,
    targetEmail: bootstrapOwner.email,
    provisioningMethod: 'bootstrap_owner_claim',
  });
  assert.equal(ownerAdminDoc.status, 'active');
  assert.equal(ownerAdminDoc.role, 'platform_admin');

  const delegatedPlatformAdmin: AuthContext = {
    uid: 'usr_delegated_platform_admin',
    email: 'curriculum.director@kokolearn.ng',
    email_verified: true,
  };
  const delegatedDoc = service.provisionPlatformAdmin(bootstrapOwner, {
    targetAdminId: delegatedPlatformAdmin.uid,
    targetEmail: delegatedPlatformAdmin.email,
    provisioningMethod: 'admin_grant',
  });
  assert.equal(delegatedDoc.status, 'active');

  // Delegated platform admin can create a platform-wide subject while active
  store.createDoc(
    'subjects',
    'sub_platform_civic_01',
    {
      subjectId: 'sub_platform_civic_01',
      curriculumId: 'curr_ng_jss',
      schoolId: 'platform_nigeria',
      isPlatformWide: true,
      educationLevel: 'JSS',
      className: 'JSS 2',
      name: 'Civic Education',
      category: 'Core',
      isCompulsory: true,
      ownerId: delegatedPlatformAdmin.uid,
      createdAt: SERVER_TIMESTAMP_SENTINEL,
    },
    delegatedPlatformAdmin
  );

  // Revoking the delegated platform admin immediately strips platform-wide write authority
  const revokedDoc = service.revokePlatformAdmin(bootstrapOwner, delegatedPlatformAdmin.uid);
  assert.equal(revokedDoc.status, 'revoked');
  assert.throws(
    () =>
      store.createDoc(
        'subjects',
        'sub_platform_civic_02',
        {
          subjectId: 'sub_platform_civic_02',
          curriculumId: 'curr_ng_jss',
          schoolId: 'platform_nigeria',
          isPlatformWide: true,
          educationLevel: 'JSS',
          className: 'JSS 3',
          name: 'Civic Education II',
          category: 'Core',
          isCompulsory: true,
          ownerId: delegatedPlatformAdmin.uid,
          createdAt: SERVER_TIMESTAMP_SENTINEL,
        },
        delegatedPlatformAdmin
      ),
    /PERMISSION_DENIED/
  );
});

test('5. All 9 Real Persistence Journeys & Multi-School Isolation Verification', () => {
  const store = new RuleEnforcedFirestoreStore();
  const service = new KokoLearnPersistenceService(store);

  const platformAdmin: AuthContext = {
    uid: 'usr_platform_admin',
    email: 'ahow0166@gmail.com',
    email_verified: true,
  };

  const schoolAdminA: AuthContext = {
    uid: 'usr_admin_school_a',
    email: 'principal@unitylagos.edu.ng',
    email_verified: true,
  };

  const teacherA: AuthContext = {
    uid: 'usr_teacher_school_a',
    email: 'funke.adeyemi@unitylagos.edu.ng',
    email_verified: true,
  };

  const studentA: AuthContext = {
    uid: 'usr_student_school_a',
    email: 'chisom@unitylagos.edu.ng',
    email_verified: true,
  };

  const schoolAdminB: AuthContext = {
    uid: 'usr_admin_school_b',
    email: 'principal@kanomodel.edu.ng',
    email_verified: true,
  };

  // Journey 1 & 2: User authenticates, creates profile, and retrieves it
  service.registerUserProfile(studentA, {
    displayName: 'Chisom Okafor',
    requestedRole: 'student',
    educationLevel: 'JSS',
    selectedClass: 'JSS 2',
  });
  const loadedStudentProfile = service.getUserProfile(studentA, studentA.uid);
  assert.equal(loadedStudentProfile.displayName, 'Chisom Okafor');
  assert.equal(loadedStudentProfile.selectedClass, 'JSS 2');

  // Journey 3: Authorized School Administrator creates School A and enrolls Teacher A & Student A
  const { school: schoolA, membership: adminMembershipA } = service.createSchool(schoolAdminA, {
    schoolId: 'sch_unity_lagos_01',
    name: 'Unity Model Secondary School, Surulere',
    state: 'Lagos',
    lga: 'Surulere',
    curriculumMode: 'hybrid',
    activeSession: '2026/2027',
    activeTerm: 'First Term',
  });
  assert.equal(schoolA.schoolId, 'sch_unity_lagos_01');
  assert.equal(adminMembershipA.role, 'school_admin');

  // School Admin B creates a separate School B
  service.createSchool(schoolAdminB, {
    schoolId: 'sch_kano_science_02',
    name: 'Kano Science Academy',
    state: 'Kano',
    lga: 'Nassarawa',
    curriculumMode: 'built_in',
    activeSession: '2026/2027',
    activeTerm: 'First Term',
  });

  // School Admin A authorizes Teacher A and Student A in School A
  const teacherMembership = service.authorizeSchoolMember(schoolAdminA, {
    schoolId: 'sch_unity_lagos_01',
    targetUserId: teacherA.uid,
    role: 'teacher',
  });
  assert.equal(teacherMembership.role, 'teacher');

  const studentMembership = service.authorizeSchoolMember(schoolAdminA, {
    schoolId: 'sch_unity_lagos_01',
    targetUserId: studentA.uid,
    role: 'student',
  });
  assert.equal(studentMembership.role, 'student');

  // Journey 4: School A creates and retrieves a Class Arm
  const createdClass = service.createSchoolClass(teacherA, {
    classId: 'cls_unity_jss2_gold',
    schoolId: 'sch_unity_lagos_01',
    educationLevel: 'JSS',
    className: 'JSS 2',
    armLabel: 'JSS 2 Gold',
    classTeacherId: teacherA.uid,
    studentCount: 38,
  });
  assert.equal(createdClass.armLabel, 'JSS 2 Gold');

  const retrievedClassByStudentA = service.getSchoolClass(studentA, 'cls_unity_jss2_gold');
  assert.equal(retrievedClassByStudentA.studentCount, 38);

  // Journey 5: Authorized Teacher A saves a lesson note (initially as draft)
  const savedDraft = service.saveTeacherMaterial(teacherA, {
    materialId: 'mat_unity_jss2_math_w1',
    materialType: 'lesson_note',
    title: 'JSS 2 Mathematics: Linear Equations in One Variable',
    className: 'JSS 2',
    subject: 'Mathematics',
    term: 'First Term',
    content: 'Step-by-step balance method for solving 3x + 5 = 20 with Naira examples.',
    approvalStatus: 'draft',
    schoolId: 'sch_unity_lagos_01',
  });
  assert.equal(savedDraft.approvalStatus, 'draft');

  // Student A CANNOT read Teacher A's unpublished draft
  assert.throws(
    () => service.getTeacherMaterialForStudentLibrary(studentA, 'mat_unity_jss2_math_w1'),
    /PERMISSION_DENIED/
  );

  // Journey 6: School Admin A approves & publishes the lesson note -> Student A can now read it in library
  const { updatedMaterial, approvalRecord } = service.approveAndPublishTeacherMaterial(
    schoolAdminA,
    {
      materialId: 'mat_unity_jss2_math_w1',
      schoolId: 'sch_unity_lagos_01',
      targetTitle: 'JSS 2 Mathematics: Linear Equations in One Variable',
      submittedBy: teacherA.uid,
      reviewerComment: 'Verified against JSS 2 First Term objectives.',
    }
  );
  assert.equal(updatedMaterial.approvalStatus, 'approved_published');
  assert.equal(approvalRecord.status, 'approved');

  const publishedForStudentA = service.getTeacherMaterialForStudentLibrary(
    studentA,
    'mat_unity_jss2_math_w1'
  );
  assert.equal(publishedForStudentA.approvalStatus, 'approved_published');
  assert.equal(
    publishedForStudentA.title,
    'JSS 2 Mathematics: Linear Equations in One Variable'
  );

  // Journey 7: Student A assessment submission persists and is immutable against tampering
  const submission = service.submitStudentAssessment(studentA, {
    submissionId: 'sub_chisom_jss2_math_ca1',
    assessmentId: 'ass_jss2_math_ca1',
    schoolId: 'sch_unity_lagos_01',
    className: 'JSS 2',
    subject: 'Mathematics',
    scoreObtained: 85,
    maxScore: 100,
  });
  assert.equal(submission.scoreObtained, 85);

  const loadedSubmissionByTeacherA = service.getStudentSubmission(
    teacherA,
    'sub_chisom_jss2_math_ca1'
  );
  assert.equal(loadedSubmissionByTeacherA.scoreObtained, 85);

  // Student A cannot mutate scoreObtained after submission
  assert.throws(
    () =>
      store.updateDoc(
        'submissions',
        'sub_chisom_jss2_math_ca1',
        { scoreObtained: 100 },
        studentA
      ),
    /PERMISSION_DENIED/
  );

  // Journey 8: Student skill mastery persists and updates across sessions
  const initialMastery = service.recordStudentSkillMastery(studentA, {
    masteryId: 'mast_chisom_linear_eq',
    schoolId: 'sch_unity_lagos_01',
    className: 'JSS 2',
    subject: 'Mathematics',
    skillTag: 'Linear Equations & Balancing',
    masteryScore: 68,
    attemptsCount: 1,
    status: 'developing',
  });
  assert.equal(initialMastery.masteryScore, 68);

  service.updateStudentSkillMastery(studentA, 'mast_chisom_linear_eq', {
    masteryScore: 86,
    attemptsCount: 2,
    status: 'mastered',
  });

  const reloadedMastery = service.getStudentSkillMastery(
    studentA,
    'mast_chisom_linear_eq'
  );
  assert.equal(reloadedMastery.masteryScore, 86);
  assert.equal(reloadedMastery.status, 'mastered');

  // Journey 9: Unauthorized cross-school access from School B is rejected
  assert.throws(
    () => store.getDoc('schools', 'sch_unity_lagos_01', schoolAdminB),
    /PERMISSION_DENIED/
  );
  assert.throws(
    () => service.getSchoolClass(schoolAdminB, 'cls_unity_jss2_gold'),
    /PERMISSION_DENIED/
  );
  assert.throws(
    () =>
      service.getTeacherMaterialForStudentLibrary(
        schoolAdminB,
        'mat_unity_jss2_math_w1'
      ),
    /PERMISSION_DENIED/
  );
  assert.throws(
    () => service.getStudentSubmission(schoolAdminB, 'sub_chisom_jss2_math_ca1'),
    /PERMISSION_DENIED/
  );

  // Platform-wide topic immutability check: Platform Admin creates a platform topic, School Admin A cannot overwrite it
  store.createDoc(
    'topics',
    'top_platform_jss2_math_1',
    {
      topicId: 'top_platform_jss2_math_1',
      curriculumId: 'curr_ng_jss',
      educationLevel: 'JSS',
      className: 'JSS 2',
      subject: 'Mathematics',
      term: 'First Term',
      weekNumber: 1,
      title: 'Platform Algebraic Equations',
      learningObjective: 'Solve linear equations in one variable accurately.',
      lessonSummary: 'Foundational algebraic balancing rules.',
      assessmentPrompt: 'Solve 2x + 4 = 12',
      skillTag: 'Linear Algebra',
      schoolId: 'platform_nigeria',
      isPlatformWide: true,
      approvalStatus: 'sample_unverified',
      ownerId: platformAdmin.uid,
      createdAt: SERVER_TIMESTAMP_SENTINEL,
      updatedAt: SERVER_TIMESTAMP_SENTINEL,
    },
    platformAdmin
  );

  assert.throws(
    () =>
      store.updateDoc(
        'topics',
        'top_platform_jss2_math_1',
        {
          title: 'Overwritten by School Admin A',
          updatedAt: SERVER_TIMESTAMP_SENTINEL,
        },
        schoolAdminA
      ),
    /PERMISSION_DENIED/
  );
});

test('6. Gemini Server Security, PII Redaction, Role Gatekeeping, and Cost Safeguards', async () => {
  // (a) Centralized model config
  assert.equal(typeof AI_CONFIG.model, 'string');
  assert.ok(AI_CONFIG.model.length > 0);

  // (b) Student PII Redaction
  const rawPrompt =
    'My name is Chisom, email chisom.okafor@gmail.com, phone 08031234567 and NIN 12345678901. How do I solve 2x + 5 = 15?';
  const sanitized = redactStudentPII(rawPrompt);
  assert.ok(!sanitized.includes('chisom.okafor@gmail.com'));
  assert.ok(!sanitized.includes('08031234567'));
  assert.ok(!sanitized.includes('12345678901'));
  assert.ok(sanitized.includes('[REDACTED_EMAIL]'));
  assert.ok(sanitized.includes('[REDACTED_PHONE]'));
  assert.ok(sanitized.includes('[REDACTED_ID]'));
  assert.ok(sanitized.includes('2x + 5 = 15'));

  // (c) Request validation rejects invalid classes, modes, and empty questions
  const badClassResult = validateTutorRequest({
    className: 'Grade 99',
    studentQuestion: 'Explain fractions',
  });
  assert.equal(badClassResult.ok, false);

  const validTutorResult = validateTutorRequest({
    className: 'JSS 2',
    subject: 'Mathematics',
    mode: 'hint_first',
    studentQuestion: 'How do I isolate x in 3x - 7 = 14?',
  });
  assert.equal(validTutorResult.ok, true);

  // (d) Teacher generator endpoint blocks student role with 403 Forbidden
  const studentAttemptOnScheme = validateTeacherGeneratorRequest(
    { className: 'JSS 2', subject: 'Mathematics', term: 'First Term' },
    'student'
  );
  assert.equal(studentAttemptOnScheme.ok, false);
  if (!studentAttemptOnScheme.ok) {
    assert.equal(studentAttemptOnScheme.status, 403);
  }

  // (e) Rate Limiter blocks excessive requests
  resetRateLimitBuckets();
  for (let i = 0; i < 3; i++) {
    const res = checkAiRateLimit('test_ip_1', 1000, 3, 60_000);
    assert.equal(res.allowed, true);
  }
  const blocked = checkAiRateLimit('test_ip_1', 1500, 3, 60_000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);

  // (f) Response cache prevents duplicate Gemini API calls
  setCachedAiResponse('test_key_1', { reply: 'Cached Socratic Hint' }, 1000, 60_000);
  const cachedHit = getCachedAiResponse<{ reply: string }>('test_key_1', 5000);
  assert.deepEqual(cachedHit, { reply: 'Cached Socratic Hint' });

  // (g) Write deduplication cost guard blocks identical rapid Firestore writes
  const firstWrite = shouldExecuteFirestoreWrite('skill_mastery/m1', { score: 80 });
  const duplicateWrite = shouldExecuteFirestoreWrite('skill_mastery/m1', { score: 80 });
  assert.equal(firstWrite, true);
  assert.equal(duplicateWrite, false);

  // (h) Strict Firebase Auth is enabled by default in AI_CONFIG
  assert.equal(AI_CONFIG.requireStrictAuth, true);

  // (i) Missing Authorization header is rejected with verified: false
  const missingHeaderCheck = await verifyFirebaseBearerToken(undefined, firebaseConfig.apiKey);
  assert.equal(missingHeaderCheck.verified, false);

  // (j) Forged Bearer token is rejected by server-side verification
  const forgedCheck = await verifyFirebaseBearerToken(
    'Bearer forged_invalid_jwt_token_value_123456',
    firebaseConfig.apiKey
  );
  assert.equal(forgedCheck.verified, false);

  // (k) Platform admin caller check ignores user-editable profile role and school_admin membership
  assert.equal(
    isAuthorizedPlatformAdminCaller({
      uid: 'usr_school_admin',
      email: 'principal@school.edu.ng',
      emailVerified: true,
      hasActiveAdminDoc: false,
      userProfileRole: 'platform_admin',
      schoolMembershipRole: 'school_admin',
    }),
    false
  );
  assert.equal(
    isAuthorizedPlatformAdminCaller({
      uid: 'usr_provisioned_admin',
      email: 'director@kokolearn.ng',
      emailVerified: true,
      hasActiveAdminDoc: true,
    }),
    true
  );
  assert.equal(
    isAuthorizedPlatformAdminCaller({
      uid: 'usr_claim_admin',
      email: 'claim.admin@kokolearn.ng',
      emailVerified: true,
      customClaims: { platformAdmin: true },
    }),
    true
  );

  // (l) Independent learner role is blocked on teacher generator endpoints
  const independentAttemptOnLessonNote = validateTeacherGeneratorRequest(
    { className: 'JSS 2', subject: 'Mathematics', term: 'First Term' },
    'independent_learner'
  );
  assert.equal(independentAttemptOnLessonNote.ok, false);
  if (!independentAttemptOnLessonNote.ok) {
    assert.equal(independentAttemptOnLessonNote.status, 403);
  }
});

test('7. Live Cloud Firebase Auth & Firestore Endpoint Probe (sanguine-origin-tbcxw)', async () => {
  assert.equal(firebaseConfig.projectId, 'sanguine-origin-tbcxw');
  assert.equal(
    firebaseConfig.firestoreDatabaseId,
    'ai-studio-1e54e458-05d1-482e-8124-057c57edb386'
  );

  // 1. Probe live Firebase Identity Toolkit project config
  const authRes = await fetch(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${firebaseConfig.apiKey}`
  );
  assert.equal(authRes.status, 200);
  const authData = (await authRes.json()) as {
    projectId?: string;
    authorizedDomains?: string[];
  };
  assert.equal(authData.projectId, '570578158330');
  assert.ok(
    Array.isArray(authData.authorizedDomains) &&
      authData.authorizedDomains.includes('sanguine-origin-tbcxw.firebaseapp.com')
  );

  // 2. Probe live Cloud Firestore database to verify it is provisioned and enforcing rules
  const firestoreProbeUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/unauthenticated_probe`;
  const fsRes = await fetch(firestoreProbeUrl);
  assert.equal(
    fsRes.status,
    403,
    'Live Firestore database must exist and return 403 PERMISSION_DENIED on unauthenticated read'
  );
  const fsBody = (await fsRes.json()) as { error?: { status?: string } };
  assert.equal(fsBody.error?.status, 'PERMISSION_DENIED');
});
