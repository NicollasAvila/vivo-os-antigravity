import React from 'react';
import { ArrowRightIcon, ArrowTopRightOnSquareIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { FunnelIcon as FunnelSolidIcon } from '@heroicons/react/24/solid';

export type StatTone = 'default' | 'danger' | 'warning' | 'success' | 'neutral';
/** How the card reacts to a click: open another screen or filter a panel on this page. */
export type StatAction = 'navigate' | 'filter';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: StatTone;
  /** 0-100. When set, renders a progress track at the bottom of the card. */
  progress?: number;
  onClick?: () => void;
  /** Short sentence telling the user what the click does (e.g. "opens the filtered board"). */
  actionLabel?: string;
  actionKind?: StatAction;
  /** For `filter` cards: highlights the card whose filter is currently applied. */
  active?: boolean;
}

const tones: Record<StatTone, { chip: string; accent: string; bar: string; value: string; grad: string }> = {
  default: {
    chip: 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)]',
    accent: 'bg-[var(--color-primary-500)]',
    bar: 'bg-[var(--color-primary-500)]',
    value: 'text-gray-900',
    grad: 'to-[var(--color-primary-50)]',
  },
  neutral: {
    chip: 'bg-gray-100 text-gray-600', accent: 'bg-gray-300', bar: 'bg-gray-400',
    value: 'text-gray-900', grad: 'to-gray-100',
  },
  danger: {
    chip: 'bg-red-50 text-red-600', accent: 'bg-red-500', bar: 'bg-red-500',
    value: 'text-red-600', grad: 'to-red-50',
  },
  warning: {
    chip: 'bg-amber-50 text-amber-600', accent: 'bg-amber-500', bar: 'bg-amber-500',
    value: 'text-amber-600', grad: 'to-amber-50',
  },
  success: {
    chip: 'bg-emerald-50 text-emerald-600', accent: 'bg-emerald-500', bar: 'bg-emerald-500',
    value: 'text-gray-900', grad: 'to-emerald-50',
  },
};

const RESTING_SHADOW = 'shadow-[0_14px_36px_-16px_rgba(15,23,42,0.35)]';
const HOVER_SHADOW = 'hover:shadow-[0_22px_48px_-16px_rgba(15,23,42,0.42)]';

export default function StatCard({
  icon, label, value, hint, tone = 'default', progress, onClick,
  actionLabel, actionKind = 'navigate', active = false,
}: StatCardProps) {
  const s = tones[tone] || tones.default;
  const clickable = !!onClick;
  const pct = typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : null;
  const isFilter = actionKind === 'filter';

  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      aria-pressed={clickable && isFilter ? active : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      className={`group relative rounded-xl overflow-hidden bg-gradient-to-br ${
        active
          ? 'from-[var(--color-primary-50)] via-[var(--color-primary-50)] to-[var(--color-primary-100)]'
          : `from-white via-white ${s.grad}`
      } ${RESTING_SHADOW} transition-all duration-200 ${
        clickable
          ? `cursor-pointer ${HOVER_SHADOW} motion-safe:hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2`
          : ''
      }`}
    >
      <div className={`h-1 w-full ${s.accent} opacity-80`} />
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 leading-4">{label}</p>
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.chip}`}>{icon}</span>
        </div>
        <p className={`mt-3 text-3xl font-semibold tracking-tight leading-none ${s.value}`}>{value}</p>
        <div className="mt-2 flex items-center gap-1 min-h-[1rem]">
          {hint && <p className="text-xs text-gray-400 truncate">{hint}</p>}
          {clickable && !actionLabel && (
            <ArrowRightIcon className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 group-hover:text-gray-500 transition-all duration-150 ml-auto shrink-0" />
          )}
        </div>

        {clickable && actionLabel && (
          <div
            className={`mt-3 inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors duration-150 ${
              active
                ? 'bg-white/70 text-[var(--color-primary-700)]'
                : 'bg-gray-50/80 text-gray-500 group-hover:bg-[var(--color-primary-50)] group-hover:text-[var(--color-primary-700)]'
            }`}
          >
            {isFilter
              ? (active
                ? <FunnelSolidIcon className="w-3.5 h-3.5 shrink-0" />
                : <FunnelIcon className="w-3.5 h-3.5 shrink-0" />)
              : <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{actionLabel}</span>
          </div>
        )}

        {pct !== null && (
          <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${s.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
