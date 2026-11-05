import React, { useEffect, useRef, useState } from 'react';
import { CheckIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import Tooltip from '../ui/Tooltip';
import { LOCALES, type Locale } from '../../lib/i18n';

export type LocaleMenuPosition = 'up' | 'right' | 'down';

const SHORT: Record<Locale, string> = { 'pt-BR': 'PT', en: 'EN', es: 'ES' };

const MENU_POSITION: Record<LocaleMenuPosition, string> = {
  up: 'bottom-full left-0 mb-2',
  right: 'bottom-0 left-full ml-2',
  down: 'top-full right-0 mt-2',
};

interface LocaleSwitcherProps {
  locale: Locale;
  onChange: (next: Locale) => void;
  /** Full-width nav-item look (icon + name + badge) vs. 36px square icon button. */
  expanded?: boolean;
  menuPosition?: LocaleMenuPosition;
  /** Larger 44px hit area for touch surfaces. */
  touch?: boolean;
  languageLabel?: string;
}

/**
 * Custom language selector (never the native <select>): trigger + popover list,
 * closing on outside click / Escape.
 */
export default function LocaleSwitcher({
  locale,
  onChange,
  expanded = false,
  menuPosition = 'up',
  touch = false,
  languageLabel = 'Idioma',
}: LocaleSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const currentLabel = LOCALES.find((l) => l.value === locale)?.label || locale;

  const triggerClass = expanded
    ? `w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium cursor-pointer transition-all duration-150 ${
        open ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`
    : `flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150 ${
        touch ? 'w-11 h-11' : 'w-9 h-9'
      } ${open ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`;

  const tooltipPlacement = menuPosition === 'right' ? 'right' : menuPosition === 'down' ? 'bottom' : 'top';

  return (
    <div ref={ref} className={expanded ? 'relative w-full' : 'relative'}>
      <Tooltip
        content={`${languageLabel} · ${currentLabel}`}
        placement={tooltipPlacement}
        disabled={open || expanded}
      >
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={languageLabel}
          className={triggerClass}
        >
          <GlobeAltIcon className="w-5 h-5 shrink-0" />
          {expanded && (
            <>
              <span className="flex-1 truncate text-left">{currentLabel}</span>
              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-gray-500">
                {SHORT[locale]}
              </span>
            </>
          )}
        </button>
      </Tooltip>

      {open && (
        <div
          role="listbox"
          className={`absolute z-50 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg animate-scale-in ${MENU_POSITION[menuPosition]}`}
        >
          {LOCALES.map((item) => {
            const active = item.value === locale;
            return (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { onChange(item.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm cursor-pointer transition-colors duration-150 ${
                  active
                    ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="w-6 shrink-0 text-[10px] font-semibold tracking-wide text-gray-400">
                  {SHORT[item.value]}
                </span>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {active && <CheckIcon className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
