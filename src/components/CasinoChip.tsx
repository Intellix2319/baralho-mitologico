import React from 'react';
import { CHIP_DATA } from './chipImages';

export interface ChipInfo {
  value: number;
  label: string;
  bgGradient: string;
  borderColor: string;
  stripeColor: string;
  textColor: string;
  accent: string;
  icon: string;
}

export const CHIP_PRESETS: Record<number, ChipInfo> = {
  1: {
    value: 1,
    label: '1',
    bgGradient: 'from-slate-100 via-amber-100 to-amber-200',
    borderColor: 'border-amber-300',
    stripeColor: 'bg-amber-400',
    textColor: 'text-slate-900',
    accent: 'Hermes',
    icon: '🪶'
  },
  5: {
    value: 5,
    label: '5',
    bgGradient: 'from-red-600 via-red-700 to-red-900',
    borderColor: 'border-red-400',
    stripeColor: 'bg-amber-300',
    textColor: 'text-white',
    accent: 'Ares',
    icon: '⚔️'
  },
  10: {
    value: 10,
    label: '10',
    bgGradient: 'from-slate-200 via-slate-300 to-slate-400',
    borderColor: 'border-slate-400',
    stripeColor: 'bg-slate-700',
    textColor: 'text-slate-900',
    accent: 'Hermes',
    icon: '🪶'
  },
  25: {
    value: 25,
    label: '25',
    bgGradient: 'from-amber-600 via-amber-700 to-amber-900',
    borderColor: 'border-amber-500',
    stripeColor: 'bg-amber-300',
    textColor: 'text-white',
    accent: 'Atena',
    icon: '🦉'
  },
  50: {
    value: 50,
    label: '50',
    bgGradient: 'from-red-600 via-red-700 to-red-900',
    borderColor: 'border-red-400',
    stripeColor: 'bg-white',
    textColor: 'text-white',
    accent: 'Ares',
    icon: '⚔️'
  },
  100: {
    value: 100,
    label: '100',
    bgGradient: 'from-emerald-600 via-emerald-700 to-emerald-900',
    borderColor: 'border-emerald-400',
    stripeColor: 'bg-emerald-200',
    textColor: 'text-white',
    accent: 'Cérbero',
    icon: '🌿'
  },
  500: {
    value: 500,
    label: '500',
    bgGradient: 'from-blue-600 via-blue-700 to-blue-900',
    borderColor: 'border-blue-400',
    stripeColor: 'bg-cyan-200',
    textColor: 'text-white',
    accent: 'Poseidon',
    icon: '🔱'
  },
  1000: {
    value: 1000,
    label: '1K',
    bgGradient: 'from-zinc-800 via-zinc-900 to-black',
    borderColor: 'border-amber-400',
    stripeColor: 'bg-amber-400',
    textColor: 'text-amber-300',
    accent: 'Hades',
    icon: '💀'
  },
  5000: {
    value: 5000,
    label: '5K',
    bgGradient: 'from-amber-400 via-amber-500 to-amber-600',
    borderColor: 'border-yellow-200',
    stripeColor: 'bg-slate-950',
    textColor: 'text-slate-950',
    accent: 'Zeus',
    icon: '⚡'
  },
  10000: {
    value: 10000,
    label: '10K',
    bgGradient: 'from-purple-600 via-purple-700 to-indigo-900',
    borderColor: 'border-purple-300',
    stripeColor: 'bg-pink-300',
    textColor: 'text-white',
    accent: 'Olimpo',
    icon: '★'
  }
};

// High-res WebP chip images (512x512) with transparent backgrounds
export const CHIP_IMAGE_MAP: Record<number, string> = {
  1: CHIP_DATA[1],
  5: CHIP_DATA[5],
  25: CHIP_DATA[25],
  50: CHIP_DATA[25],
  100: CHIP_DATA[100],
  500: CHIP_DATA[500],
  1000: CHIP_DATA[100],
  5000: CHIP_DATA[500],
  10000: CHIP_DATA[500]
};

// Immediate client-side in-memory preloading for zero-delay instant display
if (typeof window !== 'undefined') {
  [
    '/assets/chips/chip_1.webp',
    '/assets/chips/chip_5.webp',
    '/assets/chips/chip_25.webp',
    '/assets/chips/chip_100.webp',
    '/assets/chips/chip_500.webp'
  ].forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

// Background tint fallbacks while image decodes
const CHIP_BG_FALLBACKS: Record<number, string> = {
  1: 'bg-amber-100/10 border-amber-300/40',
  5: 'bg-red-900/30 border-red-500/40',
  25: 'bg-emerald-900/30 border-emerald-500/40',
  50: 'bg-emerald-900/30 border-emerald-500/40',
  100: 'bg-neutral-900/60 border-amber-500/40',
  500: 'bg-purple-900/40 border-purple-400/40'
};

interface CasinoChipProps {
  value: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  count?: number;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
}

export const CasinoChip: React.FC<CasinoChipProps> = ({
  value,
  size = 'md',
  count,
  onClick,
  disabled = false,
  selected = false
}) => {
  const chipImg =
    CHIP_IMAGE_MAP[value] ||
    (value < 25
      ? CHIP_IMAGE_MAP[5]
      : value < 100
      ? CHIP_IMAGE_MAP[25]
      : value < 500
      ? CHIP_IMAGE_MAP[100]
      : CHIP_IMAGE_MAP[500]);

  const bgFallback =
    CHIP_BG_FALLBACKS[value] ||
    (value < 25
      ? CHIP_BG_FALLBACKS[5]
      : value < 100
      ? CHIP_BG_FALLBACKS[25]
      : value < 500
      ? CHIP_BG_FALLBACKS[100]
      : CHIP_BG_FALLBACKS[500]);

  // Enhanced and enlarged sizes requested by user
  const sizeClasses = {
    sm: 'w-11 h-11 sm:w-12 sm:h-12 short:w-9 short:h-9 tiny:w-8 tiny:h-8',
    md: 'w-14 h-14 sm:w-16 sm:h-16',
    lg: 'w-18 h-18 sm:w-20 sm:h-20',
    xl: 'w-24 h-24 sm:w-28 sm:h-28'
  }[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center select-none rounded-full transition-all duration-150 shrink-0 ${sizeClasses} ${bgFallback} ${
        disabled
          ? 'opacity-40 cursor-not-allowed filter grayscale'
          : 'cursor-pointer hover:scale-110 hover:-translate-y-0.5 active:scale-95'
      } ${
        selected
          ? 'scale-110 ring-2 ring-amber-400 drop-shadow-[0_0_14px_rgba(245,158,11,0.85)]'
          : 'drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)]'
      }`}
      title={`Ficha de $${value.toLocaleString()}`}
    >
      <img
        src={chipImg}
        alt={`Ficha ${value}`}
        loading="eager"
        decoding="async"
        className="w-full h-full object-contain pointer-events-none drop-shadow-sm transition-transform"
        onError={(e) => {
          // Fallback to PNG if webp fails in legacy browser
          const target = e.target as HTMLImageElement;
          if (target.src.endsWith('.webp')) {
            target.src = target.src.replace('.webp', '.png');
          }
        }}
      />

      {/* Stack Count Badge */}
      {count !== undefined && count > 1 && (
        <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full shadow-lg border border-amber-300 z-20 leading-none">
          ×{count}
        </span>
      )}
    </button>
  );
};
