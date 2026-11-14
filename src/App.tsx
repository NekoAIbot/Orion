/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  Sun,
  Moon,
  LogIn,
  LogOut,
  GraduationCap,
  BookOpen,
  School,
  Compass,
  FlaskConical,
  Info,
  X,
} from 'lucide-react';
import {
  auth,
  db,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  limit,
  setDoc,
  serverTimestamp,
  signInWithPopup,
  signOut,
  googleProvider,
  handleFirestoreError,
  OperationType,
  postAuthenticatedAiRequest,
} from './lib/firebase';
import { shouldExecuteFirestoreWrite } from './lib/firestorePersistenceService';
import {
  NigerianClassName,
  UserRole,
  SchoolRecord,
  CurriculumRecord,
  TopicRecord,
  TeacherMaterialRecord,
  StudentSkillMasteryRecord,
  StudentProjectRecord,
} from './types/database';
import {
  DEFAULT_SCHOOL_PROFILE,
  BUILT_IN_CURRICULA,
  BUILT_IN_TOPICS,
  INITIAL_TEACHER_MATERIALS,
  INITIAL_STUDENT_MASTERY,
  INITIAL_STUDENT_PROJECTS,
  ALL_NIGERIAN_CLASSES,
} from './data/nigerianCurriculumData';
import {
  getEducationLevelForClass,
  mergeSchoolCurriculumOverlay,
  calculateUpdatedMastery,
} from './utils/curriculumEngine';
import { PWAInstallButton, OfflineIndicator } from './components/PWAInstallControl';
import { LandingView } from './components/LandingView';
import { StudentWorkspace, StudentTabId } from './components/StudentWorkspace';
import { TeacherWorkspace } from './components/TeacherWorkspace';
import { SchoolAdminWorkspace } from './components/SchoolAdminWorkspace';
import {
  OrionBrandLockup,
  OrionWordmark,
  OrionModuleTitle,
} from './components/OrionBrandAssets';

export default function App() {
  // Check URL query parameter for ?autostart=1
  const initialAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [viewMode, setViewMode] = useState<'landing' | 'workspace'>(
    initialAutostart ? 'workspace' : 'landing'
  );
  const [activeRole, setActiveRole] = useState<UserRole>('student');
  const [selectedClass, setSelectedClass] = useState<NigerianClassName>('JSS 2');
  const [isIndependentLearner, setIsIndependentLearner] = useState<boolean>(false);
  const [initialStudentTab, setInitialStudentTab] = useState<StudentTabId>('overview');

  // Theme State (Light / Dark Mode with @custom-variant dark)
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Firebase Auth State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showArchModal, setShowArchModal] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Core Application State (with localStorage persistence for offline support + Firestore sync when authenticated)
  const [schoolProfile, setSchoolProfile] = useState<SchoolRecord>(DEFAULT_SCHOOL_PROFILE);
  const [curricula] = useState<CurriculumRecord[]>(BUILT_IN_CURRICULA);
  const [platformTopics] = useState<TopicRecord[]>(
    BUILT_IN_TOPICS.filter((t) => t.isPlatformWide)
  );
  const [schoolCustomTopics, setSchoolCustomTopics] = useState<TopicRecord[]>(
    BUILT_IN_TOPICS.filter((t) => !t.isPlatformWide)
  );
  const [teacherMaterials, setTeacherMaterials] = useState<TeacherMaterialRecord[]>(
    INITIAL_TEACHER_MATERIALS
  );
  const [masteryRecords, setMasteryRecords] = useState<StudentSkillMasteryRecord[]>(
    INITIAL_STUDENT_MASTERY
  );
  const [projects, setProjects] = useState<StudentProjectRecord[]>(INITIAL_STUDENT_PROJECTS);
  const [offlineSavedTopicIds, setOfflineSavedTopicIds] = useState<string[]>(() => {
    try {
      const raw =
        localStorage.getItem('orion_offline_topics') ??
        localStorage.getItem('kokolearn_offline_topics');
      return raw ? JSON.parse(raw) : ['top_jss2_math_w1', 'top_sss1_chem_w2'];
    } catch {
      return ['top_jss2_math_w1'];
    }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && user.emailVerified) {
        try {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.role) setActiveRole(data.role as UserRole);
            if (data.selectedClass) setSelectedClass(data.selectedClass as NigerianClassName);
            setIsIndependentLearner(data.role === 'independent_learner');
          }
          const masteryQuery = query(
            collection(db, 'skill_mastery'),
            where('studentId', '==', user.uid),
            limit(25)
          );
          const masterySnap = await getDocs(masteryQuery);
          if (!masterySnap.empty) {
            const loadedMastery: StudentSkillMasteryRecord[] = masterySnap.docs.map((d) => {
              const item = d.data();
              return {
                masteryId: String(item.masteryId || d.id),
                studentId: String(item.studentId || user.uid),
                studentName: user.displayName || 'Authenticated Student',
                className: (item.className as NigerianClassName) || 'JSS 2',
                subject: String(item.subject || 'Mathematics'),
                skillTag: String(item.skillTag || 'Core Competency'),
                masteryScore: Number(item.masteryScore || 70),
                attemptsCount: Number(item.attemptsCount || 1),
                status:
                  (item.status as 'needs_remedial' | 'developing' | 'mastered') || 'developing',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            });
            setMasteryRecords((prev) => {
              const existingIds = new Set(loadedMastery.map((m) => m.masteryId));
              return [...loadedMastery, ...prev.filter((p) => !existingIds.has(p.masteryId))];
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Merged Curriculum Topics according to School Curriculum Mode (Never mutates platformTopics)
  const mergedTopics = mergeSchoolCurriculumOverlay(
    platformTopics,
    schoolCustomTopics,
    schoolProfile.curriculumMode,
    schoolProfile.schoolId
  );

  const handleToggleOfflineTopic = (topicId: string) => {
    setOfflineSavedTopicIds((prev) => {
      const next = prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId];
      try {
        localStorage.setItem('orion_offline_topics', JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  const handleRecordMastery = async (
    className: NigerianClassName,
    subject: string,
    skillTag: string,
    scorePercentage: number,
    usedHint: boolean
  ) => {
    setMasteryRecords((prev) => {
      const existingIdx = prev.findIndex(
        (m) => m.skillTag.toLowerCase() === skillTag.toLowerCase()
      );
      if (existingIdx >= 0) {
        const current = prev[existingIdx];
        const updatedCalc = calculateUpdatedMastery(
          current.masteryScore,
          current.attemptsCount,
          scorePercentage,
          usedHint
        );
        const nextList = [...prev];
        nextList[existingIdx] = {
          ...current,
          masteryScore: updatedCalc.masteryScore,
          attemptsCount: updatedCalc.attemptsCount,
          status: updatedCalc.status,
          updatedAt: new Date().toISOString(),
        };
        return nextList;
      }

      const freshCalc = calculateUpdatedMastery(0, 0, scorePercentage, usedHint);
      const newRecord: StudentSkillMasteryRecord = {
        masteryId: `mast_${Date.now()}`,
        studentId: firebaseUser?.uid || 'demo_student_01',
        studentName: firebaseUser?.displayName || 'Chisom Okafor',
        className,
        subject,
        skillTag,
        masteryScore: freshCalc.masteryScore,
        attemptsCount: freshCalc.attemptsCount,
        status: freshCalc.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return [newRecord, ...prev];
    });

    // Persist to Firestore if user is signed in with verified email
    if (firebaseUser && firebaseUser.emailVerified) {
      const masteryId = `mast_${firebaseUser.uid}_${skillTag.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}`;
      const calc = calculateUpdatedMastery(70, 1, scorePercentage, usedHint);
      const writePayload = {
        masteryId,
        studentId: firebaseUser.uid,
        className: className.slice(0, 32),
        subject: subject.slice(0, 100),
        skillTag: skillTag.slice(0, 120),
        masteryScore: calc.masteryScore,
        attemptsCount: calc.attemptsCount,
        status: calc.status,
      };
      if (!shouldExecuteFirestoreWrite(`skill_mastery/${masteryId}`, writePayload)) {
        return;
      }
      try {
        await setDoc(doc(db, 'skill_mastery', masteryId), {
          ...writePayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `skill_mastery/${masteryId}`);
      }
    }
  };

  const handleSaveTeacherMaterial = async (material: TeacherMaterialRecord) => {
    setTeacherMaterials((prev) => [material, ...prev]);
    if (firebaseUser && firebaseUser.emailVerified) {
      const safeId = material.materialId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
      const writePayload = {
        materialId: safeId,
        materialType: material.materialType,
        title: material.title.slice(0, 200),
        className: material.className.slice(0, 32),
        subject: material.subject.slice(0, 100),
        term: material.term,
        content: material.content.slice(0, 14500),
        approvalStatus: material.approvalStatus,
        ownerId: firebaseUser.uid,
        schoolId: material.schoolId.slice(0, 128),
      };
      if (!shouldExecuteFirestoreWrite(`teacher_materials/${safeId}`, writePayload)) {
        return;
      }
      try {
        await setDoc(doc(db, 'teacher_materials', safeId), {
          ...writePayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `teacher_materials/${safeId}`);
      }
    }
  };

  const handleUpdateMaterialStatus = (
    materialId: string,
    status: 'draft' | 'pending_approval' | 'approved_published'
  ) => {
    setTeacherMaterials((prev) =>
      prev.map((m) =>
        m.materialId === materialId
          ? { ...m, approvalStatus: status, updatedAt: new Date().toISOString() }
          : m
      )
    );
  };

  const handleAssignRemedialBoost = (masteryId: string) => {
    setMasteryRecords((prev) =>
      prev.map((m) => {
        if (m.masteryId !== masteryId) return m;
        const boosted = Math.min(100, m.masteryScore + 20);
        return {
          ...m,
          masteryScore: boosted,
          attemptsCount: m.attemptsCount + 1,
          status: boosted >= 80 ? 'mastered' : boosted >= 65 ? 'developing' : 'needs_remedial',
        };
      })
    );
  };

  const handleAddCustomSchoolTopic = async (newTopic: TopicRecord) => {
    setSchoolCustomTopics((prev) => [newTopic, ...prev]);
    if (firebaseUser && firebaseUser.emailVerified) {
      const safeTopicId = newTopic.topicId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
      const writePayload = {
        topicId: safeTopicId,
        curriculumId: newTopic.curriculumId,
        educationLevel: newTopic.educationLevel,
        className: newTopic.className.slice(0, 32),
        subject: newTopic.subject.slice(0, 100),
        term: newTopic.term,
        weekNumber: newTopic.weekNumber,
        title: newTopic.title.slice(0, 200),
        learningObjective: newTopic.learningObjective.slice(0, 600),
        lessonSummary: newTopic.lessonSummary.slice(0, 2000),
        assessmentPrompt: newTopic.assessmentPrompt.slice(0, 600),
        skillTag: newTopic.skillTag.slice(0, 120),
        schoolId: newTopic.schoolId.slice(0, 128),
        isPlatformWide: false,
        approvalStatus: 'approved',
        ownerId: firebaseUser.uid,
      };
      if (!shouldExecuteFirestoreWrite(`topics/${safeTopicId}`, writePayload)) {
        return;
      }
      try {
        await setDoc(doc(db, 'topics', safeTopicId), {
          ...writePayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `topics/${safeTopicId}`);
      }
    }
  };

  const handleToggleProjectStep = (projectId: string, stepIndex: number) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.projectId !== projectId) return proj;
        const updatedSteps = proj.milestoneSteps.map((s, idx) =>
          idx === stepIndex ? { ...s, completed: !s.completed } : s
        );
        const allDone = updatedSteps.every((s) => s.completed);
        return {
          ...proj,
          milestoneSteps: updatedSteps,
          status: allDone ? 'submitted' : 'in_progress',
        };
      })
    );
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user && cred.user.emailVerified) {
        const uid = cred.user.uid;
        try {
          // 1. Check whether user already holds an active /admins/{uid} record, or can be provisioned via server-side authorization
          let hasActivePlatformAdminRecord = false;
          const adminSnap = await getDoc(doc(db, 'admins', uid));
          if (adminSnap.exists() && adminSnap.data().status === 'active') {
            hasActivePlatformAdminRecord = true;
          } else {
            const provisionRes = await postAuthenticatedAiRequest<{
              status?: string;
              adminRecord?: {
                adminId: string;
                email: string;
                role: string;
                status: string;
                provisionedBy: string;
                provisioningMethod: string;
              };
            }>(
              '/api/admin/provision-platform-admin',
              {
                targetAdminId: uid,
                targetEmail: cred.user.email || '',
              },
              'platform_admin'
            );
            if (provisionRes.ok && provisionRes.data.adminRecord) {
              await setDoc(doc(db, 'admins', uid), {
                ...provisionRes.data.adminRecord,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              hasActivePlatformAdminRecord = true;
            }
          }

          // 2. Create or load /users/{uid} profile (non-admins can only self-register as student or independent_learner)
          const existingSnap = await getDoc(doc(db, 'users', uid));
          if (!existingSnap.exists()) {
            const safeRole: UserRole = hasActivePlatformAdminRecord
              ? activeRole
              : activeRole === 'independent_learner'
              ? 'independent_learner'
              : 'student';
            await setDoc(doc(db, 'users', uid), {
              uid,
              email: (cred.user.email || 'user@orion.edu.ng').slice(0, 256),
              displayName: (cred.user.displayName || 'Nigerian Learner').slice(0, 120),
              role: safeRole,
              schoolId:
                safeRole === 'independent_learner' ? 'independent' : schoolProfile.schoolId,
              educationLevel: getEducationLevelForClass(selectedClass),
              selectedClass,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            const profileData = existingSnap.data();
            if (profileData.role) setActiveRole(profileData.role as UserRole);
            if (profileData.selectedClass) {
              setSelectedClass(profileData.selectedClass as NigerianClassName);
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
        }
      }
      setShowAuthModal(false);
      setViewMode('workspace');
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Google Sign-In popup was closed or blocked in preview. You can continue using Role Onboarding directly.'
      );
    }
  };

  const handleEnterWorkspace = (
    role: UserRole,
    cls?: NigerianClassName,
    studentTab: StudentTabId = 'overview'
  ) => {
    setActiveRole(role);
    if (cls) setSelectedClass(cls);
    setIsIndependentLearner(role === 'independent_learner');
    setInitialStudentTab(studentTab);
    setViewMode('workspace');
  };

  if (viewMode === 'landing') {
    return (
      <>
        <OfflineIndicator />
        <LandingView
          topics={mergedTopics}
          onEnterWorkspace={handleEnterWorkspace}
          onOpenAuthModal={() => setShowAuthModal(true)}
        />
        {showAuthModal && (
          <OnboardingModal
            activeRole={activeRole}
            selectedClass={selectedClass}
            firebaseUser={firebaseUser}
            authError={authError}
            onSelectRole={setActiveRole}
            onSelectClass={setSelectedClass}
            onGoogleSignIn={handleGoogleSignIn}
            onContinueToWorkspace={() => {
              setIsIndependentLearner(activeRole === 'independent_learner');
              setShowAuthModal(false);
              setViewMode('workspace');
            }}
            onClose={() => setShowAuthModal(false)}
          />
        )}
      </>
    );
  }

  const isLearnActive =
    (activeRole === 'student' || activeRole === 'independent_learner') &&
    initialStudentTab !== 'lab';
  const isLabsActive =
    (activeRole === 'student' || activeRole === 'independent_learner') &&
    initialStudentTab === 'lab';

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F3E9] dark:bg-[#0A1F1D] text-[#102D2A] dark:text-[#F7F3E9]">
      <OfflineIndicator />

      {/* Official ORION Forest Green Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-6 px-4 sm:px-6 py-3 bg-[#102D2A] text-[#F7F3E9] border-b border-[#65A995]/25 shadow-md">
        {/* Zone 1: Official ORION Lockup (First Dark-Themed Icon + Custom Paul Laxa ORION Wordmark + Tagline) */}
        <button
          type="button"
          onClick={() => setViewMode('landing')}
          aria-label="ORION Home — Discover beyond what you know"
          className="text-left shrink-0 focus:outline-none group"
        >
          <OrionBrandLockup mode="navbar" theme="dark" />
        </button>

        {/* Zone 2: Official ORION Product Architecture Switcher */}
        <nav
          aria-label="ORION Ecosystem Modules"
          className="hidden lg:flex items-center gap-5 text-xs sm:text-sm font-medium text-[#F7F3E9]/80"
        >
          <button
            type="button"
            onClick={() => {
              setActiveRole('student');
              setIsIndependentLearner(false);
              setInitialStudentTab('overview');
            }}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors py-1 ${
              isLearnActive && !isIndependentLearner
                ? 'text-[#E6A65D] font-bold border-b-2 border-[#E6A65D]'
                : 'hover:text-[#F7F3E9]'
            }`}
          >
            <OrionWordmark height={12} variant="ivory" />
            <span>Learn</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveRole('independent_learner');
              setIsIndependentLearner(true);
              setInitialStudentTab('overview');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              isLearnActive && isIndependentLearner
                ? 'text-[#E6A65D] font-bold border-b-2 border-[#E6A65D]'
                : 'hover:text-[#F7F3E9]'
            }`}
          >
            Independent Learner
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveRole('teacher');
              setIsIndependentLearner(false);
            }}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeRole === 'teacher'
                ? 'text-[#E6A65D] font-bold border-b-2 border-[#E6A65D]'
                : 'hover:text-[#F7F3E9]'
            }`}
          >
            <OrionWordmark height={12} variant="ivory" />
            <span>Teach</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveRole('school_admin');
              setIsIndependentLearner(false);
            }}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeRole === 'school_admin'
                ? 'text-[#E6A65D] font-bold border-b-2 border-[#E6A65D]'
                : 'hover:text-[#F7F3E9]'
            }`}
          >
            <OrionWordmark height={12} variant="ivory" />
            <span>Schools</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveRole('student');
              setIsIndependentLearner(false);
              setInitialStudentTab('lab');
            }}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors py-1 ${
              isLabsActive
                ? 'text-[#E6A65D] font-bold border-b-2 border-[#E6A65D]'
                : 'hover:text-[#F7F3E9]'
            }`}
          >
            <OrionWordmark height={12} variant="ivory" />
            <span>Labs</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold text-[#102D2A] bg-[#65A995] hover:bg-[#78B9A6] rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            {firebaseUser ? firebaseUser.displayName || 'ORION Account' : 'Role & Account'}
          </button>
        </div>
      </header>

      {/* Secondary Workspace Utility Bar (Active Module, Curriculum Overlay, PWA Install, Architecture, Theme) */}
      <div className="border-b border-[#102D2A]/15 dark:border-[#65A995]/20 bg-[#EFE9DA] dark:bg-[#102D2A]/80 px-4 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-[#102D2A]/80 dark:text-[#F7F3E9]/85 flex flex-wrap items-center gap-1.5">
            <span>Active Module:</span>
            <OrionModuleTitle
              height={12}
              variant="monochrome"
              suffix={
                activeRole === 'school_admin'
                  ? 'Schools (Administrator)'
                  : activeRole === 'teacher'
                  ? 'Teach (Educator)'
                  : isLabsActive
                  ? 'Labs (Virtual Science Laboratory)'
                  : isIndependentLearner
                  ? 'Learn (Independent Learner)'
                  : 'Learn (School Student)'
              }
              suffixColorClass="text-[#102D2A] dark:text-[#E6A65D]"
              className="text-[#102D2A] dark:text-[#F7F3E9]"
            />
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Curriculum Overlay:</span>
            <strong className="text-[#102D2A] dark:text-[#65A995] font-mono">
              {schoolProfile.curriculumMode.toUpperCase()}
            </strong>
          </div>

          <div className="flex items-center gap-2.5">
            <PWAInstallButton offlineSavedCount={offlineSavedTopicIds.length} />

            <button
              type="button"
              onClick={() => setShowArchModal(true)}
              className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#102D2A]/25 dark:border-[#65A995]/30 text-xs font-medium text-[#102D2A] dark:text-[#F7F3E9] hover:bg-[#FDFBF7] dark:hover:bg-[#143834] flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-[#65A995]" />
              <span>Architecture & Roadmap</span>
            </button>

            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label={darkMode ? 'Switch to Warm Ivory Light Theme' : 'Switch to Forest Green Dark Theme'}
              className="min-h-[38px] min-w-[38px] px-2.5 py-1.5 rounded-lg border border-[#102D2A]/25 dark:border-[#65A995]/30 text-[#102D2A] dark:text-[#F7F3E9] hover:bg-[#FDFBF7] dark:hover:bg-[#143834] flex items-center justify-center transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-[#E6A65D]" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {(activeRole === 'student' || activeRole === 'independent_learner') && (
          <StudentWorkspace
            selectedClass={selectedClass}
            onSelectClass={setSelectedClass}
            isIndependentLearner={isIndependentLearner}
            onToggleIndependentLearner={() => setIsIndependentLearner((prev) => !prev)}
            topics={mergedTopics}
            publishedMaterials={teacherMaterials}
            masteryRecords={masteryRecords}
            onRecordMastery={handleRecordMastery}
            offlineSavedTopicIds={offlineSavedTopicIds}
            onToggleOfflineTopic={handleToggleOfflineTopic}
            projects={projects}
            onToggleProjectStep={handleToggleProjectStep}
            onRequireAuth={() => setShowAuthModal(true)}
            requestedTab={initialStudentTab}
            onTabChange={setInitialStudentTab}
          />
        )}

        {activeRole === 'teacher' && (
          <TeacherWorkspace
            topics={mergedTopics}
            teacherMaterials={teacherMaterials}
            onSaveMaterial={handleSaveTeacherMaterial}
            onUpdateMaterialStatus={handleUpdateMaterialStatus}
            masteryRecords={masteryRecords}
            onAssignRemedialBoost={handleAssignRemedialBoost}
            onRequireAuth={() => setShowAuthModal(true)}
          />
        )}

        {activeRole === 'school_admin' && (
          <SchoolAdminWorkspace
            school={schoolProfile}
            onUpdateSchool={setSchoolProfile}
            curricula={curricula}
            platformTopics={platformTopics}
            schoolCustomTopics={schoolCustomTopics}
            onAddCustomTopic={handleAddCustomSchoolTopic}
            teacherMaterials={teacherMaterials}
            onUpdateMaterialStatus={handleUpdateMaterialStatus}
            masteryRecords={masteryRecords}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Thumb-Zone Navigation Bar (<= 15% mobile viewport height) */}
      <nav
        aria-label="Mobile ORION Module Switcher"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-[#102D2A] text-[#F7F3E9] border-t border-[#65A995]/30 grid grid-cols-5 items-center"
      >
        <button
          type="button"
          onClick={() => {
            setActiveRole('student');
            setIsIndependentLearner(false);
            setInitialStudentTab('overview');
          }}
          className={`h-full flex flex-col items-center justify-center text-[10px] font-medium ${
            isLearnActive && !isIndependentLearner
              ? 'text-[#E6A65D] font-bold'
              : 'text-[#F7F3E9]/70'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span className="mt-0.5">Learn</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveRole('independent_learner');
            setIsIndependentLearner(true);
            setInitialStudentTab('overview');
          }}
          className={`h-full flex flex-col items-center justify-center text-[10px] font-medium ${
            isLearnActive && isIndependentLearner
              ? 'text-[#E6A65D] font-bold'
              : 'text-[#F7F3E9]/70'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span className="mt-0.5">Self-Study</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveRole('teacher');
            setIsIndependentLearner(false);
          }}
          className={`h-full flex flex-col items-center justify-center text-[10px] font-medium ${
            activeRole === 'teacher'
              ? 'text-[#E6A65D] font-bold'
              : 'text-[#F7F3E9]/70'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span className="mt-0.5">Teach</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveRole('school_admin');
            setIsIndependentLearner(false);
          }}
          className={`h-full flex flex-col items-center justify-center text-[10px] font-medium ${
            activeRole === 'school_admin'
              ? 'text-[#E6A65D] font-bold'
              : 'text-[#F7F3E9]/70'
          }`}
        >
          <School className="w-4 h-4" />
          <span className="mt-0.5">Schools</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveRole('student');
            setIsIndependentLearner(false);
            setInitialStudentTab('lab');
          }}
          className={`h-full flex flex-col items-center justify-center text-[10px] font-medium ${
            isLabsActive ? 'text-[#E6A65D] font-bold' : 'text-[#F7F3E9]/70'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span className="mt-0.5">Labs</span>
        </button>
      </nav>

      {/* Role Onboarding & Firebase Auth Modal */}
      {showAuthModal && (
        <OnboardingModal
          activeRole={activeRole}
          selectedClass={selectedClass}
          firebaseUser={firebaseUser}
          authError={authError}
          onSelectRole={setActiveRole}
          onSelectClass={setSelectedClass}
          onGoogleSignIn={handleGoogleSignIn}
          onContinueToWorkspace={() => {
            setIsIndependentLearner(activeRole === 'independent_learner');
            setShowAuthModal(false);
            setViewMode('workspace');
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* ORION Ecosystem Architecture & Phase Roadmap Modal */}
      {showArchModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="arch-modal-title"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-[#FDFBF7] dark:bg-[#102D2A] border border-[#102D2A]/20 dark:border-[#65A995]/30 p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#102D2A]/15 dark:border-[#65A995]/20 pb-3">
              <div>
                <h3
                  id="arch-modal-title"
                  className="text-lg font-bold text-[#102D2A] dark:text-[#F7F3E9] font-display"
                >
                  ORION Ecosystem Architecture & Phase Roadmap
                </h3>
                <p className="text-xs text-[#102D2A]/70 dark:text-[#F7F3E9]/70">
                  Discover beyond what you know. · An AI-powered learning ecosystem for Nigeria and beyond.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowArchModal(false)}
                aria-label="Close Architecture Documentation"
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg hover:bg-[#102D2A]/10 dark:hover:bg-[#F7F3E9]/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#102D2A]/85 dark:text-[#F7F3E9]/85 leading-relaxed">
              <div>
                <h4 className="font-semibold text-[#102D2A] dark:text-[#E6A65D] text-sm font-display">
                  1. Official ORION Product Architecture
                </h4>
                <p className="mt-1">
                  • <strong>ORION Learn:</strong> Student & independent learner workspace with textbook-free digital lessons, Socratic Hint-First AI Tutor, quizzes, and curriculum missions.<br />
                  • <strong>ORION Teach:</strong> Educator workspace featuring the 12-Week Term Scheme of Work Generator, Comprehensive Lesson Note Generator, and Skill-Gap Clinic.<br />
                  • <strong>ORION Schools:</strong> School administrator console with 11-tier curriculum governance, Built-In/Custom/Hybrid curriculum overlays, teacher content approvals, and school-wide mastery analytics.<br />
                  • <strong>ORION Labs:</strong> Interactive virtual science laboratories for Chemistry (Stoichiometry & Titration), Physics (Ohm’s Law & Pendulum), and Biology (Xylem & Phloem Transport).
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-[#102D2A] dark:text-[#E6A65D] text-sm font-display">
                  2. Curriculum Verification Honesty Policy
                </h4>
                <p className="mt-1">
                  Built-in topics are clearly marked as <code>sample_unverified</code> demonstration structures. Official nationwide NERDC/WAEC/NECO syllabus verification requires importing and reviewing the authoritative source publications via the ORION Schools Admin Console.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-[#102D2A] dark:text-[#E6A65D] text-sm font-display">
                  3. Planned Future Phase Two Modules
                </h4>
                <p className="mt-1">
                  • <strong>ORION Parents & Guardians Portal:</strong> SMS/WhatsApp weekly digest reports and ward attendance/mastery alerts.<br />
                  • <strong>Full-Year Multi-Term Bulk Curriculum Importer:</strong> Automated PDF/DOCX syllabus ingestion pipeline.<br />
                  • <strong>Peer Study Groups & Inter-School STEM Competitions:</strong> Moderated collaborative project challenges across Nigerian states.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#102D2A]/15 dark:border-[#65A995]/20 flex justify-end">
              <button
                type="button"
                onClick={() => setShowArchModal(false)}
                className="min-h-[42px] px-5 py-2 rounded-lg bg-[#102D2A] dark:bg-[#65A995] text-[#F7F3E9] dark:text-[#102D2A] text-xs font-semibold"
              >
                Close Documentation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface OnboardingModalProps {
  activeRole: UserRole;
  selectedClass: NigerianClassName;
  firebaseUser: FirebaseUser | null;
  authError: string | null;
  onSelectRole: (role: UserRole) => void;
  onSelectClass: (cls: NigerianClassName) => void;
  onGoogleSignIn: () => void;
  onContinueToWorkspace: () => void;
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  activeRole,
  selectedClass,
  firebaseUser,
  authError,
  onSelectRole,
  onSelectClass,
  onGoogleSignIn,
  onContinueToWorkspace,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#FDFBF7] dark:bg-[#102D2A] border border-[#102D2A]/20 dark:border-[#65A995]/30 p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#102D2A]/15 dark:border-[#65A995]/20 pb-4">
          <div className="space-y-1">
            <div className="inline-block rounded-xl bg-[#102D2A] px-3 py-2">
              <OrionBrandLockup mode="navbar" theme="dark" />
            </div>
            <h3
              id="onboarding-modal-title"
              className="text-base font-bold text-[#102D2A] dark:text-[#F7F3E9] pt-1 font-display"
            >
              ORION Authentication & Role Onboarding
            </h3>
            <p className="text-xs text-[#102D2A]/70 dark:text-[#F7F3E9]/75">
              Select your ORION ecosystem workspace and class level, or sign in with Google to sync with Cloud Firestore
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Onboarding Modal"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg hover:bg-[#102D2A]/10 dark:hover:bg-[#F7F3E9]/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Selector */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#102D2A] dark:text-[#F7F3E9]">
            1. Choose Your ORION Ecosystem Role
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {(
              [
                {
                  id: 'student',
                  label: 'ORION Learn — Student',
                  sub: 'Primary 1–6, JSS 1–3, SSS 1–3',
                },
                {
                  id: 'independent_learner',
                  label: 'ORION Learn — Independent',
                  sub: 'Self-paced study & ORION Labs',
                },
                {
                  id: 'teacher',
                  label: 'ORION Teach — Educator',
                  sub: '12-Week Schemes & Lesson Notes',
                },
                {
                  id: 'school_admin',
                  label: 'ORION Schools — Admin',
                  sub: 'Curriculum Overlay & Approvals',
                },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectRole(r.id)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  activeRole === r.id
                    ? 'border-[#102D2A] dark:border-[#E6A65D] bg-[#102D2A] text-[#F7F3E9]'
                    : 'border-[#102D2A]/20 dark:border-[#65A995]/25 hover:bg-[#102D2A]/5 dark:hover:bg-[#143834]'
                }`}
              >
                <div
                  className={`text-xs font-semibold ${
                    activeRole === r.id
                      ? 'text-[#E6A65D]'
                      : 'text-[#102D2A] dark:text-[#F7F3E9]'
                  }`}
                >
                  {r.label}
                </div>
                <div
                  className={`text-[11px] mt-0.5 ${
                    activeRole === r.id
                      ? 'text-[#F7F3E9]/85'
                      : 'text-[#102D2A]/65 dark:text-[#F7F3E9]/65'
                  }`}
                >
                  {r.sub}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Default Class Selection */}
        <div>
          <label
            htmlFor="onboarding-class-select"
            className="block text-xs font-semibold text-[#102D2A] dark:text-[#F7F3E9] mb-1.5"
          >
            2. Default Nigerian Class Level
          </label>
          <select
            id="onboarding-class-select"
            value={selectedClass}
            onChange={(e) => onSelectClass(e.target.value as NigerianClassName)}
            className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-[#102D2A]/25 dark:border-[#65A995]/30 bg-white dark:bg-[#143834] text-xs font-semibold text-[#102D2A] dark:text-[#F7F3E9]"
          >
            {ALL_NIGERIAN_CLASSES.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Firebase Google Auth Section */}
        <div className="pt-2 border-t border-[#102D2A]/15 dark:border-[#65A995]/20 space-y-3">
          {firebaseUser ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#65A995]/15 border border-[#65A995]/40 text-xs">
              <div>
                <div className="font-semibold text-[#102D2A] dark:text-[#F7F3E9]">
                  Signed in as {firebaseUser.displayName || firebaseUser.email}
                </div>
                <div className="text-[#102D2A]/70 dark:text-[#F7F3E9]/70">
                  ORION Cloud Firestore sync active
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[#102D2A]/25 dark:border-[#65A995]/30 text-xs font-medium flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#102D2A]/25 dark:border-[#65A995]/35 hover:bg-[#102D2A]/5 dark:hover:bg-[#143834] text-xs font-semibold text-[#102D2A] dark:text-[#F7F3E9] flex items-center justify-center gap-2 transition-colors"
            >
              <LogIn className="w-4 h-4 text-[#65A995]" />
              <span>Sign In with Google (ORION Firebase Auth)</span>
            </button>
          )}

          {authError && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={onContinueToWorkspace}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#102D2A] hover:bg-[#163C38] dark:bg-[#65A995] dark:hover:bg-[#77B8A5] text-[#F7F3E9] dark:text-[#102D2A] text-xs font-semibold transition-colors"
          >
            Continue to Selected ORION Workspace
          </button>
        </div>
      </div>
    </div>
  );
};
