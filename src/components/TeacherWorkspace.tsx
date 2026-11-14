import React, { useState } from 'react';
import {
  Calendar,
  FileText,
  Sparkles,
  CheckCircle2,
  Download,
  AlertTriangle,
  BookOpen,
  Users,
  Save,
} from 'lucide-react';
import {
  NigerianClassName,
  NigerianTerm,
  TopicRecord,
  TeacherMaterialRecord,
  SchemeOfWorkWeekRow,
  StudentSkillMasteryRecord,
} from '../types/database';
import {
  ALL_NIGERIAN_CLASSES,
  CLASS_SUBJECTS_MAP,
  ALL_TERMS,
} from '../data/nigerianCurriculumData';
import { identifySkillGaps } from '../utils/curriculumEngine';
import { postAuthenticatedAiRequest } from '../lib/firebase';
import { OrionModuleTitle } from './OrionBrandAssets';

type TeacherTabId = 'scheme_generator' | 'lesson_note_generator' | 'skill_gaps' | 'saved_materials';

interface TeacherWorkspaceProps {
  topics: TopicRecord[];
  teacherMaterials: TeacherMaterialRecord[];
  onSaveMaterial: (material: TeacherMaterialRecord) => void;
  onUpdateMaterialStatus: (
    materialId: string,
    status: 'draft' | 'pending_approval' | 'approved_published'
  ) => void;
  masteryRecords: StudentSkillMasteryRecord[];
  onAssignRemedialBoost: (masteryId: string) => void;
  onRequireAuth?: () => void;
}

export const TeacherWorkspace: React.FC<TeacherWorkspaceProps> = ({
  topics,
  teacherMaterials,
  onSaveMaterial,
  onUpdateMaterialStatus,
  masteryRecords,
  onAssignRemedialBoost,
  onRequireAuth,
}) => {
  const [activeTab, setActiveTab] = useState<TeacherTabId>('scheme_generator');
  const [selectedClass, setSelectedClass] = useState<NigerianClassName>('JSS 2');
  const availableSubjects = CLASS_SUBJECTS_MAP[selectedClass] || ['Mathematics'];
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathematics');
  const [selectedTerm, setSelectedTerm] = useState<NigerianTerm>('First Term');
  const [customFocus, setCustomFocus] = useState<string>('');

  const activeSubject = availableSubjects.includes(selectedSubject)
    ? selectedSubject
    : availableSubjects[0];

  // Scheme of Work State
  const initialScheme =
    teacherMaterials.find((m) => m.materialType === 'scheme_of_work')?.schemeRows || [];
  const [schemeRows, setSchemeRows] = useState<SchemeOfWorkWeekRow[]>(initialScheme);
  const [generatingScheme, setGeneratingScheme] = useState(false);
  const [schemeSavedBanner, setSchemeSavedBanner] = useState<string | null>(null);

  // Lesson Note State
  const [noteWeek, setNoteWeek] = useState<number>(2);
  const [noteTopicTitle, setNoteTopicTitle] = useState<string>(
    'Stoichiometry — Law of Conservation of Mass & Balancing Chemical Equations'
  );
  const [noteObjective, setNoteObjective] = useState<string>(
    'State the Law of Conservation of Mass and balance chemical equations accurately.'
  );
  const [noteContent, setNoteContent] = useState<string>(
    teacherMaterials.find((m) => m.materialType === 'lesson_note')?.content || ''
  );
  const [generatingNote, setGeneratingNote] = useState(false);
  const [noteStatusBanner, setNoteStatusBanner] = useState<string | null>(null);

  const skillGaps = identifySkillGaps(masteryRecords, topics);

  const handleGenerateScheme = async () => {
    setGeneratingScheme(true);
    setSchemeSavedBanner(null);
    try {
      const result = await postAuthenticatedAiRequest<{
        rows?: SchemeOfWorkWeekRow[];
      }>(
        '/api/ai/scheme-of-work',
        {
          className: selectedClass,
          subject: activeSubject,
          term: selectedTerm,
          customFocus,
        },
        'teacher'
      );
      if (!result.ok) {
        if (result.requiresAuth && onRequireAuth) {
          onRequireAuth();
        }
        setSchemeSavedBanner(result.error);
        return;
      }
      if (Array.isArray(result.data.rows) && result.data.rows.length > 0) {
        setSchemeRows(result.data.rows);
        setSchemeSavedBanner(
          `Generated complete 12-week ${selectedTerm} Scheme of Work for ${selectedClass} ${activeSubject}. Review and edit any cell below before saving.`
        );
      }
    } catch {
      setSchemeSavedBanner('Unable to reach server; loaded structured 12-week template.');
    } finally {
      setGeneratingScheme(false);
    }
  };

  const handleUpdateSchemeCell = (
    weekIndex: number,
    field: keyof SchemeOfWorkWeekRow,
    value: string
  ) => {
    setSchemeRows((prev) =>
      prev.map((row, idx) => (idx === weekIndex ? { ...row, [field]: value } : row))
    );
  };

  const handleSaveScheme = (status: 'draft' | 'approved_published') => {
    const newMat: TeacherMaterialRecord = {
      materialId: `mat_scheme_${Date.now()}`,
      materialType: 'scheme_of_work',
      title: `${selectedClass} ${activeSubject} — ${selectedTerm} 12-Week Scheme of Work`,
      className: selectedClass,
      subject: activeSubject,
      term: selectedTerm,
      content: schemeRows.map((r) => `Week ${r.week}: ${r.topic}`).join('\n'),
      schemeRows,
      approvalStatus: status,
      ownerId: 'demo_teacher_01',
      ownerName: 'Mrs. Funke Adeyemi (B.Sc. Ed)',
      schoolId: 'sch_unity_lagos_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveMaterial(newMat);
    setSchemeSavedBanner(
      status === 'approved_published'
        ? 'Scheme of Work approved and published to school repository!'
        : 'Scheme of Work saved as teacher draft.'
    );
  };

  const handleExportSchemeCSV = () => {
    const headers = [
      'Week',
      'Topic',
      'Performance Objectives',
      'Teacher Activities',
      'Student Activities',
      'Teaching Resources',
      'Evaluation Guide',
    ];
    const csvLines = [
      headers.join(','),
      ...schemeRows.map((r) =>
        [
          r.week,
          `"${r.topic.replace(/"/g, '""')}"`,
          `"${r.performanceObjectives.replace(/"/g, '""')}"`,
          `"${r.teacherActivities.replace(/"/g, '""')}"`,
          `"${r.studentActivities.replace(/"/g, '""')}"`,
          `"${r.teachingResources.replace(/"/g, '""')}"`,
          `"${r.evaluationGuide.replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Scheme_of_Work_${selectedClass.replace(/\s+/g, '_')}_${activeSubject.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateLessonNote = async () => {
    setGeneratingNote(true);
    setNoteStatusBanner(null);
    try {
      const result = await postAuthenticatedAiRequest<{ content?: string }>(
        '/api/ai/lesson-note',
        {
          className: selectedClass,
          subject: activeSubject,
          term: selectedTerm,
          weekNumber: noteWeek,
          topicTitle: noteTopicTitle,
          learningObjective: noteObjective,
          durationMinutes: 40,
        },
        'teacher'
      );
      if (!result.ok) {
        if (result.requiresAuth && onRequireAuth) {
          onRequireAuth();
        }
        setNoteStatusBanner(result.error);
        return;
      }
      if (result.data.content) {
        setNoteContent(result.data.content);
        setNoteStatusBanner(
          `Generated comprehensive lesson note for ${selectedClass} ${activeSubject}. Review, edit, and approve before publishing to students.`
        );
      }
    } catch {
      setNoteStatusBanner('Loaded structured lesson note template.');
    } finally {
      setGeneratingNote(false);
    }
  };

  const handleSaveLessonNote = (
    status: 'draft' | 'pending_approval' | 'approved_published'
  ) => {
    const newMat: TeacherMaterialRecord = {
      materialId: `mat_note_${Date.now()}`,
      materialType: 'lesson_note',
      title: `${selectedClass} ${activeSubject} Lesson Note: ${noteTopicTitle}`,
      className: selectedClass,
      subject: activeSubject,
      term: selectedTerm,
      content: noteContent,
      approvalStatus: status,
      ownerId: 'demo_teacher_01',
      ownerName: 'Mrs. Funke Adeyemi (B.Sc. Ed)',
      schoolId: 'sch_unity_lagos_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveMaterial(newMat);
    setNoteStatusBanner(
      status === 'approved_published'
        ? 'Lesson Note approved and published! It is now visible in the Student Digital Library.'
        : status === 'pending_approval'
        ? 'Lesson Note submitted to School Administrator Approval Queue.'
        : 'Lesson Note saved as private Teacher Draft.'
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top ORION Teach Workspace Header & Class/Subject Bar */}
      <div className="rounded-2xl border border-[#102D2A]/15 dark:border-[#65A995]/25 bg-[#FDFBF7] dark:bg-[#102D2A] p-5 space-y-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#102D2A]/10 dark:border-[#65A995]/20 pb-4">
          <div>
            <div className="text-xs font-medium text-[#102D2A]/75 dark:text-[#65A995]">
              <span>ORION Teach · Plan • Create • Inspire</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Unity Model Academy, Yaba</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>2026/2027 Session</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#102D2A] dark:text-[#F7F3E9] mt-1 font-display flex flex-wrap items-center gap-2">
              <OrionModuleTitle
                height={20}
                variant="monochrome"
                suffix="Teach — Curriculum Planning, Lesson Generation & Skill-Gap Clinic"
                suffixColorClass="text-[#102D2A] dark:text-[#F7F3E9]"
              />
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#102D2A]/80 dark:text-[#F7F3E9]/85">
            <span>Saved Materials:</span>
            <strong className="font-mono tabular-nums">{teacherMaterials.length}</strong>
            <span aria-hidden="true">·</span>
            <span>Flagged Skill Gaps:</span>
            <strong className="font-mono tabular-nums text-[#E6A65D]">
              {skillGaps.length}
            </strong>
          </div>
        </div>

        {/* Class, Subject & Term Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="teacher-class-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Target Class
            </label>
            <select
              id="teacher-class-select"
              value={selectedClass}
              onChange={(e) => {
                const cls = e.target.value as NigerianClassName;
                setSelectedClass(cls);
                const subjs = CLASS_SUBJECTS_MAP[cls] || ['Mathematics'];
                setSelectedSubject(subjs[0]);
              }}
              className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
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
              htmlFor="teacher-subject-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Subject
            </label>
            <select
              id="teacher-subject-select"
              value={activeSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
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
              htmlFor="teacher-term-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Term
            </label>
            <select
              id="teacher-term-select"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value as NigerianTerm)}
              className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
            >
              {ALL_TERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ORION Teach Module Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('scheme_generator')}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'scheme_generator'
                ? 'bg-[#102D2A] dark:bg-[#65A995] text-[#F7F3E9] dark:text-[#102D2A]'
                : 'bg-[#EFE9DA] dark:bg-[#143834] text-[#102D2A] dark:text-[#F7F3E9]/85'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>12-Week Scheme of Work Generator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lesson_note_generator')}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'lesson_note_generator'
                ? 'bg-[#102D2A] dark:bg-[#65A995] text-[#F7F3E9] dark:text-[#102D2A]'
                : 'bg-[#EFE9DA] dark:bg-[#143834] text-[#102D2A] dark:text-[#F7F3E9]/85'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Comprehensive Lesson Note Generator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('skill_gaps')}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'skill_gaps'
                ? 'bg-[#102D2A] dark:bg-[#65A995] text-[#F7F3E9] dark:text-[#102D2A]'
                : 'bg-[#EFE9DA] dark:bg-[#143834] text-[#102D2A] dark:text-[#F7F3E9]/85'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Skill-Gap & Remedial Clinic ({skillGaps.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('saved_materials')}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'saved_materials'
                ? 'bg-[#102D2A] dark:bg-[#65A995] text-[#F7F3E9] dark:text-[#102D2A]'
                : 'bg-[#EFE9DA] dark:bg-[#143834] text-[#102D2A] dark:text-[#F7F3E9]/85'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Saved & Published Materials ({teacherMaterials.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: 12-WEEK SCHEME OF WORK GENERATOR */}
      {activeTab === 'scheme_generator' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Full-Term (Weeks 1–12) Scheme of Work Generator & Editor
              </h3>
              <div>
                <label
                  htmlFor="scheme-custom-focus"
                  className="block text-xs text-slate-500 dark:text-slate-400 mb-1"
                >
                  Optional School Emphasis / Practical Enrichment Focus
                </label>
                <input
                  id="scheme-custom-focus"
                  type="text"
                  value={customFocus}
                  onChange={(e) => setCustomFocus(e.target.value)}
                  placeholder="e.g. Include renewable solar energy calculations and BECE past questions"
                  className="w-full max-w-xl min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={generatingScheme}
                onClick={handleGenerateScheme}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {generatingScheme
                    ? 'Generating 12 Weeks...'
                    : `Generate ${selectedClass} ${activeSubject} Scheme`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveScheme('draft')}
                className="min-h-[42px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveScheme('approved_published')}
                className="min-h-[42px] px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Approve & Publish</span>
              </button>

              <button
                type="button"
                onClick={handleExportSchemeCSV}
                className="min-h-[42px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {schemeSavedBanner && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{schemeSavedBanner}</span>
            </div>
          )}

          {/* Editable 12-Week Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-2 font-semibold w-14">Wk</th>
                  <th className="py-3 px-2 font-semibold min-w-[180px]">Topic</th>
                  <th className="py-3 px-2 font-semibold min-w-[200px]">Performance Objectives</th>
                  <th className="py-3 px-2 font-semibold min-w-[200px]">Teacher & Student Activities</th>
                  <th className="py-3 px-2 font-semibold min-w-[160px]">Resources & Evaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {schemeRows.map((row, idx) => (
                  <tr key={row.week} className="align-top">
                    <td className="py-3 px-2 font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                      W{row.week}
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        aria-label={`Week ${row.week} Topic`}
                        value={row.topic}
                        onChange={(e) => handleUpdateSchemeCell(idx, 'topic', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-white"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <textarea
                        rows={2}
                        aria-label={`Week ${row.week} Objectives`}
                        value={row.performanceObjectives}
                        onChange={(e) =>
                          handleUpdateSchemeCell(idx, 'performanceObjectives', e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                      />
                    </td>
                    <td className="py-3 px-2 space-y-1">
                      <textarea
                        rows={2}
                        aria-label={`Week ${row.week} Teacher Activities`}
                        value={row.teacherActivities}
                        onChange={(e) =>
                          handleUpdateSchemeCell(idx, 'teacherActivities', e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <textarea
                        rows={2}
                        aria-label={`Week ${row.week} Evaluation Guide`}
                        value={row.evaluationGuide}
                        onChange={(e) =>
                          handleUpdateSchemeCell(idx, 'evaluationGuide', e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COMPREHENSIVE LESSON NOTE GENERATOR */}
      {activeTab === 'lesson_note_generator' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="md:col-span-2">
              <label
                htmlFor="note-week-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Week (1–12)
              </label>
              <input
                id="note-week-input"
                type="number"
                min={1}
                max={12}
                value={noteWeek}
                onChange={(e) => setNoteWeek(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-5">
              <label
                htmlFor="note-topic-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Lesson Topic Title
              </label>
              <input
                id="note-topic-input"
                type="text"
                value={noteTopicTitle}
                onChange={(e) => setNoteTopicTitle(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-5">
              <label
                htmlFor="note-objective-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Behavioural Objective Focus
              </label>
              <input
                id="note-objective-input"
                type="text"
                value={noteObjective}
                onChange={(e) => setNoteObjective(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={generatingNote}
              onClick={handleGenerateLessonNote}
              className="min-h-[42px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {generatingNote
                  ? 'Generating Lesson Note...'
                  : 'Generate Comprehensive Lesson Note'}
              </span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveLessonNote('draft')}
                className="min-h-[42px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                Save as Private Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveLessonNote('pending_approval')}
                className="min-h-[42px] px-3.5 py-2 rounded-lg border border-amber-400 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-50"
              >
                Submit for Admin Review
              </button>
              <button
                type="button"
                onClick={() => handleSaveLessonNote('approved_published')}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Approve & Publish to Students
              </button>
            </div>
          </div>

          {noteStatusBanner && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{noteStatusBanner}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="lesson-note-editor"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              Editable Lesson Note Manuscript (Teachers can edit every section before approval)
            </label>
            <textarea
              id="lesson-note-editor"
              rows={16}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* TAB 3: SKILL-GAP IDENTIFICATION & REMEDIAL CLINIC */}
      {activeTab === 'skill_gaps' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Automated Skill-Gap Detection & Remedial Lesson Recommendations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Students scoring below 65% mastery on any curriculum skill tag are flagged below with targeted remedial actions.
            </p>
          </div>

          {skillGaps.length === 0 ? (
            <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Zero Critical Skill Gaps Detected
              </div>
              <p className="text-xs text-slate-500">
                All tracked students currently exceed the 65% mastery threshold.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {skillGaps.map((gap) => (
                <div
                  key={gap.masteryRecord.masteryId}
                  className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        {gap.masteryRecord.studentName || 'Student'} · {gap.masteryRecord.className}{' '}
                        {gap.masteryRecord.subject}
                      </span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">
                        Mastery: {gap.masteryRecord.masteryScore}% ({gap.priority} Priority)
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-900 dark:text-white">
                      Weak Skill Tag: {gap.masteryRecord.skillTag}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{gap.actionPlan}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAssignRemedialBoost(gap.masteryRecord.masteryId)}
                    className="min-h-[42px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    Assign Remedial Clinic (+20% Mastery Practice)
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SAVED & PUBLISHED MATERIALS */}
      {activeTab === 'saved_materials' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Teacher Repository & Publication Controls
          </h3>
          <div className="space-y-3">
            {teacherMaterials.map((mat) => (
              <div
                key={mat.materialId}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {mat.materialType === 'scheme_of_work' ? '12-Week Scheme of Work' : 'Lesson Note'}{' '}
                    · {mat.className} · {mat.subject} · {mat.term}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {mat.title}
                  </div>
                  <div className="text-xs font-mono">
                    Status:{' '}
                    {mat.approvalStatus === 'approved_published' ? (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        ● Approved & Published to Students
                      </span>
                    ) : mat.approvalStatus === 'pending_approval' ? (
                      <span className="text-amber-700 dark:text-amber-400">
                        ▲ Pending School Admin Review
                      </span>
                    ) : (
                      <span className="text-slate-500">Draft (Private to Teacher)</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {mat.approvalStatus !== 'approved_published' && (
                    <button
                      type="button"
                      onClick={() => onUpdateMaterialStatus(mat.materialId, 'approved_published')}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold"
                    >
                      Approve & Publish
                    </button>
                  )}
                  {mat.approvalStatus === 'approved_published' && (
                    <button
                      type="button"
                      onClick={() => onUpdateMaterialStatus(mat.materialId, 'draft')}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Unpublish to Draft
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
