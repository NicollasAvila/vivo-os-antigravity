// ============================================================================
// ColumnPicker — Seletor de colunas visíveis na tabela de colaboradores
// Persiste preferência por usuário via readJsonPref / writeJsonPref
// ============================================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AdjustmentsHorizontalIcon, CheckIcon } from '@heroicons/react/24/outline';
import { readJsonPref, writeJsonPref } from '../../lib/storage';

export interface ColumnDef {
  key: string;
  label: string;
  /** Se true, não pode ser ocultada (ex: nome do colaborador) */
  required?: boolean;
}

interface ColumnPickerProps {
  columns: ColumnDef[];
  visible: Set<string>;
  onChange: (visible: Set<string>) => void;
}

interface Pos {
  top?: number;
  bottom?: number;
  left: number;
  maxHeight: number;
}

export function ColumnPicker({ columns, visible, onChange }: ColumnPickerProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const panelW = 240;
    const left = Math.max(8, Math.min(r.right - panelW, window.innerWidth - panelW - 8));
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const up = below < 160 && above > below;
    setPos(
      up
        ? { left, bottom: window.innerHeight - r.top + 4, maxHeight: above }
        : { left, top: r.bottom + 4, maxHeight: below }
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const on = () => place();
    window.addEventListener('resize', on);
    window.addEventListener('scroll', on, true);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('scroll', on, true);
    };
  }, [open, place]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Fecha com Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const toggle = (key: string) => {
    const col = columns.find((c) => c.key === key);
    if (col?.required) return; // não permite esconder coluna obrigatória

    const next = new Set(visible);
    if (next.has(key)) {
      // Garante que ao menos 1 coluna não-required fica visível
      const nonRequiredVisible = columns.filter(
        (c) => !c.required && c.key !== key && next.has(c.key)
      );
      if (nonRequiredVisible.length === 0) return;
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  };

  const selectAll = () => {
    onChange(new Set(columns.map((c) => c.key)));
  };

  const hiddenCount = columns.filter((c) => !visible.has(c.key)).length;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-label="Gerenciar colunas da tabela"
        title="Gerenciar colunas"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`
          inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium
          transition-colors duration-150
          ${open || hiddenCount > 0
            ? 'border-[var(--color-primary-200)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }
        `}
      >
        <AdjustmentsHorizontalIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Colunas</span>
        {hiddenCount > 0 && (
          <span className="ml-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--color-primary-600)] px-1 text-[10px] font-semibold text-white">
            {hiddenCount}
          </span>
        )}
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          aria-label="Colunas visíveis"
          aria-multiselectable="true"
          style={{
            position: 'fixed',
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            width: 240,
            maxHeight: pos.maxHeight,
            zIndex: 1000,
          }}
          className="overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Colunas visíveis
            </span>
            {hiddenCount > 0 && (
              <button
                onClick={selectAll}
                className="text-xs font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-500)]"
              >
                Mostrar todas
              </button>
            )}
          </div>

          {/* Lista de colunas */}
          <ul className="py-1">
            {columns.map((col) => {
              const isVisible = visible.has(col.key);
              const isRequired = col.required;
              return (
                <li key={col.key}>
                  <button
                    role="option"
                    aria-selected={isVisible}
                    disabled={isRequired}
                    onClick={() => toggle(col.key)}
                    className={`
                      flex w-full items-center justify-between px-3 py-2.5 text-sm
                      transition-colors duration-100
                      ${isRequired
                        ? 'cursor-default text-gray-400'
                        : 'cursor-pointer text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span className={isVisible && !isRequired ? 'text-gray-900' : ''}>
                      {col.label}
                      {isRequired && (
                        <span className="ml-1 text-[10px] text-gray-400">(obrigatório)</span>
                      )}
                    </span>
                    <span
                      className={`
                        flex h-4 w-4 items-center justify-center rounded border
                        ${isVisible
                          ? 'border-[var(--color-primary-600)] bg-[var(--color-primary-600)]'
                          : 'border-gray-300 bg-white'
                        }
                        ${isRequired ? 'opacity-60' : ''}
                      `}
                    >
                      {isVisible && <CheckIcon className="w-3 h-3 text-white" strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers de persistência de visibilidade de colunas
// ---------------------------------------------------------------------------
const PREF_KEY = 'dashboard_columns_visible';

export function loadVisibleColumns(allKeys: string[]): Set<string> {
  const saved = readJsonPref<string[] | null>(PREF_KEY, null, true);
  if (!saved || !Array.isArray(saved) || saved.length === 0) {
    return new Set(allKeys); // padrão: todas visíveis
  }
  // Filtra chaves que ainda existem
  const valid = saved.filter((k) => allKeys.includes(k));
  return valid.length > 0 ? new Set(valid) : new Set(allKeys);
}

export function saveVisibleColumns(visible: Set<string>) {
  writeJsonPref(PREF_KEY, Array.from(visible), true);
}
