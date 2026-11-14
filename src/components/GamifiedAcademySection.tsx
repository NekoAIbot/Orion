import React, { useState } from 'react';
import {
  Trophy,
  Wrench,
  BookOpen,
  Sprout,
  Coins,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';

interface GameChallenge {
  id: string;
  themeId: 'football' | 'inventor' | 'mystery' | 'farm' | 'entrepreneur';
  themeName: string;
  subjectFocus: string;
  classRange: string;
  skillTag: string;
  scenarioTitle: string;
  scenarioContext: string;
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
  workedExplanation: string;
}

const GAME_CHALLENGES: GameChallenge[] = [
  {
    id: 'ch_football_1',
    themeId: 'football',
    themeName: 'Football Academy',
    subjectFocus: 'Mathematics, Statistics & Strategy',
    classRange: 'Primary 5 – JSS 3',
    skillTag: 'Ratios, Proportions & Quantitative Speed',
    scenarioTitle: 'Super Eagles Academy Passing Triangle & Shot Conversion Rate',
    scenarioContext:
      'During training in Abuja, striker Kelechi converted 18 goals out of 24 shots on target. In the second half, he forms a right-angled passing triangle with midfielders at 3m and 4m perpendicular distances.',
    question:
      'What is Kelechi’s shot conversion percentage, and what is the hypotenuse pass distance between the two midfielders?',
    options: [
      '75% conversion rate; 5 m hypotenuse pass',
      '60% conversion rate; 7 m hypotenuse pass',
      '75% conversion rate; 6 m hypotenuse pass',
      '80% conversion rate; 5 m hypotenuse pass',
    ],
    correctIndex: 0,
    hint: 'Percentage = (18 ÷ 24) × 100. For the right-angled triangle with legs 3m and 4m, apply Pythagoras theorem: c² = 3² + 4².',
    workedExplanation:
      '1) Shot conversion = (18 / 24) × 100 = (3 / 4) × 100 = 75%.\n2) By Pythagoras Theorem: c = √(3² + 4²) = √(9 + 16) = √25 = 5 m.',
  },
  {
    id: 'ch_inventor_1',
    themeId: 'inventor',
    themeName: 'Inventor’s Workshop',
    subjectFocus: 'Physics, Engineering & Problem Solving',
    classRange: 'JSS 2 – SSS 2',
    skillTag: 'Mechanics: Work, Energy & Power',
    scenarioTitle: 'Solar Borehole Pump Pulley & Mechanical Advantage',
    scenarioContext:
      'In your community workshop, you design a pulley hoist to lift a 600 N water tank to a height of 5 metres in 15 seconds using an electric motor.',
    question:
      'How much mechanical work is done in lifting the tank, and what minimum power output must the motor deliver?',
    options: [
      'Work = 3,000 J; Power = 200 W',
      'Work = 120 J; Power = 1,800 W',
      'Work = 3,000 J; Power = 450 W',
      'Work = 605 J; Power = 40 W',
    ],
    correctIndex: 0,
    hint: 'Work Done (J) = Force (N) × Vertical Distance (m). Power (W) = Work Done ÷ Time (s).',
    workedExplanation:
      'Work W = F × d = 600 N × 5 m = 3,000 Joules.\nPower P = W / t = 3,000 J ÷ 15 s = 200 Watts.',
  },
  {
    id: 'ch_mystery_1',
    themeId: 'mystery',
    themeName: 'Mystery Kingdom',
    subjectFocus: 'English, Logic & Critical Thinking',
    classRange: 'Primary 4 – SSS 1',
    skillTag: 'Phonics & Sentence Construction',
    scenarioTitle: 'The Nok Terracotta Archive Riddle (Concord & Logical Deduction)',
    scenarioContext:
      'To unlock the ancient bronze gate, you must choose the grammatically accurate sentence that obeys the Rule of Proximity and Subject-Verb Concord.',
    question:
      'Which sentence is grammatically correct according to standard English concord rules?',
    options: [
      'Neither the curator nor the students were absent yesterday, and each of the artefacts is catalogued.',
      'Neither the curator nor the students was absent yesterday, and each of the artefacts are catalogued.',
      'Either the teacher or the prefects has the key to the library.',
      'Every one of the manuscripts have been verified by the historian.',
    ],
    correctIndex: 0,
    hint: 'With "Neither... nor...", the verb agrees with the closer subject ("students" -> plural "were"). Indefinite pronoun "each" always takes a singular verb ("is").',
    workedExplanation:
      'In "Neither the curator nor the students were...", "students" is plural so "were" is required. In "each of the artefacts is catalogued", the subject is "each" (singular), taking "is".',
  },
  {
    id: 'ch_farm_1',
    themeId: 'farm',
    themeName: 'Smart Farm',
    subjectFocus: 'Biology, Agriculture & Mathematics',
    classRange: 'Primary 5 – SSS 2',
    skillTag: 'Crop Science & Agricultural Classification',
    scenarioTitle: 'Benue Cassava & Maize Intercropping Yield Planner',
    scenarioContext:
      'A rectangular plot measures 40 m by 25 m. Maize (an annual crop) is planted at a spacing that yields 4.5 kg per square metre.',
    question:
      'What is the area of the farmland in square metres, and what total maize harvest (in kg) is expected?',
    options: [
      'Area = 1,000 m²; Expected Harvest = 4,500 kg',
      'Area = 650 m²; Expected Harvest = 2,925 kg',
      'Area = 1,000 m²; Expected Harvest = 450 kg',
      'Area = 130 m²; Expected Harvest = 585 kg',
    ],
    correctIndex: 0,
    hint: 'Area of rectangle = Length × Breadth (40 × 25). Multiply total area by 4.5 kg/m².',
    workedExplanation:
      'Area = 40 m × 25 m = 1,000 m².\nTotal Yield = 1,000 m² × 4.5 kg/m² = 4,500 kg (4.5 metric tonnes).',
  },
  {
    id: 'ch_entrepreneur_1',
    themeId: 'entrepreneur',
    themeName: 'Young Entrepreneur',
    subjectFocus: 'Financial Literacy, Business & Calculations',
    classRange: 'Primary 4 – SSS 3',
    skillTag: 'Bookkeeping & Financial Literacy',
    scenarioTitle: 'Aba Leather Footwear Micro-Enterprise Profit Analysis',
    scenarioContext:
      'Adaora produces 50 pairs of school sandals at a raw material cost of ₦3,200 per pair and pays ₦20,000 total workshop overhead. She sells all 50 pairs at ₦4,800 per pair.',
    question:
      'What is Adaora’s Total Cost, Total Revenue, and Net Profit (with percentage profit on cost)?',
    options: [
      'Cost = ₦180,000; Revenue = ₦240,000; Net Profit = ₦60,000 (33.3%)',
      'Cost = ₦160,000; Revenue = ₦240,000; Net Profit = ₦80,000 (50.0%)',
      'Cost = ₦180,000; Revenue = ₦200,000; Net Profit = ₦20,000 (11.1%)',
      'Cost = ₦140,000; Revenue = ₦240,000; Net Profit = ₦100,000 (71.4%)',
    ],
    correctIndex: 0,
    hint: 'Material cost = 50 × ₦3,200 = ₦160,000. Add overhead ₦20,000 to get Total Cost = ₦180,000. Revenue = 50 × ₦4,800 = ₦240,000.',
    workedExplanation:
      'Total Cost = (50 × ₦3,200) + ₦20,000 = ₦160,000 + ₦20,000 = ₦180,000.\nTotal Revenue = 50 × ₦4,800 = ₦240,000.\nNet Profit = ₦240,000 − ₦180,000 = ₦60,000.\nPercentage Profit = (60,000 ÷ 180,000) × 100 = 33.3%.',
  },
];

interface GamifiedAcademySectionProps {
  onDemonstrateMastery?: (skillTag: string, percentage: number, usedHint: boolean) => void;
}

export const GamifiedAcademySection: React.FC<GamifiedAcademySectionProps> = ({
  onDemonstrateMastery,
}) => {
  const [selectedThemeId, setSelectedThemeId] = useState<GameChallenge['themeId']>('football');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [completedThemes, setCompletedThemes] = useState<string[]>([]);

  const activeChallenge =
    GAME_CHALLENGES.find((c) => c.themeId === selectedThemeId) || GAME_CHALLENGES[0];

  const handleSelectTheme = (themeId: GameChallenge['themeId']) => {
    setSelectedThemeId(themeId);
    setSelectedOption(null);
    setShowHint(false);
    setSubmitted(false);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;
    setSubmitted(true);
    const isCorrect = selectedOption === activeChallenge.correctIndex;
    if (isCorrect) {
      if (!completedThemes.includes(activeChallenge.themeId)) {
        setCompletedThemes((prev) => [...prev, activeChallenge.themeId]);
      }
      onDemonstrateMastery?.(activeChallenge.skillTag, 100, showHint);
    } else {
      onDemonstrateMastery?.(activeChallenge.skillTag, 45, showHint);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mastery Philosophy Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white font-display">
            ORION Learn — Curriculum Learning Missions & Games
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rewards demonstrated understanding, mathematical reasoning, and practical application — never passive screen time.
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
          Demonstrated Missions: <strong>{completedThemes.length}</strong> / {GAME_CHALLENGES.length}
        </div>
      </div>

      {/* 5 Game Theme Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {GAME_CHALLENGES.map((challenge) => {
          const isActive = challenge.themeId === selectedThemeId;
          const isDone = completedThemes.includes(challenge.themeId);
          return (
            <button
              key={challenge.id}
              type="button"
              onClick={() => handleSelectTheme(challenge.themeId)}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[116px] ${
                isActive
                  ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  {challenge.themeId === 'football' && <Trophy className="w-4 h-4" />}
                  {challenge.themeId === 'inventor' && <Wrench className="w-4 h-4" />}
                  {challenge.themeId === 'mystery' && <BookOpen className="w-4 h-4" />}
                  {challenge.themeId === 'farm' && <Sprout className="w-4 h-4" />}
                  {challenge.themeId === 'entrepreneur' && <Coins className="w-4 h-4" />}
                </div>
                {isDone && (
                  <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Solved
                  </span>
                )}
              </div>
              <div className="mt-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {challenge.themeName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {challenge.subjectFocus}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Challenge Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Visual Tactical / Scenario Board */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-white p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs text-emerald-400 font-mono">
              {activeChallenge.themeName} · {activeChallenge.classRange}
            </div>
            <h4 className="text-base font-semibold text-white mt-1">
              {activeChallenge.scenarioTitle}
            </h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {activeChallenge.scenarioContext}
            </p>
          </div>

          {/* Thematic Vector Schematic */}
          <div className="my-5 p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-center">
            {activeChallenge.themeId === 'football' && (
              <svg className="w-full h-36" viewBox="0 0 260 130" aria-label="Football Passing Triangle">
                <rect x="8" y="8" width="244" height="114" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
                <line x1="130" y1="8" x2="130" y2="122" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.5" />
                <circle cx="130" cy="65" r="22" fill="none" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.5" />
                {/* Passing Triangle */}
                <polygon
                  points="65,98 65,34 165,98"
                  fill="#fbbf24"
                  fillOpacity="0.18"
                  stroke="#fbbf24"
                  strokeWidth="2"
                />
                <circle cx="65" cy="98" r="5" fill="#fbbf24" />
                <circle cx="65" cy="34" r="5" fill="#38bdf8" />
                <circle cx="165" cy="98" r="5" fill="#34d399" />
                <text x="34" y="68" fill="#fde047" fontSize="10" fontFamily="monospace">
                  3m
                </text>
                <text x="105" y="114" fill="#fde047" fontSize="10" fontFamily="monospace">
                  4m
                </text>
                <text x="116" y="62" fill="#ffffff" fontSize="10" fontFamily="monospace">
                  c = ?
                </text>
              </svg>
            )}

            {activeChallenge.themeId === 'inventor' && (
              <svg className="w-full h-36" viewBox="0 0 260 130" aria-label="Solar Pulley Hoist">
                <line x1="40" y1="18" x2="220" y2="18" stroke="#94a3b8" strokeWidth="4" />
                <circle cx="130" cy="36" r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="2.5" />
                <line x1="116" y1="36" x2="116" y2="95" stroke="#fbbf24" strokeWidth="2" />
                <rect x="96" y="88" width="40" height="28" rx="4" fill="#0284c7" />
                <text x="101" y="106" fill="#ffffff" fontSize="10" fontFamily="monospace">
                  600N
                </text>
                <text x="152" y="68" fill="#7dd3fc" fontSize="10" fontFamily="monospace">
                  h = 5m | t = 15s
                </text>
              </svg>
            )}

            {activeChallenge.themeId === 'mystery' && (
              <svg className="w-full h-36" viewBox="0 0 260 130" aria-label="Logic Concord Gate">
                <rect x="30" y="20" width="200" height="90" rx="8" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
                <text x="48" y="52" fill="#e0e7ff" fontSize="11" fontFamily="monospace">
                  Rule 1: Neither A nor [Plural B]
                </text>
                <text x="48" y="74" fill="#a5b4fc" fontSize="11" fontFamily="monospace">
                  Rule 2: Each of [Plural] → Singular
                </text>
                <text x="48" y="96" fill="#34d399" fontSize="10" fontFamily="monospace">
                  Verify Syntactic Concord
                </text>
              </svg>
            )}

            {activeChallenge.themeId === 'farm' && (
              <svg className="w-full h-36" viewBox="0 0 260 130" aria-label="Smart Farm Plot">
                <rect x="36" y="20" width="188" height="84" rx="4" fill="#14532d" stroke="#4ade80" strokeWidth="2" />
                <text x="105" y="15" fill="#86efac" fontSize="10" fontFamily="monospace">
                  Length = 40 m
                </text>
                <text x="108" y="65" fill="#ffffff" fontSize="11" fontFamily="monospace">
                  4.5 kg / m²
                </text>
                <text x="88" y="118" fill="#fde047" fontSize="10" fontFamily="monospace">
                  Breadth = 25 m
                </text>
              </svg>
            )}

            {activeChallenge.themeId === 'entrepreneur' && (
              <svg className="w-full h-36" viewBox="0 0 260 130" aria-label="Entrepreneur Ledger">
                <rect x="24" y="16" width="212" height="98" rx="6" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />
                <text x="38" y="42" fill="#fde047" fontSize="11" fontFamily="monospace">
                  Qty: 50 pairs @ ₦3,200/pair
                </text>
                <text x="38" y="64" fill="#94a3b8" fontSize="11" fontFamily="monospace">
                  Overhead: ₦20,000
                </text>
                <text x="38" y="88" fill="#34d399" fontSize="11" fontFamily="monospace">
                  Selling Price: ₦4,800/pair
                </text>
              </svg>
            )}
          </div>

          <div className="text-xs text-slate-400">
            Skill Linked: <span className="text-slate-200 font-medium">{activeChallenge.skillTag}</span>
          </div>
        </div>

        {/* Right: Interactive Problem Solving & Hint-First Verification */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {activeChallenge.question}
            </div>

            <div className="space-y-2.5">
              {activeChallenge.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === activeChallenge.correctIndex;
                let borderStyle =
                  'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700';
                if (submitted) {
                  if (isCorrect) {
                    borderStyle =
                      'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200';
                  } else if (isSelected) {
                    borderStyle =
                      'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200';
                  }
                } else if (isSelected) {
                  borderStyle =
                    'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 text-slate-900 dark:text-white';
                }

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      if (!submitted) setSelectedOption(idx);
                    }}
                    className={`w-full min-h-[48px] p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition-colors flex items-center justify-between gap-3 ${borderStyle}`}
                  >
                    <span>
                      <strong className="font-mono mr-2">{String.fromCharCode(65 + idx)}.</strong>
                      {option}
                    </span>
                    {submitted && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    {submitted && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {showHint && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
                <strong>Guided Hint:</strong> {activeChallenge.hint}
              </div>
            )}

            {submitted && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {selectedOption === activeChallenge.correctIndex
                    ? 'Correct! Demonstrated Understanding Recorded (+Mastery)'
                    : 'Review the Step-by-Step Working Below:'}
                </div>
                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line font-mono">
                  {activeChallenge.workedExplanation}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowHint((prev) => !prev)}
              className="min-h-[42px] px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>{showHint ? 'Hide Hint' : 'Request Hint First'}</span>
            </button>

            <div className="flex items-center gap-2.5">
              {submitted ? (
                <button
                  type="button"
                  onClick={() => {
                    const currentIdx = GAME_CHALLENGES.findIndex(
                      (c) => c.themeId === selectedThemeId
                    );
                    const nextChallenge =
                      GAME_CHALLENGES[(currentIdx + 1) % GAME_CHALLENGES.length];
                    handleSelectTheme(nextChallenge.themeId);
                  }}
                  className="min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors flex items-center gap-1.5"
                >
                  <span>Next Theme Challenge</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={selectedOption === null}
                  onClick={handleSubmitAnswer}
                  className="min-h-[42px] px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                >
                  Submit Solution & Verify Mastery
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
