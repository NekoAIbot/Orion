import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  Bookmark,
  FlaskConical,
  Gamepad2,
  ClipboardCheck,
  FolderKanban,
  Award,
  Lightbulb,
  Send,
  Compass,
  AlertCircle,
} from 'lucide-react';
import {
  EducationLevelType,
  NigerianClassName,
  NigerianTerm,
  TopicRecord,
  TeacherMaterialRecord,
  StudentSkillMasteryRecord,
  StudentProjectRecord,
} from '../types/database';
import {
  EDUCATION_LEVEL_CLASSES,
  CLASS_SUBJECTS_MAP,
  ALL_TERMS,
} from '../data/nigerianCurriculumData';
import {
  getEducationLevelForClass,
  getTopicsForSelection,
} from '../utils/curriculumEngine';
import { DiscoveryLabSection } from './DiscoveryLabSection';
import { GamifiedAcademySection } from './GamifiedAcademySection';
import { postAuthenticatedAiRequest } from '../lib/firebase';
import { OrionModuleTitle } from './OrionBrandAssets';

export type StudentTabId =
  | 'overview'
  | 'library'
  | 'ai_tutor'
  | 'quizzes'
  | 'games'
  | 'lab'
  | 'projects'
  | 'progress';

interface StudentWorkspaceProps {
  selectedClass: NigerianClassName;
  onSelectClass: (cls: NigerianClassName) => void;
  isIndependentLearner: boolean;
  onToggleIndependentLearner: () => void;
  topics: TopicRecord[];
  publishedMaterials: TeacherMaterialRecord[];
  masteryRecords: StudentSkillMasteryRecord[];
  onRecordMastery: (
    className: NigerianClassName,
    subject: string,
    skillTag: string,
    score: number,
    usedHint: boolean
  ) => void;
  offlineSavedTopicIds: string[];
  onToggleOfflineTopic: (topicId: string) => void;
  projects: StudentProjectRecord[];
  onToggleProjectStep: (projectId: string, stepIndex: number) => void;
  onRequireAuth?: () => void;
  requestedTab?: StudentTabId;
  onTabChange?: (tab: StudentTabId) => void;
}

export const StudentWorkspace: React.FC<StudentWorkspaceProps> = ({
  selectedClass,
  onSelectClass,
  isIndependentLearner,
  onToggleIndependentLearner,
  topics,
  publishedMaterials,
  masteryRecords,
  onRecordMastery,
  offlineSavedTopicIds,
  onToggleOfflineTopic,
  projects,
  onToggleProjectStep,
  onRequireAuth,
  requestedTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<StudentTabId>(requestedTab || 'overview');
  const activeTab = requestedTab ?? internalTab;
  const setActiveTab = (nextTab: StudentTabId) => {
    setInternalTab(nextTab);
    onTabChange?.(nextTab);
  };
  const currentLevel: EducationLevelType = getEducationLevelForClass(selectedClass);
  const availableSubjects = CLASS_SUBJECTS_MAP[selectedClass] || ['Mathematics'];
  const [selectedSubject, setSelectedSubject] = useState<string>(availableSubjects[0]);
  const [selectedTerm, setSelectedTerm] = useState<NigerianTerm>('First Term');

  // Ensure selectedSubject is valid when class changes
  const activeSubject = availableSubjects.includes(selectedSubject)
    ? selectedSubject
    : availableSubjects[0];

  const matchingTopics = getTopicsForSelection(
    topics,
    selectedClass,
    activeSubject,
    selectedTerm
  );
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const activeTopic =
    matchingTopics.find((t) => t.topicId === selectedTopicId) || matchingTopics[0];

  // AI Tutor State
  const [tutorMode, setTutorMode] = useState<
    'hint_first' | 'step_by_step' | 'exam_prep' | 'project_guidance'
  >('hint_first');
  const [studentQuestion, setStudentQuestion] = useState<string>('');
  const [tutorMessages, setTutorMessages] = useState<
    { role: 'student' | 'tutor'; text: string; mode?: string; source?: string }[]
  >([
    {
      role: 'tutor',
      text: `Welcome to ORION Learn! I am your ORION AI Tutor. Select "Hint First" so I guide your thinking step-by-step before revealing the final answer, or ask any question on ${activeTopic.title}.`,
      mode: 'hint_first',
      source: 'curriculum_grounded_engine',
    },
  ]);
  const [tutorLoading, setTutorLoading] = useState(false);

  // Quiz State
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [showQuizHint, setShowQuizHint] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const handleClassChange = (cls: NigerianClassName) => {
    onSelectClass(cls);
    const subjs = CLASS_SUBJECTS_MAP[cls] || ['Mathematics'];
    setSelectedSubject(subjs[0]);
    setSelectedTopicId('');
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
  };

  const handleAskTutor = async (customPrompt?: string) => {
    const promptToSend = (customPrompt ?? studentQuestion).trim();
    if (!promptToSend || tutorLoading) return;

    setTutorMessages((prev) => [...prev, { role: 'student', text: promptToSend }]);
    if (!customPrompt) setStudentQuestion('');
    setTutorLoading(true);

    try {
      const learnerRole = isIndependentLearner ? 'independent_learner' : 'student';
      const result = await postAuthenticatedAiRequest<{
        reply?: string;
        source?: string;
      }>(
        '/api/ai/tutor',
        {
          className: selectedClass,
          subject: activeSubject,
          topicTitle: activeTopic.title,
          learningObjective: activeTopic.learningObjective,
          lessonSummary: activeTopic.lessonSummary,
          workedExample: activeTopic.workedExample,
          mode: tutorMode,
          studentQuestion: promptToSend,
        },
        learnerRole
      );

      if (!result.ok) {
        if (result.requiresAuth && onRequireAuth) {
          onRequireAuth();
        }
        setTutorMessages((prev) => [
          ...prev,
          {
            role: 'tutor',
            text: `${result.error}\n\nLocal Textbook Reference (${activeTopic.title}):\n${activeTopic.workedExample}\n\nHint: ${activeTopic.explanationHint}`,
            mode: tutorMode,
            source: 'auth_required_local_reference',
          },
        ]);
        return;
      }

      setTutorMessages((prev) => [
        ...prev,
        {
          role: 'tutor',
          text:
            result.data.reply ||
            'Let us review the core principle of this topic together.',
          mode: tutorMode,
          source: result.data.source,
        },
      ]);
    } catch {
      setTutorMessages((prev) => [
        ...prev,
        {
          role: 'tutor',
          text: `Offline Guided Hint (${activeTopic.title}): Review the worked example:\n${activeTopic.workedExample}\n\nHint: ${activeTopic.explanationHint}`,
          mode: tutorMode,
          source: 'offline_cache',
        },
      ]);
    } finally {
      setTutorLoading(false);
    }
  };

  const handleQuizSubmit = () => {
    if (selectedQuizOption === null) return;
    setQuizSubmitted(true);
    const isCorrect = selectedQuizOption === activeTopic.correctOptionIndex;
    onRecordMastery(
      selectedClass,
      activeSubject,
      activeTopic.skillTag,
      isCorrect ? 100 : 40,
      showQuizHint
    );
  };

  const approvedClassNotes = publishedMaterials.filter(
    (m) => m.approvalStatus === 'approved_published'
  );

  const averageMastery =
    masteryRecords.length > 0
      ? Math.round(
          masteryRecords.reduce((acc, item) => acc + item.masteryScore, 0) /
            masteryRecords.length
        )
      : 72;

  const navItems: { id: StudentTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'ORION Learn', icon: <Compass className="w-4 h-4" /> },
    { id: 'library', label: 'Digital Library', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'ai_tutor', label: 'ORION AI Tutor', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'quizzes', label: 'Quizzes & Exams', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'games', label: 'Learning Missions', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'lab', label: 'ORION Labs', icon: <FlaskConical className="w-4 h-4" /> },
    { id: 'projects', label: 'Practical Projects', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'progress', label: 'Mastery & Badges', icon: <Award className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top ORION Learn / ORION Labs Context & Class/Subject Selector Bar */}
      <div className="rounded-2xl border border-[#102D2A]/15 dark:border-[#65A995]/25 bg-[#FDFBF7] dark:bg-[#102D2A] p-5 space-y-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#102D2A]/10 dark:border-[#65A995]/20 pb-4">
          <div>
            <div className="text-xs font-medium text-[#102D2A]/75 dark:text-[#65A995]">
              <span>{activeTab === 'lab' ? 'ORION Labs · Explore • Experiment • Discover' : 'ORION Learn · Study • Practice • Excel'}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>{currentLevel} Level ({selectedClass})</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>
                {isIndependentLearner
                  ? 'Independent Self-Paced Learner Mode'
                  : 'School Enrolled Student Mode (Unity Model Academy)'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#102D2A] dark:text-[#F7F3E9] mt-1 font-display flex flex-wrap items-center gap-2">
              <OrionModuleTitle
                height={20}
                variant="monochrome"
                suffix={
                  activeTab === 'lab'
                    ? 'Labs — Interactive Science & Discovery Simulations'
                    : 'Learn — Student Learning & Discovery Workspace'
                }
                suffixColorClass="text-[#102D2A] dark:text-[#F7F3E9]"
              />
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onToggleIndependentLearner}
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Switch to {isIndependentLearner ? 'School Student Mode' : 'Independent Learner Mode'}
            </button>
          </div>
        </div>

        {/* Class, Subject & Term Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="student-class-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Class (Primary 1–6, JSS 1–3, SSS 1–3)
            </label>
            <select
              id="student-class-select"
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value as NigerianClassName)}
              className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
            >
              {(['Primary', 'JSS', 'SSS'] as EducationLevelType[]).map((lvl) => (
                <optgroup
                  key={lvl}
                  label={
                    lvl === 'Primary'
                      ? 'Primary Education (Primary 1–6)'
                      : lvl === 'JSS'
                      ? 'Junior Secondary (JSS 1–3)'
                      : 'Senior Secondary (SSS 1–3)'
                  }
                >
                  {EDUCATION_LEVEL_CLASSES[lvl].map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="student-subject-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Subject
            </label>
            <select
              id="student-subject-select"
              value={activeSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedTopicId('');
                setSelectedQuizOption(null);
                setQuizSubmitted(false);
              }}
              className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
            >
              {availableSubjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="student-term-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Academic Term
            </label>
            <select
              id="student-term-select"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value as NigerianTerm)}
              className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
            >
              {ALL_TERMS.map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Student Modules"
          className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 pt-2 pb-1"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[42px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === item.id
                  ? 'bg-[#102D2A] dark:bg-[#65A995] text-[#F7F3E9] dark:text-[#102D2A] shadow-xs'
                  : 'bg-[#EFE9DA] dark:bg-[#143834] text-[#102D2A] dark:text-[#F7F3E9]/85 hover:bg-[#E5DEC9] dark:hover:bg-[#1B4641]'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: MY LEARNING OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-xs text-slate-500 dark:text-slate-400">Active Class & Track</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {selectedClass}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                {availableSubjects.length} Core Subjects Available
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-xs text-slate-500 dark:text-slate-400">Skill Mastery Average</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {averageMastery}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Based on demonstrated understanding
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-xs text-slate-500 dark:text-slate-400">Offline Saved Lessons</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {offlineSavedTopicIds.length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pinned for zero-data study
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-xs text-slate-500 dark:text-slate-400">Approved Teacher Notes</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {approvedClassNotes.length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Verified in Digital Library
              </div>
            </div>
          </div>

          {/* Current Topic Spotlight & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  <span>Current Focus</span>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span>{activeTopic.className}</span>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span>{activeTopic.subject}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {activeTopic.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>Learning Objective:</strong> {activeTopic.learningObjective}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  {activeTopic.lessonSummary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('library')}
                  className="min-h-[42px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                >
                  Read Full Digital Lesson
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ai_tutor')}
                  className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Practice with Hint-First AI Tutor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('quizzes')}
                  className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Take Topic Quiz
                </button>
              </div>
            </div>

            {/* Adaptive Skill Mastery List */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Adaptive Skill Pathway
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">Live Mastery</span>
              </div>

              <div className="space-y-3">
                {masteryRecords.slice(0, 4).map((rec) => (
                  <div
                    key={rec.masteryId}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {rec.skillTag}
                      </span>
                      <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                        {rec.masteryScore}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${
                          rec.masteryScore >= 80
                            ? 'bg-emerald-600'
                            : rec.masteryScore >= 65
                            ? 'bg-sky-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${rec.masteryScore}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {rec.className} · {rec.subject} ·{' '}
                      {rec.status === 'mastered'
                        ? '● Mastered'
                        : rec.status === 'developing'
                        ? '● Developing'
                        : '▲ Remedial Recommended'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIGITAL LIBRARY (TEXTBOOK-FREE LEARNING + OFFLINE PINNING) */}
      {activeTab === 'library' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Topic & Teacher Note Selector */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedClass} {activeSubject} Topics
              </h3>
              <div className="space-y-2">
                {matchingTopics.map((topic) => {
                  const isSaved = offlineSavedTopicIds.includes(topic.topicId);
                  return (
                    <button
                      key={topic.topicId}
                      type="button"
                      onClick={() => setSelectedTopicId(topic.topicId)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-colors space-y-1 ${
                        activeTopic.topicId === topic.topicId
                          ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Week {topic.weekNumber}</span>
                        {isSaved && (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            Saved Offline
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {topic.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Approved Teacher Lesson Notes Published to Students */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Teacher-Approved Published Notes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Only materials reviewed and approved by teachers appear here. Draft teacher materials remain private.
              </p>
              <div className="space-y-2">
                {approvedClassNotes.map((mat) => (
                  <div
                    key={mat.materialId}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 space-y-1"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {mat.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {mat.className} · {mat.subject} · By {mat.ownerName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Textbook-Free Lesson Reader */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span>{activeTopic.country}</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span>{activeTopic.className}</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span>{activeTopic.subject}</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span>
                    {activeTopic.approvalStatus === 'approved'
                      ? 'Approved School Overlay'
                      : 'Demonstration Sample Content'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {activeTopic.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => onToggleOfflineTopic(activeTopic.topicId)}
                className={`min-h-[42px] px-4 py-2 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                  offlineSavedTopicIds.includes(activeTopic.topicId)
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>
                  {offlineSavedTopicIds.includes(activeTopic.topicId)
                    ? 'Saved for Offline Study'
                    : 'Save Lesson Offline'}
                </span>
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-900 dark:text-white mb-1">
                  Learning Objective
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {activeTopic.learningObjective}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  1. Core Concept & Explanation
                </h4>
                <p className="text-sm whitespace-pre-line">{activeTopic.lessonSummary}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  2. Step-by-Step Worked Example
                </h4>
                <pre className="p-4 rounded-xl bg-slate-950 text-emerald-300 font-mono text-xs whitespace-pre-wrap border border-slate-800">
                  {activeTopic.workedExample}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  3. Nigerian Real-World Context
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {activeTopic.nigerianContextApplication}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERSONALISED AI TUTOR (HINT-FIRST & CURRICULUM-GROUNDED) */}
      {activeTab === 'ai_tutor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                AI Tutor Pedagogical Mode
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Grounded strictly in {selectedClass} {activeSubject} ({activeTopic.title}).
              </p>
            </div>

            <div className="space-y-2">
              {(
                [
                  {
                    id: 'hint_first',
                    title: 'Hint First (Guided Socratic)',
                    desc: 'Gives a guiding hint before revealing the final answer',
                  },
                  {
                    id: 'step_by_step',
                    title: 'Step-by-Step Explanation',
                    desc: 'Breaks down worked solutions with clear reasons',
                  },
                  {
                    id: 'exam_prep',
                    title: 'Examination Prep Clinic',
                    desc: 'Common Entrance, BECE, WASSCE & NECO practice',
                  },
                  {
                    id: 'project_guidance',
                    title: 'Practical Project Guide',
                    desc: 'Hands-on experiments with local Nigerian materials',
                  },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTutorMode(m.id)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-colors ${
                    tutorMode === m.id
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    {m.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Quick Curriculum Prompts:
              </div>
              <button
                type="button"
                onClick={() =>
                  handleAskTutor(`Give me a Socratic hint to solve: ${activeTopic.assessmentPrompt}`)
                }
                className="w-full p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-left text-xs text-slate-700 dark:text-slate-200 transition-colors"
              >
                “Give me a hint on the topic assessment question without spoiling the answer”
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAskTutor(
                    `Explain the most common student misconception in ${activeTopic.title} and how to avoid it.`
                  )
                }
                className="w-full p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-left text-xs text-slate-700 dark:text-slate-200 transition-colors"
              >
                “What is the most common mistake students make in {activeTopic.title}?”
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between min-h-[460px]">
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {tutorMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'student'
                      ? 'bg-emerald-700 text-white ml-8'
                      : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] opacity-75 mb-1">
                    <span className="font-semibold">
                      {msg.role === 'student' ? `You (${selectedClass})` : 'ORION AI Tutor'}
                    </span>
                    {msg.source && (
                      <span className="font-mono">
                        {msg.source === 'gemini_live'
                          ? 'Gemini Server-Side API'
                          : 'Curriculum-Grounded Engine'}
                      </span>
                    )}
                  </div>
                  <div className="whitespace-pre-line">{msg.text}</div>
                </div>
              ))}
              {tutorLoading && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  Preparing age-appropriate guidance for {selectedClass} {activeSubject}...
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskTutor();
              }}
              className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2"
            >
              <label htmlFor="ai-tutor-input" className="sr-only">
                Ask a question or paste your working
              </label>
              <input
                id="ai-tutor-input"
                type="text"
                value={studentQuestion}
                onChange={(e) => setStudentQuestion(e.target.value)}
                placeholder={`Ask a question or show your working on ${activeTopic.title}...`}
                className="flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={tutorLoading || !studentQuestion.trim()}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: QUIZZES & EXAMINATIONS */}
      {activeTab === 'quizzes' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {activeTopic.className} · {activeTopic.subject} · Skill: {activeTopic.skillTag}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">
                Topic Mastery Assessment: {activeTopic.title}
              </h3>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {activeTopic.assessmentPrompt}
            </p>

            <div className="space-y-2.5">
              {activeTopic.assessmentOptions.map((opt, idx) => {
                const isSelected = selectedQuizOption === idx;
                const isCorrect = idx === activeTopic.correctOptionIndex;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      if (!quizSubmitted) setSelectedQuizOption(idx);
                    }}
                    className={`w-full min-h-[48px] p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition-colors flex items-center justify-between ${
                      quizSubmitted
                        ? isCorrect
                          ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200'
                          : isSelected
                          ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200'
                          : 'border-slate-200 dark:border-slate-800 opacity-60'
                        : isSelected
                        ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span>
                      <strong className="font-mono mr-2">{String.fromCharCode(65 + idx)}.</strong>
                      {opt}
                    </span>
                    {quizSubmitted && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {showQuizHint && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
                <strong>Hint Before Answering:</strong> {activeTopic.explanationHint}
              </div>
            )}

            {quizSubmitted && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {selectedQuizOption === activeTopic.correctOptionIndex
                    ? 'Correct! Skill Mastery Updated.'
                    : 'Not quite. Review the explanation and worked example:'}
                </div>
                <p className="text-slate-600 dark:text-slate-300">{activeTopic.explanationHint}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowQuizHint((prev) => !prev)}
              className="min-h-[42px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>{showQuizHint ? 'Hide Hint' : 'Show Hint First'}</span>
            </button>

            {quizSubmitted ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedQuizOption(null);
                  setQuizSubmitted(false);
                  setShowQuizHint(false);
                }}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold"
              >
                Retry Assessment
              </button>
            ) : (
              <button
                type="button"
                disabled={selectedQuizOption === null}
                onClick={handleQuizSubmit}
                className="min-h-[42px] px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold"
              >
                Submit Answer
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: LEARNING GAMES */}
      {activeTab === 'games' && (
        <GamifiedAcademySection
          onDemonstrateMastery={(skillTag, percentage, usedHint) =>
            onRecordMastery(selectedClass, activeSubject, skillTag, percentage, usedHint)
          }
        />
      )}

      {/* TAB 6: VIRTUAL DISCOVERY LAB */}
      {activeTab === 'lab' && (
        <DiscoveryLabSection
          onCompleteMission={(skillTag, score) =>
            onRecordMastery(selectedClass, activeSubject, skillTag, score, false)
          }
        />
      )}

      {/* TAB 7: PRACTICAL PROJECTS */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((proj) => (
            <div
              key={proj.projectId}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
            >
              <div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  {proj.className} · {proj.subject} · {proj.practicalSkillFocus}
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-1">
                  {proj.title}
                </h3>
              </div>

              <div className="space-y-2">
                {proj.milestoneSteps.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onToggleProjectStep(proj.projectId, idx)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-left text-xs flex items-start gap-2.5 hover:border-emerald-500 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={m.completed}
                      readOnly
                      className="mt-0.5 accent-emerald-600"
                    />
                    <span
                      className={
                        m.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200'
                      }
                    >
                      {m.step}
                    </span>
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <strong>Student Reflection:</strong> {proj.reflectionNotes}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 8: PROGRESS & ACHIEVEMENTS */}
      {activeTab === 'progress' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Demonstrated Skill Mastery & Remedial Status
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-3 font-semibold">Skill Tag</th>
                  <th className="py-3 px-3 font-semibold">Class & Subject</th>
                  <th className="py-3 px-3 font-semibold text-right">Attempts</th>
                  <th className="py-3 px-3 font-semibold text-right">Mastery Score</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {masteryRecords.map((rec) => (
                  <tr key={rec.masteryId}>
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                      {rec.skillTag}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {rec.className} · {rec.subject}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {rec.attemptsCount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                      {rec.masteryScore}%
                    </td>
                    <td className="py-3 px-3">
                      {rec.status === 'mastered' && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          ● Mastered (≥80%)
                        </span>
                      )}
                      {rec.status === 'developing' && (
                        <span className="text-sky-700 dark:text-sky-400 font-medium">
                          ● Developing (65–79%)
                        </span>
                      )}
                      {rec.status === 'needs_remedial' && (
                        <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Needs Remedial (&lt;65%)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
