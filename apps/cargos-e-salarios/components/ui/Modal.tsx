import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../lib/i18n';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  ariaLabel?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Keep a pending confirmation open until the operation settles. */
  dismissible?: boolean;
  children: React.ReactNode;
  /**
   * Largura. A regra prática: cada campo do formulário precisa de ~180px para
   * caber rótulo, controle e instrução sem espremer. Descontando 48px de
   * respiro e 16px de gap por coluna, isso dá: 2 colunas → `md`,
   * 3 → `lg`, 4 → `xl`, 5 ou 6 → `2xl`.
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const modalSizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', '2xl': 'max-w-6xl' };
const stack: HTMLElement[] = [];
let previousOverflow = '';
const focusableSelector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export default function Modal({ open, onClose, title, ariaLabel, initialFocusRef, dismissible = true, children, size = 'md' }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ onClose, dismissible });
  latest.current = { onClose, dismissible };

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (stack.length === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    stack.push(dialog);
    const isTop = () => stack[stack.length - 1] === dialog;
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((node) => node.tabIndex >= 0 && node.getClientRects().length > 0 && !node.closest('[inert]'));
    const focusFirst = () => (controls()[0] || dialog).focus();
    if (initialFocusRef?.current && dialog.contains(initialFocusRef.current)) initialFocusRef.current.focus();
    else dialog.focus();

    const onKey = (event: KeyboardEvent) => {
      if (!isTop() || event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (latest.current.dismissible) latest.current.onClose();
      } else if (event.key === 'Tab') {
        const nodes = controls();
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const current = document.activeElement;
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (current === first || current === dialog || !dialog.contains(current))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (current === last || current === dialog || !dialog.contains(current))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (isTop() && !dialog.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocus);
      const wasTop = isTop();
      stack.splice(stack.indexOf(dialog), 1);
      if (stack.length === 0) document.body.style.overflow = previousOverflow;
      if (wasTop && previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;
  const close = () => { if (dismissible) onClose(); };

  return createPortal(
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : (ariaLabel || t('common.dialog'))} tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 outline-none">
      <div aria-hidden="true" className="fixed inset-0 bg-gray-950/40" onClick={close} />
      <div className={`relative bg-[var(--color-surface)] rounded-t-lg sm:rounded-lg shadow-xl w-full max-h-[100dvh] sm:max-h-[calc(100dvh-2rem)] flex flex-col ${modalSizes[size]} mx-auto`}>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-gray-900/5 shrink-0">
          {title && <h2 id={titleId} className="min-w-0 break-words text-base/7 font-semibold text-[var(--color-text)]">{title}</h2>}
          <button type="button" onClick={close} disabled={!dismissible} aria-label={t('action.close')}
            className="ml-auto inline-flex size-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50">
            <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-4 sm:px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>, document.body,
  );
}
