import React, { useState } from 'react';
import {
  GraduationCap,
  ArrowRight,
  Layers,
  ShieldCheck,
  Sparkles,
  Lightbulb,
  TrendingUp,
  Users,
  Star,
} from 'lucide-react';
import {
  EducationLevelType,
  NigerianClassName,
  TopicRecord,
  UserRole,
} from '../types/database';
import {
  EDUCATION_LEVEL_CLASSES,
  CLASS_SUBJECTS_MAP,
} from '../data/nigerianCurriculumData';
import { getTopicsForSelection } from '../utils/curriculumEngine';
import { StudentTabId } from './StudentWorkspace';
import {
  OrionBrandLockup,
  OrionWordmark,
  OrionModuleBadgeIcon,
  OrionGoldSwoosh,
  ORION_BRAND,
} from './OrionBrandAssets';

interface LandingViewProps {
  topics: TopicRecord[];
  onEnterWorkspace: (
    role: UserRole,
    selectedClass?: NigerianClassName,
    studentTab?: StudentTabId
  ) => void;
  onOpenAuthModal: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  topics,
  onEnterWorkspace,
  onOpenAuthModal,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<EducationLevelType>('JSS');
  const [selectedClass, setSelectedClass] = useState<NigerianClassName>('JSS 2');
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathematics');

  const classesForLevel = EDUCATION_LEVEL_CLASSES[selectedLevel];
  const subjectsForClass = CLASS_SUBJECTS_MAP[selectedClass] || ['Mathematics'];
  const previewTopics = getTopicsForSelection(topics, selectedClass, selectedSubject);
  const activePreviewTopic = previewTopics[0];

  const handleSelectLevel = (level: EducationLevelType) => {
    setSelectedLevel(level);
    const firstClass = EDUCATION_LEVEL_CLASSES[level][0];
    setSelectedClass(firstClass);
    const firstSubj = CLASS_SUBJECTS_MAP[firstClass]?.[0] || 'Mathematics';
    setSelectedSubject(firstSubj);
  };

  const handleSelectClass = (cls: NigerianClassName) => {
    setSelectedClass(cls);
    const availableSubjects = CLASS_SUBJECTS_MAP[cls] || ['Mathematics'];
    if (!availableSubjects.includes(selectedSubject)) {
      setSelectedSubject(availableSubjects[0]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F3E9] dark:bg-[#0A1F1D] text-[#102D2A] dark:text-[#F7F3E9]">
      {/* Official ORION Forest Green Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#102D2A] text-[#F7F3E9] border-b border-[#65A995]/25 shadow-md">
        {/* Zone 1: Official ORION Lockup (First Dark-Themed Icon + Paul Laxa ORION Wordmark + Tagline) */}
        <a
          href="#top"
          aria-label="ORION — Discover beyond what you know"
          className="shrink-0 focus:outline-none"
        >
          <OrionBrandLockup mode="navbar" theme="dark" />
        </a>

        {/* Zone 2: 4 Concise Single-Line Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#F7F3E9]/85"
        >
          <a
            href="#orion-ecosystem"
            className="hover:text-[#E6A65D] transition-colors whitespace-nowrap shrink-0"
          >
            ORION Ecosystem
          </a>
          <a
            href="#curriculum-engine"
            className="hover:text-[#E6A65D] transition-colors whitespace-nowrap shrink-0"
          >
            Curriculum Engine
          </a>
          <button
            type="button"
            onClick={() => onEnterWorkspace('student', selectedClass, 'lab')}
            className="hover:text-[#E6A65D] transition-colors whitespace-nowrap shrink-0"
          >
            ORION Labs
          </button>
          <a
            href="#architecture"
            className="hover:text-[#E6A65D] transition-colors whitespace-nowrap shrink-0"
          >
            Architecture
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold text-[#102D2A] bg-[#65A995] hover:bg-[#78B9A6] rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            Sign In / Select Role
          </button>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* AUTHORITATIVE ORION HERO BRAND LOCKUP & ECOSYSTEM LAUNCHPAD */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 space-y-8">
          {/* Top Authoritative Brand Reference Banner: Icon | ORION Wordmark + Tagline | Positioning */}
          <OrionBrandLockup mode="hero" />

          {/* Four Official ORION Ecosystem Module Cards (ORION Learn, ORION Teach, ORION Schools, ORION Labs) */}
          <div id="orion-ecosystem" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#102D2A]/75 dark:text-[#65A995]">
                  Official ORION Learning Ecosystem · Primary 1–6 · JSS 1–3 · SSS 1–3
                </div>
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#102D2A] dark:text-[#F7F3E9] mt-1 font-display">
                  One Intelligent Learning Ecosystem for Nigeria and Beyond
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#102D2A]/75 dark:text-[#F7F3E9]/80 max-w-md">
                Select any ORION module below to enter the live workspace directly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. ORION Learn */}
              <button
                type="button"
                onClick={() => onEnterWorkspace('student', selectedClass, 'overview')}
                className="group rounded-2xl bg-[#102D2A] hover:bg-[#143834] border border-[#65A995]/35 p-6 text-center text-[#F7F3E9] transition-all shadow-md flex flex-col items-center justify-between min-h-[230px]"
              >
                <div className="flex flex-col items-center">
                  <OrionModuleBadgeIcon module="learn" size={64} />
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <OrionWordmark height={19} variant="ivory" />
                    <span className="text-lg font-bold text-[#E6A65D] font-display">
                      Learn
                    </span>
                  </div>
                  <div className="text-xs font-medium text-[#F7F3E9]/90 mt-1.5 tracking-wide">
                    {ORION_BRAND.modules.learn.pillars}
                  </div>
                  <p className="text-[11px] text-[#F7F3E9]/70 mt-2 leading-relaxed">
                    Digital library, Socratic Hint-First AI Tutor, quizzes & learning missions
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#65A995] group-hover:text-[#E6A65D] transition-colors">
                  <span>Enter ORION Learn</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>

              {/* 2. ORION Teach */}
              <button
                type="button"
                onClick={() => onEnterWorkspace('teacher', selectedClass)}
                className="group rounded-2xl bg-[#102D2A] hover:bg-[#143834] border border-[#65A995]/35 p-6 text-center text-[#F7F3E9] transition-all shadow-md flex flex-col items-center justify-between min-h-[230px]"
              >
                <div className="flex flex-col items-center">
                  <OrionModuleBadgeIcon module="teach" size={64} />
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <OrionWordmark height={19} variant="ivory" />
                    <span className="text-lg font-bold text-[#E6A65D] font-display">
                      Teach
                    </span>
                  </div>
                  <div className="text-xs font-medium text-[#F7F3E9]/90 mt-1.5 tracking-wide">
                    {ORION_BRAND.modules.teach.pillars}
                  </div>
                  <p className="text-[11px] text-[#F7F3E9]/70 mt-2 leading-relaxed">
                    12-Week Term Schemes of Work, Lesson Note Generator & Skill-Gap Clinic
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#65A995] group-hover:text-[#E6A65D] transition-colors">
                  <span>Enter ORION Teach</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>

              {/* 3. ORION Schools */}
              <button
                type="button"
                onClick={() => onEnterWorkspace('school_admin', selectedClass)}
                className="group rounded-2xl bg-[#102D2A] hover:bg-[#143834] border border-[#65A995]/35 p-6 text-center text-[#F7F3E9] transition-all shadow-md flex flex-col items-center justify-between min-h-[230px]"
              >
                <div className="flex flex-col items-center">
                  <OrionModuleBadgeIcon module="schools" size={64} />
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <OrionWordmark height={19} variant="ivory" />
                    <span className="text-lg font-bold text-[#E6A65D] font-display">
                      Schools
                    </span>
                  </div>
                  <div className="text-xs font-medium text-[#F7F3E9]/90 mt-1.5 tracking-wide">
                    {ORION_BRAND.modules.schools.pillars}
                  </div>
                  <p className="text-[11px] text-[#F7F3E9]/70 mt-2 leading-relaxed">
                    11-Tier Curriculum Engine, custom school overlays, approvals & analytics
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#65A995] group-hover:text-[#E6A65D] transition-colors">
                  <span>Enter ORION Schools</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>

              {/* 4. ORION Labs */}
              <button
                type="button"
                onClick={() => onEnterWorkspace('student', selectedClass, 'lab')}
                className="group rounded-2xl bg-[#102D2A] hover:bg-[#143834] border border-[#65A995]/35 p-6 text-center text-[#F7F3E9] transition-all shadow-md flex flex-col items-center justify-between min-h-[230px]"
              >
                <div className="flex flex-col items-center">
                  <OrionModuleBadgeIcon module="labs" size={64} />
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <OrionWordmark height={19} variant="ivory" />
                    <span className="text-lg font-bold text-[#E6A65D] font-display">
                      Labs
                    </span>
                  </div>
                  <div className="text-xs font-medium text-[#F7F3E9]/90 mt-1.5 tracking-wide">
                    {ORION_BRAND.modules.labs.pillars}
                  </div>
                  <p className="text-[11px] text-[#F7F3E9]/70 mt-2 leading-relaxed">
                    Interactive Chemistry stoichiometry, Physics circuits & Biology simulations
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#65A995] group-hover:text-[#E6A65D] transition-colors">
                  <span>Enter ORION Labs</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            </div>
          </div>

          {/* Editorial Overview & Pathway Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2">
            {/* Left Column: Mission & Independent Learner Access */}
            <div className="lg:col-span-7 rounded-2xl border border-[#102D2A]/15 dark:border-[#65A995]/25 bg-[#FDFBF7] dark:bg-[#102D2A] p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="text-xs font-semibold text-[#102D2A] dark:text-[#65A995]">
                  <span>Primary 1–6</span>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span>Junior Secondary (JSS 1–3)</span>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span>Senior Secondary (SSS 1–3)</span>
                </div>

                <h2
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102D2A] dark:text-[#F7F3E9] leading-tight font-display"
                  style={{ textWrap: 'balance' }}
                >
                  Master Every Subject Without Depending on Expensive Physical Textbooks.
                </h2>

                <p className="text-sm sm:text-base text-[#102D2A]/80 dark:text-[#F7F3E9]/85 leading-relaxed">
                  ORION unites a structured 11-tier Nigerian curriculum engine, a Socratic Hint-First AI tutor in <strong>ORION Learn</strong>, 12-week scheme of work and lesson note generators in <strong>ORION Teach</strong>, school-wide mastery governance in <strong>ORION Schools</strong>, and interactive science simulations in <strong>ORION Labs</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onEnterWorkspace('student', selectedClass, 'overview')}
                  className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#102D2A] hover:bg-[#163C38] dark:bg-[#65A995] dark:hover:bg-[#78B9A6] text-[#F7F3E9] dark:text-[#102D2A] text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <span>Launch ORION Learn ({selectedClass})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onEnterWorkspace('independent_learner', selectedClass, 'overview')}
                  className="min-h-[46px] px-5 py-2.5 rounded-xl border border-[#102D2A]/30 dark:border-[#65A995]/40 hover:bg-[#102D2A]/5 dark:hover:bg-[#143834] text-xs sm:text-sm font-semibold text-[#102D2A] dark:text-[#F7F3E9] transition-colors"
                >
                  Independent Self-Study Mode
                </button>
              </div>
            </div>

            {/* Right Column: ORION Adaptive Pathway Stage */}
            <div className="lg:col-span-5 rounded-2xl border border-[#65A995]/30 bg-[#102D2A] text-[#F7F3E9] p-6 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#65A995] font-mono">
                  <span>ORION CURRICULUM ENGINE</span>
                  <span>12 CLASSES</span>
                </div>
                <h3 className="text-lg font-bold text-[#F7F3E9] font-display">
                  Structured from Primary 1 to Senior Secondary 3
                </h3>
                <p className="text-xs text-[#F7F3E9]/80 leading-relaxed">
                  Every topic connects Learning Objectives, Textbook-Free Lesson Notes, Worked Nigerian Examples, Socratic Assessments, and Measurable Skills.
                </p>
              </div>

              {/* Custom Vector Illustration of ORION Nigerian Learning Pathway */}
              <div className="my-4 rounded-xl bg-[#0A1F1D] border border-[#65A995]/25 p-4">
                <svg
                  className="w-full h-40"
                  viewBox="0 0 360 165"
                  role="img"
                  aria-label="ORION Primary, JSS, and SSS Adaptive Learning Pathway Illustration"
                >
                  <line x1="20" y1="138" x2="340" y2="138" stroke="#1E4641" strokeWidth="2" />
                  <line x1="20" y1="94" x2="340" y2="94" stroke="#1E4641" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="20" y1="50" x2="340" y2="50" stroke="#1E4641" strokeWidth="1" strokeDasharray="4 4" />

                  {/* Stage 1: Primary 1-6 */}
                  <rect x="24" y="86" width="90" height="52" rx="8" fill="#102D2A" stroke="#65A995" strokeWidth="2" />
                  <text x="34" y="106" fill="#65A995" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    PRIMARY 1–6
                  </text>
                  <text x="34" y="122" fill="#F7F3E9" fontSize="9" fontFamily="sans-serif">
                    Numeracy & Literacy
                  </text>

                  {/* Stage 2: JSS 1-3 */}
                  <rect x="135" y="58" width="90" height="80" rx="8" fill="#143834" stroke="#65A995" strokeWidth="2" />
                  <text x="154" y="80" fill="#65A995" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    JSS 1–3
                  </text>
                  <text x="145" y="98" fill="#F7F3E9" fontSize="9" fontFamily="sans-serif">
                    Basic Science & Tech
                  </text>
                  <text x="145" y="114" fill="#E6A65D" fontSize="9" fontFamily="sans-serif">
                    BECE / JSCE Ready
                  </text>

                  {/* Stage 3: SSS 1-3 */}
                  <rect x="246" y="26" width="90" height="112" rx="8" fill="#102D2A" stroke="#E6A65D" strokeWidth="2" />
                  <text x="265" y="48" fill="#E6A65D" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    SSS 1–3
                  </text>
                  <text x="256" y="66" fill="#F7F3E9" fontSize="9" fontFamily="sans-serif">
                    STEM, Humanities
                  </text>
                  <text x="256" y="82" fill="#F7F3E9" fontSize="9" fontFamily="sans-serif">
                    & Business Tracks
                  </text>
                  <text x="256" y="102" fill="#E6A65D" fontSize="9" fontFamily="monospace">
                    WASSCE / NECO
                  </text>

                  {/* Connecting Discovery Gold Pathway Curve */}
                  <path
                    d="M69 86 Q 120 44 180 58 T 291 26"
                    fill="none"
                    stroke="#E6A65D"
                    strokeWidth="2.5"
                  />
                  <circle cx="69" cy="86" r="4" fill="#65A995" />
                  <circle cx="180" cy="58" r="4" fill="#65A995" />
                  <circle cx="291" cy="26" r="5" fill="#E6A65D" />
                </svg>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-[#65A995]/20">
                <div>
                  <div className="text-lg font-bold font-mono tabular-nums text-[#F7F3E9]">
                    11 Tiers
                  </div>
                  <div className="text-xs text-[#F7F3E9]/70">Curriculum Tree</div>
                </div>
                <div>
                  <div className="text-lg font-bold font-mono tabular-nums text-[#65A995]">
                    12 Weeks
                  </div>
                  <div className="text-xs text-[#F7F3E9]/70">Term Schemes</div>
                </div>
                <div>
                  <div className="text-lg font-bold font-mono tabular-nums text-[#E6A65D]">
                    Offline
                  </div>
                  <div className="text-xs text-[#F7F3E9]/70">PWA Library</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE 11-LEVEL CURRICULUM HIERARCHY EXPLORER */}
        <section
          id="curriculum-engine"
          className="border-t border-[#102D2A]/15 dark:border-[#65A995]/20 bg-[#FDFBF7] dark:bg-[#102D2A] py-14"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-[#102D2A] dark:text-[#65A995] uppercase tracking-wider">
                  01. Flexible Curriculum Engine
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#102D2A] dark:text-[#F7F3E9] mt-1 font-display">
                  Explore the 11-Tier ORION Curriculum Hierarchy
                </h2>
                <p className="text-sm text-[#102D2A]/75 dark:text-[#F7F3E9]/80 mt-1 max-w-2xl">
                  Curriculum is stored as structured data — never hardcoded. Schools can use the built-in Nigerian structure, upload custom curricula, or run a hybrid overlay without ever overwriting the platform-wide curriculum.
                </p>
              </div>

              {/* Education Level Selector */}
              <div className="flex items-center gap-1 p-1 bg-[#EFE9DA] dark:bg-[#0A1F1D] rounded-xl self-start border border-[#102D2A]/10 dark:border-[#65A995]/20">
                {(['Primary', 'JSS', 'SSS'] as EducationLevelType[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleSelectLevel(lvl)}
                    className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      selectedLevel === lvl
                        ? 'bg-[#102D2A] dark:bg-[#65A995] text-[#F7F3E9] dark:text-[#102D2A] shadow-xs'
                        : 'text-[#102D2A]/75 dark:text-[#F7F3E9]/75 hover:text-[#102D2A] dark:hover:text-[#F7F3E9]'
                    }`}
                  >
                    {lvl === 'Primary' ? 'Primary 1–6' : lvl === 'JSS' ? 'JSS 1–3' : 'SSS 1–3'}
                  </button>
                ))}
              </div>
            </div>

            {/* 11-Tier Breadcrumb Chain Visualization */}
            <div className="p-4 rounded-xl bg-[#F7F3E9] dark:bg-[#0A1F1D] border border-[#102D2A]/15 dark:border-[#65A995]/25 text-xs text-[#102D2A]/80 dark:text-[#F7F3E9]/85 leading-relaxed">
              <strong className="text-[#102D2A] dark:text-[#E6A65D] mr-2">
                Active Hierarchy Path:
              </strong>
              <span>Country (Nigeria)</span>
              <span className="mx-1.5 opacity-50">→</span>
              <span>Curriculum ({activePreviewTopic.curriculumVersion})</span>
              <span className="mx-1.5 opacity-50">→</span>
              <span>Education Level ({selectedLevel})</span>
              <span className="mx-1.5 opacity-50">→</span>
              <span className="font-semibold text-[#102D2A] dark:text-[#65A995]">
                {selectedClass}
              </span>
              <span className="mx-1.5 opacity-50">→</span>
              <span className="font-semibold text-[#102D2A] dark:text-[#65A995]">
                {selectedSubject}
              </span>
              <span className="mx-1.5 opacity-50">→</span>
              <span>{activePreviewTopic.term}</span>
              <span className="mx-1.5 opacity-50">→</span>
              <span>Topic (Week {activePreviewTopic.weekNumber})</span>
              <span className="mx-1.5 opacity-50">→</span>
              <span>Objective</span>
              <span className="mx-1.5 opacity-50">→</span>
              <span>Lesson</span>
              <span className="mx-1.5 opacity-50">→</span>
              <span>Assessment</span>
              <span className="mx-1.5 opacity-50">→</span>
              <span>Skill ({activePreviewTopic.skillTag})</span>
            </div>

            {/* Class & Subject Selector Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-[#102D2A] dark:text-[#F7F3E9] mb-2">
                    Select Class ({selectedLevel})
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {classesForLevel.map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => handleSelectClass(cls)}
                        className={`min-h-[42px] px-3 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                          selectedClass === cls
                            ? 'border-[#102D2A] dark:border-[#E6A65D] bg-[#102D2A] text-[#F7F3E9]'
                            : 'border-[#102D2A]/20 dark:border-[#65A995]/25 bg-[#F7F3E9] dark:bg-[#0A1F1D] text-[#102D2A] dark:text-[#F7F3E9]'
                        }`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-[#102D2A] dark:text-[#F7F3E9] mb-2">
                    Select Subject ({selectedClass})
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {subjectsForClass.map((subj) => (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => setSelectedSubject(subj)}
                        className={`min-h-[40px] px-3.5 py-2 rounded-lg text-left text-xs font-medium transition-colors flex items-center justify-between ${
                          selectedSubject === subj
                            ? 'bg-[#102D2A] dark:bg-[#65A995] text-[#F7F3E9] dark:text-[#102D2A] font-semibold'
                            : 'bg-[#F7F3E9] dark:bg-[#0A1F1D] text-[#102D2A] dark:text-[#F7F3E9] hover:bg-[#EFE9DA] dark:hover:bg-[#143834]'
                        }`}
                      >
                        <span>{subj}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-75" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Topic & Lesson Node Preview */}
              <div className="lg:col-span-8 rounded-2xl border border-[#102D2A]/15 dark:border-[#65A995]/25 bg-[#F7F3E9] dark:bg-[#0A1F1D] p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#102D2A]/10 dark:border-[#65A995]/20 pb-4">
                  <div className="text-xs text-[#102D2A]/70 dark:text-[#F7F3E9]/70">
                    <span>{activePreviewTopic.className}</span>
                    <span className="mx-2" aria-hidden="true">·</span>
                    <span>{activePreviewTopic.subject}</span>
                    <span className="mx-2" aria-hidden="true">·</span>
                    <span>
                      {activePreviewTopic.term} (Week {activePreviewTopic.weekNumber})
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#102D2A] dark:text-[#E6A65D]">
                    {activePreviewTopic.approvalStatus === 'sample_unverified'
                      ? 'Sample Curriculum Node (Unverified Official Source)'
                      : 'School Approved Curriculum Overlay'}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#102D2A] dark:text-[#F7F3E9] font-display">
                    {activePreviewTopic.title}
                  </h3>
                  <p className="text-xs text-[#102D2A]/80 dark:text-[#F7F3E9]/85 mt-1.5">
                    <strong>Learning Objective:</strong> {activePreviewTopic.learningObjective}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#FDFBF7] dark:bg-[#102D2A] border border-[#102D2A]/15 dark:border-[#65A995]/25 space-y-1.5">
                    <div className="text-xs font-semibold text-[#102D2A] dark:text-[#E6A65D]">
                      ORION Learn — Digital Lesson Summary
                    </div>
                    <p className="text-xs text-[#102D2A]/80 dark:text-[#F7F3E9]/85 leading-relaxed">
                      {activePreviewTopic.lessonSummary}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FDFBF7] dark:bg-[#102D2A] border border-[#102D2A]/15 dark:border-[#65A995]/25 space-y-1.5">
                    <div className="text-xs font-semibold text-[#102D2A] dark:text-[#E6A65D]">
                      Worked Example & Nigerian Context
                    </div>
                    <pre className="text-xs font-mono text-[#102D2A] dark:text-[#65A995] whitespace-pre-wrap">
                      {activePreviewTopic.workedExample}
                    </pre>
                    <p className="text-xs text-[#102D2A]/70 dark:text-[#F7F3E9]/70 pt-1">
                      <strong>Local Application:</strong>{' '}
                      {activePreviewTopic.nigerianContextApplication}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="text-xs text-[#102D2A]/75 dark:text-[#F7F3E9]/75">
                    Target Skill Tag:{' '}
                    <strong className="text-[#102D2A] dark:text-[#E6A65D]">
                      {activePreviewTopic.skillTag}
                    </strong>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onEnterWorkspace('student', selectedClass, 'overview')}
                      className="min-h-[42px] px-4 py-2 rounded-lg bg-[#102D2A] hover:bg-[#163C38] dark:bg-[#65A995] dark:hover:bg-[#78B9A6] text-[#F7F3E9] dark:text-[#102D2A] text-xs font-semibold transition-colors"
                    >
                      Study {selectedClass} in ORION Learn
                    </button>
                    <button
                      type="button"
                      onClick={() => onEnterWorkspace('teacher', selectedClass)}
                      className="min-h-[42px] px-4 py-2 rounded-lg border border-[#102D2A]/30 dark:border-[#65A995]/35 text-xs font-semibold text-[#102D2A] dark:text-[#F7F3E9] hover:bg-[#102D2A]/5 dark:hover:bg-[#143834] transition-colors"
                    >
                      Generate {selectedClass} Lesson in ORION Teach
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ARCHITECTURE & CURRICULUM INTEGRITY TRANSPARENCY */}
        <section
          id="architecture"
          className="border-t border-[#102D2A]/15 dark:border-[#65A995]/20 bg-[#F7F3E9] dark:bg-[#0A1F1D] py-14"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div>
              <div className="text-xs font-semibold text-[#102D2A] dark:text-[#65A995] uppercase tracking-wider">
                02. Engineering Integrity & Transparency
              </div>
              <h2 className="text-2xl font-bold text-[#102D2A] dark:text-[#F7F3E9] mt-1 font-display">
                Honest Curriculum Verification & Zero-Trust Isolation
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-[#102D2A]/80 dark:text-[#F7F3E9]/85">
              <div className="p-5 rounded-xl border border-[#102D2A]/15 dark:border-[#65A995]/25 bg-[#FDFBF7] dark:bg-[#102D2A] space-y-2">
                <div className="flex items-center gap-2 font-semibold text-[#102D2A] dark:text-[#F7F3E9] text-sm font-display">
                  <Layers className="w-4 h-4 text-[#65A995]" />
                  <span>Demonstration vs. Official Verification</span>
                </div>
                <p className="leading-relaxed">
                  Built-in topics are explicitly labeled as <strong>Demonstration Sample Structure</strong> (`sample_unverified`). ORION never claims the entire official NERDC curriculum has been imported until official source documents are uploaded and approved by curriculum reviewers.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-[#102D2A]/15 dark:border-[#65A995]/25 bg-[#FDFBF7] dark:bg-[#102D2A] space-y-2">
                <div className="flex items-center gap-2 font-semibold text-[#102D2A] dark:text-[#F7F3E9] text-sm font-display">
                  <ShieldCheck className="w-4 h-4 text-[#65A995]" />
                  <span>Platform Curriculum Immutability</span>
                </div>
                <p className="leading-relaxed">
                  Firestore Security Rules and our pure `mergeSchoolCurriculumOverlay` engine enforce strict tenant boundaries: a school’s custom curriculum (`isPlatformWide: false`) can never overwrite or mutate the platform-wide Nigerian curriculum.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-[#102D2A]/15 dark:border-[#65A995]/25 bg-[#FDFBF7] dark:bg-[#102D2A] space-y-2">
                <div className="flex items-center gap-2 font-semibold text-[#102D2A] dark:text-[#F7F3E9] text-sm font-display">
                  <Sparkles className="w-4 h-4 text-[#E6A65D]" />
                  <span>Server-Side Gemini AI & Offline PWA</span>
                </div>
                <p className="leading-relaxed">
                  All Gemini API calls execute strictly on the Node.js server (`/api/ai/*`) with verified Firebase ID tokens and zero client-side key exposure. Progressive Web App service workers and local lesson pinning keep ORION accessible on low-data networks.
                </p>
              </div>
            </div>

            {/* Official 5 Brand Pillars Strip from the bottom of the Reference Image */}
            <div className="mt-8 rounded-2xl bg-[#102D2A] border border-[#65A995]/30 px-6 py-4 text-[#F7F3E9]">
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#F7F3E9]" />
                  <span>Quality Education</span>
                </div>
                <span className="hidden sm:inline text-[#F7F3E9]/30">|</span>
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#E6A65D]" />
                  <span>Intelligent Learning</span>
                </div>
                <span className="hidden sm:inline text-[#F7F3E9]/30">|</span>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#E6A65D]" />
                  <span>Measurable Progress</span>
                </div>
                <span className="hidden sm:inline text-[#F7F3E9]/30">|</span>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#E6A65D]" />
                  <span>Inclusive Access</span>
                </div>
                <span className="hidden sm:inline text-[#F7F3E9]/30">|</span>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#E6A65D]" />
                  <span>A Brighter Future</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#65A995]/25 py-6 px-6 bg-[#102D2A] text-xs text-[#F7F3E9]/80">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <OrionWordmark height={16} variant="ivory" />
            <span>— Discover beyond what you know. · Primary 1–6 · JSS 1–3 · SSS 1–3</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#E6A65D] font-medium">Learn. Teach. Grow.</span>
            <span aria-hidden="true">·</span>
            <span>NERDC / WASSCE / BECE Aligned Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
