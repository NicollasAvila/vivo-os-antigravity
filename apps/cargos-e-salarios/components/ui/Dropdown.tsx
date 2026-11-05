import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { t } from '../../lib/i18n';

export interface DropdownOption {
  value: string;
  label: string;
  /** Secondary text shown to the right of the label. */
  hint?: string;
  /** Small color dot rendered before the label. */
  color?: string;
  disabled?: boolean;
}

export type DropdownSize = 'xs' | 'sm' | 'md';

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Highlights the control to signal an applied value (filter bars). */
  active?: boolean;
  invalid?: boolean;
  size?: DropdownSize;
  /** Extra classes for the trigger button. */
  className?: string;
  triggerStyle?: React.CSSProperties;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  /** Search box appears when the list has AT LEAST this many options. */
  searchThreshold?: number;
  /** How many options stay visible at once — the rest is reached by scrolling the list. */
  maxVisible?: number;
}

const ITEM_H = 36;
const SEARCH_H = 46;
const LIST_PAD = 8;
const MIN_MENU_W = 180;

const SIZES: Record<DropdownSize, string> = {
  xs: 'py-1 pl-2 pr-7 text-[11px]',
  sm: 'py-1.5 pl-3 pr-8 text-sm font-medium',
  md: 'py-1.5 pl-3 pr-8 text-base sm:text-sm/6',
};

const CHEVRON: Record<DropdownSize, string> = {
  xs: 'right-1.5 size-3.5',
  sm: 'right-2 size-4',
  md: 'right-2 size-5 sm:size-4',
};

const norm = (value: string) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

interface MenuPos {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  listMax: number;
}

/**
 * Accessible dropdown built in HTML (never the native <select> list), so the
 * options render with the app's own styling on every browser/OS. Long lists get
 * an internal search box and a bounded height instead of an endless popup.
 */
export default function Dropdown({
  value,
  options,
  onChange,
  id,
  placeholder,
  disabled = false,
  active = false,
  invalid = false,
  size = 'md',
  className = '',
  triggerStyle,
  ariaLabel,
  ariaDescribedBy,
  searchThreshold = 8,
  maxVisible = 6,
}: DropdownProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [pos, setPos] = useState<MenuPos | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const list = options || [];
  const selected = list.find((opt) => opt.value === value) || null;
  const needsSearch = list.length >= searchThreshold;

  const filtered = useMemo(() => {
    const term = norm(query.trim());
    if (!term) return list;
    return list.filter((opt) => norm(opt.label).includes(term) || norm(opt.hint || '').includes(term));
  }, [list, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setPos(null);
  }, []);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, MIN_MENU_W), window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const searchH = needsSearch ? SEARCH_H : 0;
    const wanted = Math.min(Math.max(filtered.length, 1), maxVisible) * ITEM_H + LIST_PAD;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const up = spaceBelow < Math.min(wanted + searchH, 180) && spaceAbove > spaceBelow;
    const available = (up ? spaceAbove : spaceBelow) - searchH;
    const listMax = Math.max(ITEM_H * 2, Math.min(wanted, available));
    setPos(up
      ? { left, bottom: window.innerHeight - rect.top + 4, width, listMax }
      : { left, top: rect.bottom + 4, width, listMax });
  }, [filtered.length, maxVisible, needsSearch]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  // Keeps the menu glued to the trigger while any ancestor scrolls or the window resizes.
  useEffect(() => {
    if (!open) return;
    const handler = () => place();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [open, place]);

  // Outside click closes only this menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close]);

  // Escape is intercepted in the capture phase so it does not also close a parent modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const index = filtered.findIndex((opt) => opt.value === value);
    setActiveIdx(index >= 0 && !filtered[index].disabled ? index : filtered.findIndex((opt) => !opt.disabled));
  }, [open, filtered, value]);

  const positioned = pos !== null;
  useEffect(() => {
    if (!open || !positioned) return;
    if (needsSearch) searchRef.current?.focus();
    else listRef.current?.focus();
  }, [open, positioned, needsSearch]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open, filtered.length]);

  const pick = (option: DropdownOption) => {
    if (option.disabled) return;
    onChange(option.value);
    close();
    triggerRef.current?.focus();
  };

  const move = (delta: number) => {
    if (filtered.length === 0) return;
    setActiveIdx((prev) => {
      let next = prev;
      for (let i = 0; i < filtered.length; i += 1) {
        next = (next + delta + filtered.length) % filtered.length;
        if (!filtered[next]?.disabled) return next;
      }
      return prev;
    });
  };

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
    else if (event.key === 'Home') { event.preventDefault(); setActiveIdx(filtered.findIndex((opt) => !opt.disabled)); }
    else if (event.key === 'End') { event.preventDefault(); setActiveIdx(filtered.reduce((last, opt, index) => opt.disabled ? last : index, -1)); }
    else if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[activeIdx];
      if (option) pick(option);
    } else if (event.key === 'Tab') {
      close();
      triggerRef.current?.focus();
    }
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (open) return;
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const surface = invalid
    ? 'bg-white outline-1 -outline-offset-1 outline-red-300 text-gray-900'
    : active
      ? 'bg-[var(--color-primary-50)] outline-2 -outline-offset-2 outline-[var(--color-primary-500)] text-[var(--color-primary-700)] font-medium'
      : 'bg-white outline-1 -outline-offset-1 outline-gray-300 text-gray-900';

  const focusRing = invalid
    ? 'focus:outline-red-600'
    : 'focus:outline-[var(--color-primary-600)]';

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={onTriggerKeyDown}
        style={triggerStyle}
        className={`relative w-full text-left rounded-lg outline cursor-pointer transition-all duration-150 ${SIZES[size]} ${surface} ${focusRing} focus:outline focus:outline-2 focus:-outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${open ? 'outline-2 -outline-offset-2 outline-[var(--color-primary-600)]' : ''} ${className}`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {selected?.color && (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
          )}
          <span className={`block truncate ${selected ? '' : 'text-gray-400'}`}>
            {selected ? selected.label : (placeholder || t('select.placeholder'))}
          </span>
        </span>
        <svg
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${CHEVRON[size]} ${active && !invalid ? 'text-[var(--color-primary-600)]' : 'text-gray-500'} transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          onKeyDown={onMenuKeyDown}
          style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width }}
          className="z-[250] rounded-lg border border-gray-200 bg-white shadow-lg animate-scale-in overflow-hidden"
        >
          {needsSearch && (
            <div className="p-1.5 border-b border-gray-100">
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  value={query}
                  aria-label={t('select.search')}
                  aria-controls={listId}
                  aria-activedescendant={filtered[activeIdx] ? `${listId}-${activeIdx}` : undefined}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('select.search')}
                  className="w-full rounded-lg bg-gray-50 py-1.5 pl-8 pr-2 text-sm text-gray-900 outline outline-1 -outline-offset-1 outline-transparent placeholder:text-gray-400 focus:bg-white focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-[var(--color-primary-600)]"
                />
              </div>
            </div>
          )}

          <div
            ref={listRef}
            role="listbox"
            id={listId}
            aria-label={ariaLabel || placeholder || t('select.placeholder')}
            aria-activedescendant={filtered[activeIdx] ? `${listId}-${activeIdx}` : undefined}
            tabIndex={-1}
            style={{ maxHeight: pos.listMax }}
            className="overflow-y-auto p-1 focus:outline-none"
          >
            {filtered.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-gray-400">{t('select.no_results')}</p>
            )}
            {filtered.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIdx;
              return (
                <button
                  key={`${option.value}-${index}`}
                  type="button"
                  role="option"
                  id={`${listId}-${index}`}
                  tabIndex={-1}
                  data-idx={index}
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onMouseEnter={() => setActiveIdx(index)}
                  onClick={() => pick(option)}
                  className={`w-full h-9 flex items-center gap-2 rounded-lg px-2.5 text-sm text-left cursor-pointer transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSelected
                      ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] font-medium'
                      : isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600'
                  }`}
                >
                  {option.color && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: option.color }} />
                  )}
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.hint && <span className="shrink-0 text-[11px] text-gray-400">{option.hint}</span>}
                  {isSelected && <CheckIcon className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>,
        triggerRef.current?.closest('[role="dialog"]') || document.body,
      )}
    </>
  );
}
