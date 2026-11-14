import React from 'react';

/**
 * Official ORION Brand Identity & Visual System
 * Reference:
 * 1. Authoritative ORION Brand Identity Board
 * 2. Paul Laxa's "Orion" Custom Vector Wordmark (Dribbble Shot #20552346-Orion)
 *
 * Official Palette:
 * - Forest Green (Orion Teal): #102D2A
 * - Growth Teal (Growth Green): #65A995
 * - Discovery Gold: #E6A65D
 * - Warm Ivory (Pure Ivory): #F7F3E9
 */
export const ORION_BRAND = {
  name: 'ORION',
  tagline: 'Discover beyond what you know.',
  positioning: 'An AI-powered learning ecosystem for Nigeria and beyond.',
  motto: 'Learn. Teach. Grow.',
  colors: {
    forestGreen: '#102D2A',
    forestDeep: '#0A1F1D',
    forestCard: '#133531',
    growthTeal: '#65A995',
    discoveryGold: '#E6A65D',
    warmIvory: '#F7F3E9',
  },
  modules: {
    learn: {
      id: 'learn',
      name: 'ORION Learn',
      accentWord: 'Learn',
      pillars: 'Study • Practice • Excel',
      description:
        'Student learning, independent study, Socratic AI tutoring, textbook-free digital library, assessments, and learning missions.',
    },
    teach: {
      id: 'teach',
      name: 'ORION Teach',
      accentWord: 'Teach',
      pillars: 'Plan • Create • Inspire',
      description:
        'Teacher workspace with 12-week term schemes of work, comprehensive lesson notes, classroom resources, and skill-gap diagnostics.',
    },
    schools: {
      id: 'schools',
      name: 'ORION Schools',
      accentWord: 'Schools',
      pillars: 'Manage • Monitor • Improve',
      description:
        'School administration, 11-tier curriculum governance, custom school overlays, teacher content approvals, and mastery analytics.',
    },
    labs: {
      id: 'labs',
      name: 'ORION Labs',
      accentWord: 'Labs',
      pillars: 'Explore • Experiment • Discover',
      description:
        'Virtual science laboratories, stoichiometry & titration models, Ohm’s Law circuits, and plant vascular transport simulations.',
    },
  },
} as const;

export interface OrionMarkIconProps {
  size?: number;
  variant?: 'dark' | 'transparent' | 'light' | 'monochrome';
  className?: string;
  title?: string;
}

/**
 * Official ORION Logo Symbol & Application Icon
 * Faithfully reproduces the FIRST DARK-THEMED APPLICATION ICON from the official reference board:
 * 1. Deep Forest-Green (#102D2A) rounded-square background with subtle Growth Teal (#65A995) rim.
 * 2. Warm Ivory (#F7F3E9) dynamic human-inspired figure reaching upward toward the upper-right star.
 * 3. Discovery Gold (#E6A65D) sweeping crescent/orbital curves (upper-left arc reaching to the star + lower bridging arc).
 * 4. Growth Teal (#65A995) horizon/leaf accent nestled above the lower gold arc.
 * 5. Discovery Gold (#E6A65D) four-point star positioned at the upper-right apex above the reaching hand.
 */
export const OrionMarkIcon: React.FC<OrionMarkIconProps> = ({
  size = 44,
  variant = 'dark',
  className = '',
  title = 'ORION Official Brand Mark',
}) => {
  const isLightSurface = variant === 'light';
  const isMono = variant === 'monochrome';

  const bgFill =
    variant === 'dark'
      ? '#102D2A'
      : variant === 'light'
      ? '#F7F3E9'
      : 'none';
  const borderStroke =
    variant === 'dark'
      ? '#24524C'
      : variant === 'light'
      ? '#D6CEBF'
      : 'none';

  const figureFill = isMono
    ? 'currentColor'
    : isLightSurface
    ? '#102D2A'
    : '#F7F3E9';
  const goldFill = isMono ? 'currentColor' : '#E6A65D';
  const tealFill = isMono ? 'currentColor' : '#65A995';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id="orionGoldGrad" x1="16" y1="96" x2="104" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D68C3E" />
          <stop offset="55%" stopColor="#E6A65D" />
          <stop offset="100%" stopColor="#F5C478" />
        </linearGradient>
        <linearGradient id="orionBgGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#143834" />
          <stop offset="100%" stopColor="#0C2421" />
        </linearGradient>
      </defs>

      {/* Rounded-Square App Icon Container (First Dark-Themed Icon) */}
      {variant !== 'transparent' && (
        <rect
          x="3"
          y="3"
          width="114"
          height="114"
          rx="26"
          fill={variant === 'dark' ? 'url(#orionBgGrad)' : bgFill}
          stroke={borderStroke}
          strokeWidth="2"
        />
      )}

      {/* Upper-Left Sweeping Discovery Gold Orbital Crescent Reaching to the Star */}
      <path
        d="M 22 80 C 17 50, 44 24, 83 24 C 57 28, 35 47, 33 73 C 30 75, 25 78, 22 80 Z"
        fill={isMono ? goldFill : 'url(#orionGoldGrad)'}
      />

      {/* Growth Teal (#65A995) Horizon / Leaf Accent */}
      <path
        d="M 41 64 C 52 57, 67 57, 79 64 C 68 62, 53 62, 41 64 Z"
        fill={tealFill}
      />

      {/* Lower Discovery Gold Sweeping Crescent Arc Bridging Left-to-Right */}
      <path
        d="M 15 92 C 31 64, 73 61, 95 96 C 75 74, 39 74, 15 92 Z"
        fill={isMono ? goldFill : 'url(#orionGoldGrad)'}
      />

      {/* Dynamic Warm Ivory (#F7F3E9) Human-Inspired Figure Reaching Upward to the Star */}
      <circle cx="59" cy="44" r="8.2" fill={figureFill} />
      <path
        d="M 33 65 C 44 56, 56 54, 66 54 C 74 45, 81 35, 87 24 C 84 40, 77 54, 68 67 C 60 80, 48 93, 33 103 C 43 89, 51 77, 55 66 C 46 64, 39 64, 33 65 Z"
        fill={figureFill}
      />

      {/* Discovery Gold (#E6A65D) Four-Point Star at Upper-Right Apex */}
      <path
        d="M 92 8 L 95.2 19.8 L 107 23 L 95.2 26.2 L 92 38 L 88.8 26.2 L 77 23 L 88.8 19.8 Z"
        fill={goldFill}
      />
    </svg>
  );
};

export interface OrionWordmarkProps {
  height?: number;
  variant?: 'ivory' | 'forest' | 'gold' | 'monochrome';
  tracking?: 'lockup' | 'wide';
  className?: string;
  ariaLabel?: string;
}

/**
 * PAUL LAXA ORION WORDMARK — Mandatory Custom Vector Lettering Reproduction
 *
 * Faithfully reproduces the exact custom geometric letter construction from
 * Paul Laxa's "Orion" brand design (Dribbble #20552346-Orion):
 * 1. 'O' (First): Geometric circular ring (outer diameter 74, inner counter diameter 45, stroke weight 14.5).
 * 2. 'R': Paul Laxa's signature open-left geometric ribbon 'R' with NO left vertical stem;
 *    its top-left bevel (0,0 -> 9.5,14.5) and lower diagonal leg inner edge (25,38 -> 49.5,74)
 *    are aligned along the exact same collinear 56.3° diagonal trajectory (dx/dy = 2/3).
 * 3. 'I': Clean vertical geometric pillar matching the exact 14.5-unit stroke weight.
 * 4. 'O' (Second): Identical circular ring to the first 'O'.
 * 5. 'N': Paul Laxa's signature cut-stem geometric 'N' where the left vertical stem
 *    terminates early with a sharp 56.3° diagonal bevel cut (leaving the lower-left open)
 *    parallel to the main diagonal stroke, paired with a rounded/beveled top-right shoulder.
 */
export const OrionWordmark: React.FC<OrionWordmarkProps> = ({
  height = 32,
  variant = 'ivory',
  tracking = 'lockup',
  className = '',
  ariaLabel = 'ORION',
}) => {
  const fill =
    variant === 'ivory'
      ? '#F7F3E9'
      : variant === 'forest'
      ? '#102D2A'
      : variant === 'gold'
      ? '#E6A65D'
      : 'currentColor';

  // 'wide' uses Paul Laxa's wide luxury showcase spacing; 'lockup' uses balanced lockup spacing
  const isWide = tracking === 'wide';
  const viewBoxWidth = isWide ? 492 : 408;
  const width = Math.round((height * viewBoxWidth) / 86);

  // Horizontal X-offsets for the 5 custom letters (each 74 units tall, y=6..80)
  const xO1 = 4;
  const xR = isWide ? 120 : 96;
  const xI = isWide ? 240 : 190;
  const xO2 = isWide ? 300 : 226;
  const xN = isWide ? 418 : 320;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${viewBoxWidth} 86`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ariaLabel}
      className={`shrink-0 select-none ${className}`}
    >
      {/* 1. Letter O (First) — Circular Ring: Center=(xO1+37, 43), Outer R=37, Inner R=22.5 */}
      <g transform={`translate(${xO1}, 6)`}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M 37 0 C 57.43 0, 74 16.57, 74 37 C 74 57.43, 57.43 74, 37 74 C 16.57 74, 0 57.43, 0 37 C 0 16.57, 16.57 0, 37 0 Z M 37 14.5 C 24.57 14.5, 14.5 24.57, 14.5 37 C 14.5 49.43, 24.57 59.5, 37 59.5 C 49.43 59.5, 59.5 49.43, 59.5 37 C 59.5 24.57, 49.43 14.5, 37 14.5 Z"
          fill={fill}
        />
      </g>

      {/* 2. Letter R — Paul Laxa's Signature Open-Left Collinear Diagonal-Bevel Ribbon R */}
      <g transform={`translate(${xR}, 6)`}>
        <path
          d="M 0 0 H 48.5 C 63.1 0, 74.5 11.2, 74.5 25.5 C 74.5 36.8, 67.3 46.2, 56.8 49.6 L 73 74 H 55.8 L 31.8 38 H 47.5 C 54.4 38, 60 32.5, 60 25.5 C 60 18.5, 54.4 13, 47.5 13 H 8.7 L 0 0 Z"
          fill={fill}
        />
      </g>

      {/* 3. Letter I — Geometric Vertical Pillar (Width=14.5, Height=74) */}
      <g transform={`translate(${xI}, 6)`}>
        <rect x="0" y="0" width="14.5" height="74" fill={fill} />
      </g>

      {/* 4. Letter O (Second) — Circular Ring: Center=(xO2+37, 43), Outer R=37, Inner R=22.5 */}
      <g transform={`translate(${xO2}, 6)`}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M 37 0 C 57.43 0, 74 16.57, 74 37 C 74 57.43, 57.43 74, 37 74 C 16.57 74, 0 57.43, 0 37 C 0 16.57, 16.57 0, 37 0 Z M 37 14.5 C 24.57 14.5, 14.5 24.57, 14.5 37 C 14.5 49.43, 24.57 59.5, 37 59.5 C 49.43 59.5, 59.5 49.43, 59.5 37 C 59.5 24.57, 49.43 14.5, 37 14.5 Z"
          fill={fill}
        />
      </g>

      {/* 5. Letter N — Paul Laxa's Signature Diagonal-Cut Shortened Left Stem + Beveled Right Stem */}
      <g transform={`translate(${xN}, 6)`}>
        <path
          d="M 0 0 H 14.5 L 52.5 55.5 V 0 C 60.5 0, 67 6.5, 67 14.5 V 74 H 52.5 L 14.5 18.5 V 57.5 L 0 36.5 V 0 Z"
          fill={fill}
        />
      </g>
    </svg>
  );
};

/**
 * Reusable Inline ORION Module Title Lockup
 * Ensures every prominent mention of "ORION Learn", "ORION Teach", "ORION Schools", "ORION Labs"
 * or "ORION AI Tutor" renders the custom Paul Laxa vector wordmark instead of ordinary font text.
 */
export const OrionModuleTitle: React.FC<{
  suffix?: string;
  height?: number;
  variant?: 'ivory' | 'forest' | 'monochrome';
  suffixColorClass?: string;
  className?: string;
}> = ({
  suffix,
  height = 18,
  variant = 'monochrome',
  suffixColorClass = 'text-[#E6A65D]',
  className = '',
}) => (
  <span className={`inline-flex items-center gap-2 align-middle ${className}`}>
    <OrionWordmark height={height} variant={variant} tracking="lockup" />
    {suffix && (
      <span className={`font-display font-bold tracking-tight ${suffixColorClass}`}>
        {suffix}
      </span>
    )}
  </span>
);

/**
 * Signature Discovery Gold Underline Swoosh from the Reference Board
 */
export const OrionGoldSwoosh: React.FC<{ width?: number; className?: string }> = ({
  width = 160,
  className = '',
}) => (
  <svg
    width={width}
    height={Math.round(width * 0.09)}
    viewBox="0 0 220 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={`select-none ${className}`}
  >
    <path
      d="M 4 17 C 68 3, 152 2, 216 13 C 152 8, 72 9, 4 17 Z"
      fill="#E6A65D"
    />
  </svg>
);

export interface OrionBrandLockupProps {
  mode?: 'navbar' | 'header' | 'hero';
  theme?: 'dark' | 'light';
  className?: string;
}

/**
 * Official ORION Horizontal Lockup Component
 * Combines:
 * - First dark-themed ORION application icon
 * - Custom Paul Laxa ORION vector wordmark
 * - Official tagline: "Discover beyond what you know."
 */
export const OrionBrandLockup: React.FC<OrionBrandLockupProps> = ({
  mode = 'navbar',
  theme = 'dark',
  className = '',
}) => {
  const isDark = theme === 'dark';

  if (mode === 'navbar') {
    return (
      <span className={`inline-flex items-center gap-3 ${className}`}>
        <OrionMarkIcon size={38} variant="dark" />
        <span
          className={`h-6 w-px ${
            isDark ? 'bg-[#65A995]/35' : 'bg-[#102D2A]/20'
          }`}
          aria-hidden="true"
        />
        <span className="flex flex-col items-start leading-none">
          <OrionWordmark
            height={19}
            variant={isDark ? 'ivory' : 'forest'}
            tracking="lockup"
          />
          <span
            className={`text-[10px] italic font-medium tracking-wide mt-1 ${
              isDark ? 'text-[#F7F3E9]/85' : 'text-[#102D2A]/80'
            }`}
          >
            Discover beyond what you know.
          </span>
        </span>
      </span>
    );
  }

  if (mode === 'header') {
    return (
      <div className={`inline-flex items-center gap-4 ${className}`}>
        <OrionMarkIcon size={52} variant="dark" />
        <span
          className={`h-10 w-px ${
            isDark ? 'bg-[#F7F3E9]/25' : 'bg-[#102D2A]/20'
          }`}
          aria-hidden="true"
        />
        <div className="flex flex-col items-start">
          <OrionWordmark
            height={28}
            variant={isDark ? 'ivory' : 'forest'}
            tracking="lockup"
          />
          <span
            className={`text-xs italic font-medium mt-1 ${
              isDark ? 'text-[#F7F3E9]/90' : 'text-[#102D2A]/85'
            }`}
          >
            Discover beyond what you know.
          </span>
        </div>
      </div>
    );
  }

  // Full Hero Lockup matching the top banner of the authoritative reference image + Paul Laxa ORION Wordmark
  return (
    <div
      className={`w-full rounded-2xl bg-[#102D2A] border border-[#65A995]/30 p-6 sm:p-8 text-[#F7F3E9] shadow-xl relative overflow-hidden ${className}`}
    >
      <div
        className="pointer-events-none absolute -left-12 -bottom-16 w-72 h-44 rounded-full bg-[#65A995]/15 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8">
        {/* Left & Center: Official Emblem + Vertical Divider + Paul Laxa ORION Wordmark + Tagline */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7">
          <OrionMarkIcon size={92} variant="transparent" className="drop-shadow-md" />

          <div
            className="hidden sm:block h-20 w-px bg-[#F7F3E9]/30 shrink-0"
            aria-hidden="true"
          />

          <div className="space-y-2">
            <OrionWordmark
              height={54}
              variant="ivory"
              tracking="wide"
              className="max-w-full h-11 sm:h-14 w-auto"
            />
            <div className="flex flex-col items-start sm:items-end">
              <p className="text-sm sm:text-lg italic font-medium text-[#F7F3E9] tracking-wide font-display">
                Discover beyond what you know.
              </p>
              <OrionGoldSwoosh width={170} className="mt-1" />
            </div>
          </div>
        </div>

        {/* Right Vertical Divider */}
        <div
          className="hidden lg:block h-24 w-px bg-[#F7F3E9]/30 shrink-0"
          aria-hidden="true"
        />

        {/* Right: Ecosystem Positioning Statement */}
        <div className="space-y-2 lg:max-w-xs border-t lg:border-t-0 border-[#F7F3E9]/15 pt-4 lg:pt-0">
          <p className="text-base sm:text-lg font-medium leading-snug text-[#F7F3E9]">
            An AI-powered learning ecosystem for{' '}
            <strong className="font-bold text-[#E6A65D]">Nigeria and beyond.</strong>
          </p>
          <div className="pt-1">
            <p className="text-sm sm:text-base italic text-[#F7F3E9]/90 font-display">
              Learn. Teach. Grow.
            </p>
            <OrionGoldSwoosh width={120} className="mt-1" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Custom SVG Icons for the 4 Official ORION Modules matching the Brand Reference Board:
 * - ORION Learn (Open Book + Gold Swoosh + Teal Rays)
 * - ORION Teach (Educator at Board + Gold Swoosh)
 * - ORION Schools (Classic School Building + Gold Flag + Gold Swoosh)
 * - ORION Labs (Conical Lab Flask + Gold Bubbles + Gold Swoosh)
 */
export const OrionModuleBadgeIcon: React.FC<{
  module: 'learn' | 'teach' | 'schools' | 'labs';
  size?: number;
}> = ({ module, size = 56 }) => {
  if (module === 'learn') {
    return (
      <svg width={size} height={size} viewBox="0 0 80 72" fill="none" aria-hidden="true">
        <line x1="40" y1="6" x2="40" y2="12" stroke="#65A995" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="25" y1="10" x2="29" y2="15" stroke="#65A995" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="55" y1="10" x2="51" y2="15" stroke="#65A995" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M 16 22 C 25 20, 34 22, 40 26 C 46 22, 55 20, 64 22 V 48 C 55 46, 46 48, 40 52 C 34 48, 25 46, 16 48 V 22 Z"
          stroke="#F7F3E9"
          strokeWidth="3"
          fill="#102D2A"
        />
        <line x1="40" y1="26" x2="40" y2="52" stroke="#F7F3E9" strokeWidth="2.5" />
        <line x1="22" y1="30" x2="34" y2="31" stroke="#F7F3E9" strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="37" x2="34" y2="38" stroke="#F7F3E9" strokeWidth="2" strokeLinecap="round" />
        <line x1="46" y1="31" x2="58" y2="30" stroke="#F7F3E9" strokeWidth="2" strokeLinecap="round" />
        <line x1="46" y1="38" x2="58" y2="37" stroke="#F7F3E9" strokeWidth="2" strokeLinecap="round" />
        <path d="M 14 58 C 32 50, 48 50, 66 58 C 48 54, 32 54, 14 58 Z" fill="#E6A65D" />
      </svg>
    );
  }

  if (module === 'teach') {
    return (
      <svg width={size} height={size} viewBox="0 0 80 72" fill="none" aria-hidden="true">
        <rect x="36" y="16" width="30" height="24" rx="3" stroke="#F7F3E9" strokeWidth="2.8" fill="#102D2A" />
        <circle cx="25" cy="22" r="6.5" fill="#F7F3E9" />
        <path
          d="M 15 48 V 35 C 15 31, 19 29, 25 29 H 33 L 45 24 L 47 27.5 L 35 34 V 48 H 15 Z"
          fill="#F7F3E9"
        />
        <path d="M 14 58 C 32 50, 50 50, 66 58 C 48 54, 32 54, 14 58 Z" fill="#65A995" />
        <path d="M 18 61 C 34 54, 50 54, 66 60 C 48 57, 34 57, 18 61 Z" fill="#E6A65D" />
      </svg>
    );
  }

  if (module === 'schools') {
    return (
      <svg width={size} height={size} viewBox="0 0 80 72" fill="none" aria-hidden="true">
        <line x1="40" y1="8" x2="40" y2="18" stroke="#F7F3E9" strokeWidth="2.2" />
        <path d="M 40 8 L 51 11.5 L 40 15 Z" fill="#E6A65D" />
        <path d="M 24 28 L 40 17 L 56 28 H 24 Z" fill="#F7F3E9" />
        <rect x="18" y="28" width="44" height="22" rx="2" fill="#F7F3E9" />
        <rect x="23" y="33" width="5" height="6" fill="#102D2A" />
        <rect x="31" y="33" width="5" height="6" fill="#102D2A" />
        <rect x="44" y="33" width="5" height="6" fill="#102D2A" />
        <rect x="52" y="33" width="5" height="6" fill="#102D2A" />
        <path d="M 36 50 V 42 C 36 39.5, 44 39.5, 44 42 V 50 H 36 Z" fill="#102D2A" />
        <path d="M 14 58 C 32 50, 48 50, 66 58 C 48 54, 32 54, 14 58 Z" fill="#65A995" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 80 72" fill="none" aria-hidden="true">
      <circle cx="38" cy="11" r="2.5" fill="#E6A65D" />
      <circle cx="44" cy="16" r="3.2" fill="#E6A65D" />
      <circle cx="36" cy="20" r="2" fill="#65A995" />
      <path
        d="M 33 23 H 47 M 36 23 V 31 L 24 49 C 22.5 51.5, 24 54, 27.5 54 H 52.5 C 56 54, 57.5 51.5, 56 49 L 44 31 V 23"
        stroke="#F7F3E9"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 28 45 Q 40 42, 52 45 L 54.5 49.5 C 55.2 51, 54 52, 52 52 H 28 C 26 52, 24.8 51, 25.5 49.5 L 28 45 Z"
        fill="#E6A65D"
      />
      <path d="M 16 60 C 32 53, 48 53, 64 60 C 48 56, 32 56, 16 60 Z" fill="#E6A65D" />
    </svg>
  );
};
