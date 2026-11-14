import React, { useState } from 'react';
import {
  Building2,
  Layers,
  CheckCircle2,
  Plus,
  GitCompare,
  BarChart3,
  Shield,
  Upload,
} from 'lucide-react';
import {
  NigerianClassName,
  NigerianTerm,
  SchoolRecord,
  CurriculumRecord,
  TopicRecord,
  TeacherMaterialRecord,
  StudentSkillMasteryRecord,
} from '../types/database';
import {
  ALL_NIGERIAN_CLASSES,
  CLASS_SUBJECTS_MAP,
  ALL_TERMS,
} from '../data/nigerianCurriculumData';
import {
  getEducationLevelForClass,
  compareCurriculumVersions,
  identifySkillGaps,
} from '../utils/curriculumEngine';
import { OrionModuleTitle } from './OrionBrandAssets';

type AdminTabId =
  | 'school_settings'
  | 'curriculum_admin'
  | 'version_compare'
  | 'approvals_analytics'
  | 'permissions';

interface SchoolAdminWorkspaceProps {
  school: SchoolRecord;
  onUpdateSchool: (updated: SchoolRecord) => void;
  curricula: CurriculumRecord[];
  platformTopics: TopicRecord[];
  schoolCustomTopics: TopicRecord[];
  onAddCustomTopic: (newTopic: TopicRecord) => void;
  teacherMaterials: TeacherMaterialRecord[];
  onUpdateMaterialStatus: (
    materialId: string,
    status: 'draft' | 'pending_approval' | 'approved_published'
  ) => void;
  masteryRecords: StudentSkillMasteryRecord[];
}

export const SchoolAdminWorkspace: React.FC<SchoolAdminWorkspaceProps> = ({
  school,
  onUpdateSchool,
  curricula,
  platformTopics,
  schoolCustomTopics,
  onAddCustomTopic,
  teacherMaterials,
  onUpdateMaterialStatus,
  masteryRecords,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabId>('curriculum_admin');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // School Profile Form State
  const [schoolName, setSchoolName] = useState(school.name);
  const [schoolState, setSchoolState] = useState(school.state);
  const [schoolLga, setSchoolLga] = useState(school.lga);
  const [activeSession, setActiveSession] = useState(school.activeSession);
  const [activeTerm, setActiveTerm] = useState<NigerianTerm>(school.activeTerm);
  const [curriculumMode, setCurriculumMode] = useState<'built_in' | 'custom' | 'hybrid'>(
    school.curriculumMode
  );

  // Add Custom School Topic Form State
  const [newTopicClass, setNewTopicClass] = useState<NigerianClassName>('JSS 2');
  const [newTopicSubject, setNewTopicSubject] = useState<string>('Computer Studies (ICT)');
  const [newTopicTerm, setNewTopicTerm] = useState<NigerianTerm>('First Term');
  const [newTopicWeek, setNewTopicWeek] = useState<number>(5);
  const [newTopicTitle, setNewTopicTitle] = useState<string>('');
  const [newTopicObjective, setNewTopicObjective] = useState<string>('');
  const [newTopicSummary, setNewTopicSummary] = useState<string>('');
  const [newTopicSkill, setNewTopicSkill] = useState<string>('');

  // Compare Filter
  const [compareClass, setCompareClass] = useState<NigerianClassName>('JSS 2');
  const comparison = compareCurriculumVersions(
    platformTopics,
    schoolCustomTopics,
    compareClass
  );

  const skillGaps = identifySkillGaps(masteryRecords, [
    ...platformTopics,
    ...schoolCustomTopics,
  ]);

  const handleSaveSchoolSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) return;
    onUpdateSchool({
      ...school,
      name: schoolName.trim(),
      state: schoolState.trim(),
      lga: schoolLga.trim(),
      activeSession: activeSession.trim(),
      activeTerm,
      curriculumMode,
      updatedAt: new Date().toISOString(),
    });
    setStatusMessage(
      `Saved school configuration (${curriculumMode.toUpperCase()} curriculum mode, ${activeSession} — ${activeTerm}).`
    );
  };

  const handleCreateCustomTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !newTopicObjective.trim()) return;

    const level = getEducationLevelForClass(newTopicClass);
    const created: TopicRecord = {
      topicId: `top_school_custom_${Date.now()}`,
      curriculumId: 'curr_school_unity_overlay',
      country: 'Nigeria',
      curriculumName: `${school.name} Custom Curriculum Overlay`,
      curriculumVersion: 'v1.2-school',
      educationLevel: level,
      className: newTopicClass,
      subject: newTopicSubject.trim() || 'STEM Enrichment',
      term: newTopicTerm,
      weekNumber: newTopicWeek,
      title: newTopicTitle.trim(),
      learningObjective: newTopicObjective.trim(),
      lessonSummary:
        newTopicSummary.trim() ||
        `School-specific curriculum topic added by ${school.name} for ${newTopicClass} ${newTopicSubject}.`,
      workedExample: `Applied school practicum for ${newTopicTitle.trim()}.`,
      nigerianContextApplication: `Configured specifically for ${school.name} (${school.state}).`,
      assessmentPrompt: `Which core principle is emphasized in "${newTopicTitle.trim()}"?`,
      assessmentOptions: [
        newTopicObjective.trim(),
        'Unverified guesswork',
        'Ignoring practical measurements',
        'Skipping safety steps',
      ],
      correctOptionIndex: 0,
      explanationHint: `Recall the school learning objective: ${newTopicObjective.trim()}`,
      skillTag: newTopicSkill.trim() || `${newTopicSubject} Custom Competency`,
      schoolId: school.schoolId,
      isPlatformWide: false, // Strictly isolated to school overlay; never overwrites platform curriculum
      approvalStatus: 'approved',
      ownerId: school.ownerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAddCustomTopic(created);
    setNewTopicTitle('');
    setNewTopicObjective('');
    setNewTopicSummary('');
    setNewTopicSkill('');
    setStatusMessage(
      `Added custom school topic "${created.title}" to ${created.className} (${created.subject}) overlay without modifying the platform-wide Nigerian curriculum.`
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top ORION Schools Header */}
      <div className="rounded-2xl border border-[#102D2A]/15 dark:border-[#65A995]/25 bg-[#FDFBF7] dark:bg-[#102D2A] p-5 space-y-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#102D2A]/10 dark:border-[#65A995]/20 pb-4">
          <div>
            <div className="text-xs font-medium text-[#102D2A]/75 dark:text-[#65A995]">
              <span>ORION Schools · Manage • Monitor • Improve</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>{school.name}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>
                Mode:{' '}
                {school.curriculumMode === 'hybrid'
                  ? 'Hybrid (Nigerian Built-In + School Overlay)'
                  : school.curriculumMode === 'built_in'
                  ? 'Built-In Nigerian Curriculum Only'
                  : 'School Custom Curriculum Only'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#102D2A] dark:text-[#F7F3E9] mt-1 font-display flex flex-wrap items-center gap-2">
              <OrionModuleTitle
                height={20}
                variant="monochrome"
                suffix="Schools — Curriculum Governance, Content Approval & School Analytics"
                suffixColorClass="text-[#102D2A] dark:text-[#F7F3E9]"
              />
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
            <span>Platform Topics: {platformTopics.length}</span>
            <span>·</span>
            <span className="text-[#102D2A] dark:text-[#65A995] font-semibold">
              School Custom Topics: {schoolCustomTopics.length}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('curriculum_admin')}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'curriculum_admin'
                ? 'bg-[#102D2A] dark:bg-[#65A995] text-[#F7F3E9] dark:text-[#102D2A]'
                : 'bg-[#EFE9DA] dark:bg-[#143834] text-[#102D2A] dark:text-[#F7F3E9]/85'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Curriculum Engine & Custom Overlay</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('version_compare')}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'version_compare'
                ? 'bg-[#102D2A] dark:bg-[#65A995] text-[#F7F3E9] dark:text-[#102D2A]'
                : 'bg-[#EFE9DA] dark:bg-[#143834] text-[#102D2A] dark:text-[#F7F3E9]/85'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span>Compare, Map & Version Curricula</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('school_settings')}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'school_settings'
                ? 'bg-[#102D2A] dark:bg-[#65A995] text-[#F7F3E9] dark:text-[#102D2A]'
                : 'bg-[#EFE9DA] dark:bg-[#143834] text-[#102D2A] dark:text-[#F7F3E9]/85'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>School Profile & Sessions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approvals_analytics')}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'approvals_analytics'
                ? 'bg-[#102D2A] dark:bg-[#65A995] text-[#F7F3E9] dark:text-[#102D2A]'
                : 'bg-[#EFE9DA] dark:bg-[#143834] text-[#102D2A] dark:text-[#F7F3E9]/85'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Content Approvals & Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'permissions'
                ? 'bg-[#102D2A] dark:bg-[#65A995] text-[#F7F3E9] dark:text-[#102D2A]'
                : 'bg-[#EFE9DA] dark:bg-[#143834] text-[#102D2A] dark:text-[#F7F3E9]/85'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Role Permissions (RBAC)</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: CURRICULUM ENGINE & SCHOOL CUSTOM OVERLAY */}
      {activeTab === 'curriculum_admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Add Custom School Topic Form */}
          <form
            onSubmit={handleCreateCustomTopic}
            className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Add School Custom Curriculum Topic / Requirement</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                New topics added here are scoped strictly to <strong>{school.name}</strong> (`isPlatformWide: false`) and never overwrite the platform-wide Nigerian curriculum.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="custom-topic-class"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Class
                </label>
                <select
                  id="custom-topic-class"
                  value={newTopicClass}
                  onChange={(e) => {
                    const cls = e.target.value as NigerianClassName;
                    setNewTopicClass(cls);
                    setNewTopicSubject((CLASS_SUBJECTS_MAP[cls] || ['Mathematics'])[0]);
                  }}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  {ALL_NIGERIAN_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="custom-topic-subject"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Subject (or Custom)
                </label>
                <input
                  id="custom-topic-subject"
                  type="text"
                  value={newTopicSubject}
                  onChange={(e) => setNewTopicSubject(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="custom-topic-term"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Term & Week
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    id="custom-topic-term"
                    value={newTopicTerm}
                    onChange={(e) => setNewTopicTerm(e.target.value as NigerianTerm)}
                    className="flex-1 min-h-[40px] px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  >
                    {ALL_TERMS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    aria-label="Week Number"
                    value={newTopicWeek}
                    onChange={(e) => setNewTopicWeek(Number(e.target.value))}
                    className="w-14 min-h-[40px] px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="custom-topic-title"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Topic Title (Required)
              </label>
              <input
                id="custom-topic-title"
                type="text"
                required
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                placeholder="e.g. Solar Microgrid Sizing & Renewable Energy Storage"
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="custom-topic-objective"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Measurable Learning Objective (Required)
              </label>
              <input
                id="custom-topic-objective"
                type="text"
                required
                value={newTopicObjective}
                onChange={(e) => setNewTopicObjective(e.target.value)}
                placeholder="e.g. Calculate battery amp-hour capacity for a 500W classroom solar load"
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="custom-topic-skill"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Target Skill Tag
                </label>
                <input
                  id="custom-topic-skill"
                  type="text"
                  value={newTopicSkill}
                  onChange={(e) => setNewTopicSkill(e.target.value)}
                  placeholder="e.g. Solar Energy Engineering"
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="custom-topic-summary"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Lesson Summary Note
                </label>
                <input
                  id="custom-topic-summary"
                  type="text"
                  value={newTopicSummary}
                  onChange={(e) => setNewTopicSummary(e.target.value)}
                  placeholder="Core lesson explanation for students..."
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
            >
              Add Topic to School Curriculum Overlay
            </button>
          </form>

          {/* Right: Registered Curricula & Versioning Table */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Registered Curricula & Verification Status
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {curricula.length} Active Sources
              </span>
            </div>

            <div className="space-y-3">
              {curricula.map((curr) => (
                <div
                  key={curr.curriculumId}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {curr.version} · {curr.academicPeriod}
                    </span>
                    <span className="text-slate-500">
                      {curr.isPlatformWide
                        ? 'Platform-Wide (Read-Only Protected)'
                        : 'School Custom Overlay'}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {curr.name}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Source: {curr.source}
                  </div>
                  <div className="text-xs font-mono pt-1">
                    Verification Status:{' '}
                    {curr.approvalStatus === 'sample_unverified' ? (
                      <span className="text-amber-700 dark:text-amber-400">
                        ▲ Demonstration Sample (Official NERDC Source Not Yet Verified)
                      </span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        ● Approved by School Academic Board
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VERSION COMPARE & MAPPING */}
      {activeTab === 'version_compare' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Curriculum Mapping & Version Comparison
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compare built-in Nigerian curriculum topics (`v2026.1-sample`) with {school.name} custom overlay topics (`v1.2-school`).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="compare-class-select" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Inspect Class:
              </label>
              <select
                id="compare-class-select"
                value={compareClass}
                onChange={(e) => setCompareClass(e.target.value as NigerianClassName)}
                className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              >
                {ALL_NIGERIAN_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
              <div className="text-xs text-slate-500">Built-In Topics ({compareClass})</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {comparison.platformTopicsCount}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
              <div className="text-xs text-slate-500">School Overlay Topics ({compareClass})</div>
              <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
                {comparison.schoolCustomTopicsCount}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
              <div className="text-xs text-slate-500">Unverified Sample Nodes</div>
              <div className="text-xl font-bold font-mono tabular-nums text-amber-600 mt-1">
                {comparison.unverifiedSampleCount}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
              <div className="text-xs text-slate-500">Approved School Nodes</div>
              <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 mt-1">
                {comparison.approvedVerifiedCount}
              </div>
            </div>
          </div>

          {/* Side-by-Side Topic Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Built-In Nigerian Curriculum Structure ({compareClass})
              </div>
              {platformTopics
                .filter((t) => t.className === compareClass)
                .map((t) => (
                  <div
                    key={t.topicId}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1"
                  >
                    <div className="text-xs text-slate-500">
                      {t.subject} · {t.term} (Week {t.weekNumber})
                    </div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {t.title}
                    </div>
                    <div className="text-[11px] font-mono text-amber-700 dark:text-amber-400">
                      Status: sample_unverified · Protected Platform Node
                    </div>
                  </div>
                ))}
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {school.name} Custom Overlay Additions ({compareClass})
              </div>
              {schoolCustomTopics.filter((t) => t.className === compareClass).length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500">
                  No custom overlay topics added for {compareClass} yet. Use the Curriculum Engine tab to add school-specific topics.
                </div>
              ) : (
                schoolCustomTopics
                  .filter((t) => t.className === compareClass)
                  .map((t) => (
                    <div
                      key={t.topicId}
                      className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-1"
                    >
                      <div className="text-xs text-emerald-800 dark:text-emerald-300">
                        {t.subject} · {t.term} (Week {t.weekNumber})
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {t.title}
                      </div>
                      <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                        Status: {t.approvalStatus} · School Custom Overlay
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SCHOOL PROFILE & ACADEMIC SESSION SETTINGS */}
      {activeTab === 'school_settings' && (
        <form
          onSubmit={handleSaveSchoolSettings}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 max-w-3xl"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            School Profile, Academic Session & Curriculum Mode Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="admin-school-name"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                School Name
              </label>
              <input
                id="admin-school-name"
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="admin-school-state"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                State in Nigeria
              </label>
              <input
                id="admin-school-state"
                type="text"
                required
                value={schoolState}
                onChange={(e) => setSchoolState(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="admin-school-lga"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Local Government Area (LGA)
              </label>
              <input
                id="admin-school-lga"
                type="text"
                required
                value={schoolLga}
                onChange={(e) => setSchoolLga(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="admin-active-session"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Active Academic Session
              </label>
              <input
                id="admin-active-session"
                type="text"
                required
                value={activeSession}
                onChange={(e) => setActiveSession(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="admin-active-term"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Active Term
              </label>
              <select
                id="admin-active-term"
                value={activeTerm}
                onChange={(e) => setActiveTerm(e.target.value as NigerianTerm)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              >
                {ALL_TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="admin-curriculum-mode"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                School Curriculum Architecture Mode
              </label>
              <select
                id="admin-curriculum-mode"
                value={curriculumMode}
                onChange={(e) =>
                  setCurriculumMode(e.target.value as 'built_in' | 'custom' | 'hybrid')
                }
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              >
                <option value="built_in">1. Built-In Nigerian Curriculum Only</option>
                <option value="custom">2. School Custom Curriculum Only</option>
                <option value="hybrid">
                  3. Hybrid (Built-In Nigerian + School Custom Overlay)
                </option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
          >
            Save School & Curriculum Configuration
          </button>
        </form>
      )}

      {/* TAB 4: CONTENT APPROVALS & SCHOOL ANALYTICS */}
      {activeTab === 'approvals_analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Teacher Learning Content Approval Queue
            </h3>
            <p className="text-xs text-slate-500">
              Approve teacher-submitted lesson notes and schemes of work to publish them to students.
            </p>
            <div className="space-y-3">
              {teacherMaterials.map((mat) => (
                <div
                  key={mat.materialId}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {mat.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {mat.ownerName} · Status: {mat.approvalStatus}
                    </div>
                  </div>
                  {mat.approvalStatus !== 'approved_published' ? (
                    <button
                      type="button"
                      onClick={() => onUpdateMaterialStatus(mat.materialId, 'approved_published')}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold shrink-0"
                    >
                      Approve
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 shrink-0">
                      ● Approved
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              School-Wide Learning-Gap Report
            </h3>
            <p className="text-xs text-slate-500">
              Aggregated skill mastery across Primary, JSS, and SSS classes ({skillGaps.length} active remediation alerts).
            </p>
            <div className="space-y-2.5">
              {masteryRecords.map((m) => (
                <div
                  key={m.masteryId}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {m.skillTag}
                    </div>
                    <div className="text-slate-500">
                      {m.studentName || 'Student'} · {m.className} ({m.subject})
                    </div>
                  </div>
                  <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                    {m.masteryScore}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ROLE-BASED ACCESS CONTROL (RBAC) MATRIX */}
      {activeTab === 'permissions' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Zero-Trust Role Boundaries & Data Isolation Matrix
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enforced by Cloud Firestore Security Rules (`firestore.rules`) and server-side route guards.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-3 px-3 font-semibold">Capability / Resource</th>
                  <th className="py-3 px-3 font-semibold">Student / Independent Learner</th>
                  <th className="py-3 px-3 font-semibold">Teacher</th>
                  <th className="py-3 px-3 font-semibold">School Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-3 px-3 font-medium">Platform-Wide Nigerian Curriculum</td>
                  <td className="py-3 px-3">Read-Only</td>
                  <td className="py-3 px-3">Read-Only</td>
                  <td className="py-3 px-3">Read-Only (Cannot Overwrite)</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-medium">School Custom Curriculum Overlay</td>
                  <td className="py-3 px-3">Read Approved</td>
                  <td className="py-3 px-3">Propose / Read</td>
                  <td className="py-3 px-3">Create / Edit / Approve</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-medium">Private Draft Teacher Lesson Notes</td>
                  <td className="py-3 px-3 text-rose-600 font-semibold">Blocked (No Access)</td>
                  <td className="py-3 px-3">Create / Edit Own</td>
                  <td className="py-3 px-3">Review & Approve</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-medium">Published Teacher Lesson Notes</td>
                  <td className="py-3 px-3 text-emerald-700 font-semibold">Read & Save Offline</td>
                  <td className="py-3 px-3">Publish / Unpublish</td>
                  <td className="py-3 px-3">Approve / Audit</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
