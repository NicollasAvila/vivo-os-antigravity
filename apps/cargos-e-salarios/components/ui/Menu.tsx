import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import IconButton from './IconButton';
import { t } from '../../lib/i18n';

export interface MenuItem {
  key: string;
  label: string;
  /** Linha secundária explicando o efeito da ação. */
  description?: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export type MenuEntry = MenuItem | 'separator';

interface MenuProps {
  items: MenuEntry[];
  /** Nome do menu (aria + tooltip do gatilho). Padrão: "Abrir menu". */
  label?: string;
  /** Ícone do gatilho padrão (reticências). Ignorado quando há `trigger`. */
  icon?: React.ReactNode;
  /** Gatilho próprio (um `Button`, um avatar…). O Menu cuida de abrir/fechar. */
  trigger?: React.ReactElement;
  /** Lado do gatilho ao qual o menu se alinha. */
  align?: 'start' | 'end';
  size?: 'sm' | 'md' | 'lg';
  /** Largura do painel, em px. */
  width?: number;
  disabled?: boolean;
  className?: string;
}

interface Pos {
  left: number;
  top?: number;
  bottom?: number;
}

const GAP = 4;
const MARGIN = 8;

/**
 * Menu de ações secundárias (kebab). Renderiza em PORTAL com posição fixa, por
 * isso nunca é cortado por um container com overflow nem fica atrás de um
 * modal. Fecha com Esc, clique fora ou Tab; setas navegam; Enter/Espaço acionam.
 */
export default function Menu({
  items,
  label,
  icon,
  trigger,
  align = 'end',
  size = 'md',
  width = 224,
  disabled = false,
  className = '',
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const menuLabel = label || t('action.open_menu');

  const selectable = items
    .map((entry, index) => ({ entry, index }))
    .filter((row): row is { entry: MenuItem; index: number } => row.entry !== 'separator' && !row.entry.disabled);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    setPos(null);
    setActiveIdx(-1);
    if (restoreFocus) {
      const el = triggerRef.current;
      const focusable = el?.matches('button, a, [tabindex]') ? el : el?.querySelector<HTMLElement>('button, a, [tabindex]');
      focusable?.focus();
    }
  }, []);

  const place = useCallback(() => {
    const el = triggerRef.current;
    const panel = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const height = panel?.offsetHeight ?? 0;
    const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
    const up = height > 0 && spaceBelow < height && rect.top - MARGIN > spaceBelow;
    const preferredLeft = align === 'end' ? rect.right - width : rect.left;
    const left = Math.max(MARGIN, Math.min(preferredLeft, window.innerWidth - width - MARGIN));
    setPos(up
      ? { left, bottom: window.innerHeight - rect.top + GAP }
      : { left, top: rect.bottom + GAP });
  }, [align, width]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

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

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close]);

  // Esc na fase de captura: fecha SÓ o menu, nunca o modal que o contém.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, close]);

  const positioned = pos !== null;
  useEffect(() => {
    if (!open || !positioned) return;
    panelRef.current?.focus();
  }, [open, positioned]);

  useEffect(() => {
    if (!open || activeIdx < 0) return;
    panelRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)?.focus();
  }, [activeIdx, open]);

  const moveTo = (delta: number) => {
    if (selectable.length === 0) return;
    const current = selectable.findIndex((row) => row.index === activeIdx);
    const next = current < 0
      ? (delta > 0 ? 0 : selectable.length - 1)
      : (current + delta + selectable.length) % selectable.length;
    setActiveIdx(selectable[next].index);
  };

  const run = (item: MenuItem) => {
    if (item.disabled) return;
    close();
    item.onSelect();
  };

  const onPanelKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); moveTo(1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); moveTo(-1); }
    else if (event.key === 'Home') { event.preventDefault(); if (selectable[0]) setActiveIdx(selectable[0].index); }
    else if (event.key === 'End') { event.preventDefault(); const last = selectable[selectable.length - 1]; if (last) setActiveIdx(last.index); }
    else if (event.key === 'Tab') { close(); }
  };

  const toggle = () => {
    if (disabled) return;
    if (open) close();
    else setOpen(true);
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (open || disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
      if (selectable[0]) setActiveIdx(selectable[0].index);
    }
  };

  const triggerNode = trigger ? (
    <span
      ref={(node) => { triggerRef.current = node; }}
      className={`inline-flex ${className}`}
      onClick={toggle}
      onKeyDown={onTriggerKeyDown}
    >
      {React.cloneElement(trigger, {
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        disabled: disabled || (trigger.props as any).disabled,
      } as any)}
    </span>
  ) : (
    <IconButton
      ref={(node) => { triggerRef.current = node; }}
      icon={icon ?? <EllipsisHorizontalIcon />}
      label={menuLabel}
      size={size}
      active={open}
      tooltip={!open}
      placement="bottom"
      disabled={disabled}
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={toggle}
      onKeyDown={onTriggerKeyDown}
      className={className}
    />
  );

  return (
    <>
      {triggerNode}
      {open && createPortal(
        <div
          ref={panelRef}
          role="menu"
          aria-label={menuLabel}
          tabIndex={-1}
          onKeyDown={onPanelKeyDown}
          style={{ position: 'fixed', left: pos?.left ?? 0, top: pos?.top, bottom: pos?.bottom, width, visibility: pos ? 'visible' : 'hidden' }}
          className="z-[250] rounded-lg bg-white p-1 shadow-lg outline outline-1 outline-gray-200 animate-scale-in focus:outline-gray-200"
        >
          {items.map((entry, index) => {
            if (entry === 'separator') return <div key={`sep-${index}`} className="my-1 h-px bg-gray-100" />;
            return (
              <button
                key={entry.key}
                type="button"
                role="menuitem"
                data-idx={index}
                tabIndex={-1}
                disabled={entry.disabled}
                onMouseEnter={() => setActiveIdx(index)}
                onClick={() => run(entry)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); run(entry); }
                }}
                className={`w-full flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors focus:outline-none ${
                  entry.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : `cursor-pointer ${entry.danger ? 'hover:bg-red-50 focus-visible:bg-red-50' : 'hover:bg-gray-50 focus-visible:bg-gray-50'}`
                }`}
              >
                {entry.icon && (
                  <span className={`mt-0.5 shrink-0 [&>svg]:size-4 ${entry.danger ? 'text-red-500' : 'text-gray-400'}`}>{entry.icon}</span>
                )}
                <span className="min-w-0">
                  <span className={`block text-sm font-medium ${entry.danger ? 'text-red-600' : 'text-gray-900'}`}>{entry.label}</span>
                  {entry.description && <span className="block text-xs text-gray-500 leading-snug">{entry.description}</span>}
                </span>
              </button>
            );
          })}
        </div>,
        triggerRef.current?.closest('[role="dialog"]') || document.body,
      )}
    </>
  );
}
