import React, { useState } from 'react';
import {
  FlaskConical,
  Zap,
  Sprout,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
} from 'lucide-react';
import {
  checkChemicalEquationBalance,
  calculateOhmAndPendulum,
} from '../utils/curriculumEngine';
import { OrionWordmark } from './OrionBrandAssets';

type LabModule = 'chemistry' | 'physics' | 'biology';

interface DiscoveryLabSectionProps {
  onCompleteMission?: (skillTag: string, score: number) => void;
}

export const DiscoveryLabSection: React.FC<DiscoveryLabSectionProps> = ({
  onCompleteMission,
}) => {
  const [activeLab, setActiveLab] = useState<LabModule>('chemistry');
  const [missionFeedback, setMissionFeedback] = useState<string | null>(null);

  // Chemistry State: N2 + H2 -> NH3 AND Acid-Base Titration
  const [selectedReaction, setSelectedReaction] = useState<'haber' | 'combustion' | 'water'>('haber');
  const [coeffA, setCoeffA] = useState<number>(1);
  const [coeffB, setCoeffB] = useState<number>(1);
  const [coeffC, setCoeffC] = useState<number>(1);
  const [coeffD, setCoeffD] = useState<number>(1);
  const [titrationNaOHMl, setTitrationNaOHMl] = useState<number>(18);

  // Physics State: Ohm's Law & Simple Pendulum
  const [voltage, setVoltage] = useState<number>(12);
  const [resistance, setResistance] = useState<number>(4);
  const [pendulumLength, setPendulumLength] = useState<number>(1.0);

  // Biology State: Xylem & Phloem Transport
  const [climateZone, setClimateZone] = useState<'rainforest' | 'savannah_harmattan'>('rainforest');
  const [sunlightPercent, setSunlightPercent] = useState<number>(75);
  const [soilMoisturePercent, setSoilMoisturePercent] = useState<number>(70);

  // Chemistry Balance Calculation
  const getReactionBalance = () => {
    if (selectedReaction === 'haber') {
      // a N2 + b H2 -> c NH3
      return checkChemicalEquationBalance(
        { N: coeffA * 2, H: coeffB * 2 },
        { N: coeffC * 1, H: coeffC * 3 }
      );
    }
    if (selectedReaction === 'water') {
      // a H2 + b O2 -> c H2O
      return checkChemicalEquationBalance(
        { H: coeffA * 2, O: coeffB * 2 },
        { H: coeffC * 2, O: coeffC * 1 }
      );
    }
    // combustion: a C3H8 + b O2 -> c CO2 + d H2O
    return checkChemicalEquationBalance(
      { C: coeffA * 3, H: coeffA * 8, O: coeffB * 2 },
      { C: coeffC * 1, H: coeffD * 2, O: coeffC * 2 + coeffD * 1 }
    );
  };

  const chemBalance = getReactionBalance();

  // Titration pH curve approximation (25 mL of 0.1M HCl titrated with 0.1M NaOH, equivalence at 25.0 mL)
  const computeTitrationPH = (volNaOH: number): number => {
    const diff = volNaOH - 25;
    if (Math.abs(diff) < 0.2) return 7.0;
    if (diff < 0) {
      return Number(Math.max(1.0, 1.3 + (volNaOH / 24.8) * 2.2).toFixed(2));
    }
    return Number(Math.min(13.0, 10.5 + ((volNaOH - 25) / 25) * 2.2).toFixed(2));
  };

  const currentPH = computeTitrationPH(titrationNaOHMl);

  // Physics Calculation
  const physMetrics = calculateOhmAndPendulum(voltage, resistance, pendulumLength, 9.8);

  // Biology Calculation
  const humidityFactor = climateZone === 'rainforest' ? 1.0 : 1.45; // Harmattan dry wind increases transpiration pull
  const xylemFlowRate = Number(
    ((soilMoisturePercent / 100) * (sunlightPercent / 100) * 18 * humidityFactor).toFixed(1)
  );
  const phloemSucroseRate = Number(
    ((sunlightPercent / 100) * Math.min(1, soilMoisturePercent / 50) * 12.5).toFixed(1)
  );

  const resetCurrentLab = () => {
    setMissionFeedback(null);
    if (activeLab === 'chemistry') {
      setCoeffA(1);
      setCoeffB(1);
      setCoeffC(1);
      setCoeffD(1);
      setTitrationNaOHMl(18);
    } else if (activeLab === 'physics') {
      setVoltage(12);
      setResistance(4);
      setPendulumLength(1.0);
    } else {
      setClimateZone('rainforest');
      setSunlightPercent(75);
      setSoilMoisturePercent(70);
    }
  };

  const handleVerifyMission = () => {
    if (activeLab === 'chemistry') {
      if (chemBalance.isBalanced) {
        setMissionFeedback(
          'Mission Verified: Law of Conservation of Mass satisfied! Left and right atom counts are equal.'
        );
        onCompleteMission?.('Stoichiometry & Chemical Equation Balancing', 95);
      } else {
        setMissionFeedback(
          'Not balanced yet: Adjust the stoichiometric coefficients until every element has equal atoms on both sides.'
        );
      }
    } else if (activeLab === 'physics') {
      if (physMetrics.currentAmps === 3) {
        setMissionFeedback(
          `Mission Verified: Circuit delivers exactly 3.0 A (${voltage}V ÷ ${resistance}Ω) with pendulum period ${physMetrics.pendulumPeriodSec}s.`
        );
        onCompleteMission?.('Electric Circuits & Harmonic Motion', 92);
      } else {
        setMissionFeedback(
          `Current is ${physMetrics.currentAmps} A. Mission Goal: Adjust Voltage (V) and Resistance (R) so current I = V / R equals exactly 3.0 A.`
        );
      }
    } else {
      if (phloemSucroseRate >= 10 && xylemFlowRate >= 10) {
        setMissionFeedback(
          `Mission Verified: Optimal Cassava tuber translocation achieved (${phloemSucroseRate} mg/h sucrose, ${xylemFlowRate} mL/h xylem pull).`
        );
        onCompleteMission?.('Plant Physiology & Vascular Transport', 90);
      } else {
        setMissionFeedback(
          'Increase sunlight intensity and soil moisture so both Xylem water transport and Phloem sugar translocation reach at least 10.0 units.'
        );
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* ORION Labs Simulation vs Real-World Experiment Banner */}
      <div className="p-4 rounded-xl border border-[#E6A65D]/50 bg-[#102D2A] text-[#F7F3E9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-[#E6A65D] flex flex-wrap items-center gap-2 font-display">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <OrionWordmark height={13} variant="ivory" />
            <span>Labs · Explore • Experiment • Discover — Mathematical Simulation vs. Physical Laboratory</span>
          </div>
          <p className="text-xs text-[#F7F3E9]/85">
            ORION Labs uses deterministic mathematical equations to model chemical stoichiometry, Ohm’s Law circuits, and plant physiology. In a physical school laboratory, always wear eye protection, add acid to water slowly, and never short-circuit live batteries.
          </p>
        </div>
        <button
          type="button"
          onClick={resetCurrentLab}
          className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#65A995]/50 text-xs font-medium text-[#F7F3E9] hover:bg-[#143834] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-center"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#E6A65D]" />
          <span>Reset ORION Lab</span>
        </button>
      </div>

      {/* Lab Module Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveLab('chemistry');
              setMissionFeedback(null);
            }}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeLab === 'chemistry'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FlaskConical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Chemistry: Stoichiometry & Titration</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveLab('physics');
              setMissionFeedback(null);
            }}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeLab === 'physics'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Physics: Ohm’s Law & Pendulum</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveLab('biology');
              setMissionFeedback(null);
            }}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeLab === 'biology'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sprout className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Biology: Xylem & Phloem Transport</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span>Curriculum Level: JSS 2 – SSS 3</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span>Interactive Parameter Sandbox</span>
        </div>
      </div>

      {/* Two-Zone Sandbox Layout (60% Interactive Stage, 40% Control & Concept Deck) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT / TOP ZONE: Interactive Visual Stage (7 cols) */}
        <div
          data-testid="discovery-lab-stage"
          className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between"
        >
          {activeLab === 'chemistry' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Chemical Equation Conservation & Titration Stage
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Adjust reactant and product coefficients so total atoms on left and right reach equilibrium
                  </p>
                </div>
                <div className="text-xs font-mono tabular-nums font-semibold">
                  {chemBalance.isBalanced ? (
                    <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />● BALANCED EQUILIBRIUM
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />▲ IMBALANCED ATOMS
                    </span>
                  )}
                </div>
              </div>

              {/* Live Formula Display */}
              <div className="p-5 rounded-xl bg-slate-950 text-white font-mono text-center text-lg sm:text-xl tracking-wide border border-slate-800">
                {selectedReaction === 'haber' && (
                  <span>
                    <strong className="text-emerald-400">{coeffA}</strong> N₂(g) +{' '}
                    <strong className="text-sky-400">{coeffB}</strong> H₂(g) ⇌{' '}
                    <strong className="text-amber-400">{coeffC}</strong> NH₃(g)
                  </span>
                )}
                {selectedReaction === 'water' && (
                  <span>
                    <strong className="text-sky-400">{coeffA}</strong> H₂(g) +{' '}
                    <strong className="text-rose-400">{coeffB}</strong> O₂(g) →{' '}
                    <strong className="text-emerald-400">{coeffC}</strong> H₂O(l)
                  </span>
                )}
                {selectedReaction === 'combustion' && (
                  <span>
                    <strong className="text-emerald-400">{coeffA}</strong> C₃H₈ +{' '}
                    <strong className="text-rose-400">{coeffB}</strong> O₂ →{' '}
                    <strong className="text-amber-400">{coeffC}</strong> CO₂ +{' '}
                    <strong className="text-sky-400">{coeffD}</strong> H₂O
                  </span>
                )}
              </div>

              {/* Atom Balance Comparison Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(chemBalance.atomDiffs).map(([element, counts]) => {
                  const matched = counts.left === counts.right;
                  return (
                    <div
                      key={element}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">Element {element}</span>
                        <span
                          className={`font-mono tabular-nums ${
                            matched
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {matched ? '● EQUAL' : '▲ UNEQUAL'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        <span>Reactants: {counts.left}</span>
                        <span>Products: {counts.right}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-150 ${
                            matched ? 'bg-emerald-600' : 'bg-amber-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (counts.left / Math.max(1, counts.left + counts.right)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SVG Titration & Molecular Stage */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Acid-Base Titration Monitor (25.0 mL of 0.10 M HCl + 0.10 M NaOH)
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Phenolphthalein indicator turns pink at equivalence point (25.0 mL NaOH, pH ≥ 7.0).
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <svg className="w-20 h-24 shrink-0" viewBox="0 0 80 96" aria-label="Conical Flask Indicator">
                    <path
                      d="M30 12 H50 M34 12 V32 L14 78 C12 83 15 88 21 88 H59 C65 88 68 83 66 78 L46 32 V12"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="none"
                      className="text-slate-400 dark:text-slate-500"
                    />
                    <path
                      d="M19 66 L61 66 L65 78 C66 82 64 86 59 86 H21 C16 86 14 82 15 78 Z"
                      fill={
                        currentPH < 6.8
                          ? '#38bdf8'
                          : currentPH === 7.0
                          ? '#34d399'
                          : '#f472b6'
                      }
                      fillOpacity="0.65"
                    />
                  </svg>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      NaOH Added: {titrationNaOHMl.toFixed(1)} mL
                    </div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">
                      pH {currentPH.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      {currentPH < 6.8
                        ? '● Acidic (Colourless)'
                        : currentPH <= 7.2
                        ? '● Equivalence Point'
                        : '▲ Alkaline (Pink)'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeLab === 'physics' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    DC Circuit (Ohm’s Law) & Simple Harmonic Pendulum
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Observe current I = V / R and pendulum oscillation period T = 2π√(L/g)
                  </p>
                </div>
                <div className="text-xs font-mono tabular-nums font-semibold text-sky-700 dark:text-sky-400">
                  {physMetrics.currentAmps <= 5 ? '● NOMINAL LOAD' : '▲ HIGH CURRENT'}
                </div>
              </div>

              {/* Interactive SVG Circuit & Pendulum Diagram */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-950 text-white p-5 rounded-xl border border-slate-800">
                <svg className="w-full h-44" viewBox="0 0 260 160" aria-label="Ohm's Law Circuit Diagram">
                  <rect
                    x="24"
                    y="28"
                    width="212"
                    height="104"
                    rx="8"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                  />
                  {/* Battery Left */}
                  <rect x="12" y="64" width="24" height="32" fill="#0f172a" />
                  <line x1="14" y1="72" x2="34" y2="72" stroke="#34d399" strokeWidth="3" />
                  <line x1="18" y1="84" x2="30" y2="84" stroke="#34d399" strokeWidth="2" />
                  <text x="42" y="82" fill="#34d399" fontSize="11" fontFamily="monospace">
                    {voltage}V
                  </text>
                  {/* Resistor Top */}
                  <rect x="95" y="18" width="70" height="20" rx="4" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
                  <text x="108" y="32" fill="#fbbf24" fontSize="11" fontFamily="monospace">
                    R = {resistance}Ω
                  </text>
                  {/* Ammeter Bottom */}
                  <circle cx="130" cy="132" r="18" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <text x="115" y="136" fill="#f8fafc" fontSize="10" fontFamily="monospace">
                    {physMetrics.currentAmps}A
                  </text>
                </svg>

                <svg className="w-full h-44" viewBox="0 0 200 160" aria-label="Simple Pendulum Diagram">
                  <line x1="60" y1="16" x2="140" y2="16" stroke="#94a3b8" strokeWidth="3" />
                  <line
                    x1="100"
                    y1="16"
                    x2="132"
                    y2={Math.min(136, 45 + pendulumLength * 42)}
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="100"
                    y1="16"
                    x2="100"
                    y2={Math.min(140, 48 + pendulumLength * 42)}
                    stroke="#34d399"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="100"
                    cy={Math.min(140, 48 + pendulumLength * 42)}
                    r="12"
                    fill="#10b981"
                  />
                  <text x="18" y="148" fill="#cbd5e1" fontSize="11" fontFamily="monospace">
                    L={pendulumLength.toFixed(1)}m | T={physMetrics.pendulumPeriodSec}s
                  </text>
                </svg>
              </div>

              {/* Telemetry Readout Row */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Current (I = V/R)</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                    {physMetrics.currentAmps} A
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Power (P = VI)</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                    {physMetrics.powerWatts} W
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Period (T)</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                    {physMetrics.pendulumPeriodSec} s
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeLab === 'biology' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Plant Vascular Bundle Simulator (Xylem & Phloem)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Compare upward water transpiration pull in Xylem with sucrose translocation to Cassava tubers in Phloem
                  </p>
                </div>
                <div className="text-xs font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                  ● ACTIVE TRANSLOCATION
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-950 text-white p-5 rounded-xl border border-slate-800">
                <svg className="w-full h-44" viewBox="0 0 240 160" aria-label="Xylem and Phloem Vascular Diagram">
                  {/* Stem Outline */}
                  <rect x="60" y="14" width="120" height="132" rx="12" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
                  {/* Xylem Vessel (Left - Cerulean Blue Upward Flow) */}
                  <rect x="82" y="22" width="30" height="116" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="86" y="42" fill="#7dd3fc" fontSize="10" fontFamily="monospace">
                    XYLEM
                  </text>
                  <path d="M97 125 V55 M91 63 L97 53 L103 63" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
                  {/* Phloem Sieve Tube (Right - Golden Marigold Bidirectional Flow) */}
                  <rect x="128" y="22" width="30" height="116" fill="#422006" stroke="#eab308" strokeWidth="1.5" />
                  <text x="130" y="42" fill="#fde047" fontSize="9" fontFamily="monospace">
                    PHLOEM
                  </text>
                  <path d="M143 55 V125 M137 117 L143 127 L149 117" stroke="#eab308" strokeWidth="2.5" fill="none" />
                </svg>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-sky-400 font-semibold">Xylem Water & Mineral Uptake (↑ Upward)</div>
                    <div className="text-xl font-bold font-mono tabular-nums mt-1">
                      {xylemFlowRate} mL / hr
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      Driven by cohesion-tension & leaf transpiration pull
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-amber-400 font-semibold">Phloem Sucrose Translocation (↓ To Root Tuber)</div>
                    <div className="text-xl font-bold font-mono tabular-nums mt-1">
                      {phloemSucroseRate} mg / hr
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      Transports photosynthesized sugars from leaf source to root sink
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {missionFeedback && (
            <div className="mt-5 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/80 dark:bg-emerald-950/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{missionFeedback}</span>
            </div>
          )}
        </div>

        {/* RIGHT / BOTTOM ZONE: Parameter Controls & Guided Mission Deck (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-6">
          {activeLab === 'chemistry' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Reaction & Stoichiometry Controls</span>
              </div>

              <div>
                <label
                  htmlFor="chem-reaction-select"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Select Chemical Equation
                </label>
                <select
                  id="chem-reaction-select"
                  value={selectedReaction}
                  onChange={(e) => {
                    setSelectedReaction(e.target.value as 'haber' | 'combustion' | 'water');
                    setCoeffA(1);
                    setCoeffB(1);
                    setCoeffC(1);
                    setCoeffD(1);
                  }}
                  className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  <option value="haber">Haber Process: a N₂ + b H₂ ⇌ c NH₃</option>
                  <option value="water">Water Synthesis: a H₂ + b O₂ → c H₂O</option>
                  <option value="combustion">Propane Combustion: a C₃H₈ + b O₂ → c CO₂ + d H₂O</option>
                </select>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="coeff-a-slider" className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span>Reactant 1 Coefficient (a)</span>
                    <span className="font-mono tabular-nums font-semibold">{coeffA} mol</span>
                  </label>
                  <input
                    id="coeff-a-slider"
                    type="range"
                    min={1}
                    max={6}
                    value={coeffA}
                    onChange={(e) => setCoeffA(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="coeff-b-slider" className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span>Reactant 2 Coefficient (b)</span>
                    <span className="font-mono tabular-nums font-semibold">{coeffB} mol</span>
                  </label>
                  <input
                    id="coeff-b-slider"
                    type="range"
                    min={1}
                    max={6}
                    value={coeffB}
                    onChange={(e) => setCoeffB(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="coeff-c-slider" className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span>Product 1 Coefficient (c)</span>
                    <span className="font-mono tabular-nums font-semibold">{coeffC} mol</span>
                  </label>
                  <input
                    id="coeff-c-slider"
                    type="range"
                    min={1}
                    max={6}
                    value={coeffC}
                    onChange={(e) => setCoeffC(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                </div>

                {selectedReaction === 'combustion' && (
                  <div>
                    <label htmlFor="coeff-d-slider" className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                      <span>Product 2 Coefficient (d for H₂O)</span>
                      <span className="font-mono tabular-nums font-semibold">{coeffD} mol</span>
                    </label>
                    <input
                      id="coeff-d-slider"
                      type="range"
                      min={1}
                      max={6}
                      value={coeffD}
                      onChange={(e) => setCoeffD(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label htmlFor="titration-slider" className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span>Titration Burette Volume (0.10 M NaOH)</span>
                    <span className="font-mono tabular-nums font-semibold">{titrationNaOHMl.toFixed(1)} mL</span>
                  </label>
                  <input
                    id="titration-slider"
                    type="range"
                    min={0}
                    max={50}
                    step={0.5}
                    value={titrationNaOHMl}
                    onChange={(e) => setTitrationNaOHMl(Number(e.target.value))}
                    className="w-full accent-sky-600"
                  />
                </div>
              </div>
            </div>
          )}

          {activeLab === 'physics' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Sliders className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Circuit & Pendulum Parameters</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="voltage-slider" className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span>Battery Potential Difference (V)</span>
                    <span className="font-mono tabular-nums font-semibold">{voltage} V</span>
                  </label>
                  <input
                    id="voltage-slider"
                    type="range"
                    min={3}
                    max={24}
                    step={1}
                    value={voltage}
                    onChange={(e) => setVoltage(Number(e.target.value))}
                    className="w-full accent-sky-600"
                  />
                </div>

                <div>
                  <label htmlFor="resistance-slider" className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span>Load Resistance (R)</span>
                    <span className="font-mono tabular-nums font-semibold">{resistance} Ω</span>
                  </label>
                  <input
                    id="resistance-slider"
                    type="range"
                    min={1}
                    max={12}
                    step={1}
                    value={resistance}
                    onChange={(e) => setResistance(Number(e.target.value))}
                    className="w-full accent-sky-600"
                  />
                </div>

                <div>
                  <label htmlFor="pendulum-slider" className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span>Pendulum String Length (L)</span>
                    <span className="font-mono tabular-nums font-semibold">{pendulumLength.toFixed(1)} m</span>
                  </label>
                  <input
                    id="pendulum-slider"
                    type="range"
                    min={0.2}
                    max={2.5}
                    step={0.1}
                    value={pendulumLength}
                    onChange={(e) => setPendulumLength(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>
            </div>
          )}

          {activeLab === 'biology' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Environmental & Climatic Variables</span>
              </div>

              <div>
                <label
                  htmlFor="climate-zone-select"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Nigerian Ecological Zone
                </label>
                <select
                  id="climate-zone-select"
                  value={climateZone}
                  onChange={(e) => setClimateZone(e.target.value as 'rainforest' | 'savannah_harmattan')}
                  className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  <option value="rainforest">Southern Tropical Rainforest (High Humidity)</option>
                  <option value="savannah_harmattan">Northern Guinea Savannah / Dry Harmattan Wind</option>
                </select>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="sunlight-slider" className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span>Sunlight Intensity (Photosynthesis Rate)</span>
                    <span className="font-mono tabular-nums font-semibold">{sunlightPercent}%</span>
                  </label>
                  <input
                    id="sunlight-slider"
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={sunlightPercent}
                    onChange={(e) => setSunlightPercent(Number(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                </div>

                <div>
                  <label htmlFor="moisture-slider" className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span>Root Zone Soil Moisture</span>
                    <span className="font-mono tabular-nums font-semibold">{soilMoisturePercent}%</span>
                  </label>
                  <input
                    id="moisture-slider"
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={soilMoisturePercent}
                    onChange={(e) => setSoilMoisturePercent(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Guided Mission Verification Button */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              <strong className="text-slate-900 dark:text-white">Guided Lab Mission:</strong>{' '}
              {activeLab === 'chemistry' &&
                'Balance the selected chemical equation so reactant and product atom counts match.'}
              {activeLab === 'physics' &&
                'Set Voltage (V) and Resistance (R) so the circuit current equals 3.0 A.'}
              {activeLab === 'biology' &&
                'Configure sunlight and soil moisture so both Xylem and Phloem flow rates reach at least 10.0 units.'}
            </div>
            <button
              type="button"
              onClick={handleVerifyMission}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
            >
              Verify Lab Mission & Record Skill Mastery
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
