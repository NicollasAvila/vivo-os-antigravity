import React, { useEffect, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { tTour } from '../../lib/i18nTour';
import type { TourStep } from '../../services/tours';

const CARD_W = 330;
const GAP = 14;
const PAD = 6;

/** First VISIBLE element matching the selector (the sidebar renders twice). */
function findTarget(selector: string): DOMRect | null {
  const nodes = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 2 && rect.height > 2) return rect;
  }
  return null;
}

/**
 * Follows the highlighted element: polls its position so the spotlight keeps
 * up with scroll, layout shifts and elements that only render a moment later.
 */
function useTargetRect(selector?: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const scrolledFor = useRef<string | null>(null);

  useEffect(() => {
    setRect(null);
    if (!selector) return;
    let timer = 0;
    const tick = () => {
      const next = findTarget(selector);
      if (next && scrolledFor.current !== selector) {
        scrolledFor.current = selector;
        const el = document.querySelector(selector) as HTMLElement | null;
        try { el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch { /* ignore */ }
      }
      setRect((prev) => {
        if (!next) return prev ? null : prev;
        if (prev && prev.top === next.top && prev.left === next.left && prev.width === next.width && prev.height === next.height) return prev;
        return next;
      });
      timer = window.setTimeout(tick, 250);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [selector]);

  return rect;
}

interface TourOverlayProps {
  step: TourStep;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

/** Dim + spotlight + the explanation card. */
export default function TourOverlay({ step, index, total, onNext, onPrev, onClose }: TourOverlayProps) {
  const rect = useTargetRect(step.target);
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = viewport.w < 640;
  const isLast = index === total - 1;

  const cardStyle: React.CSSProperties = (() => {
    if (isMobile) return { left: 12, right: 12, bottom: 16 };
    const width = Math.min(CARD_W, viewport.w - 24);
    if (!rect) return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width };

    const verticalTop = Math.min(Math.max(rect.top - 8, 12), Math.max(12, viewport.h - 260));
    const wantRight = step.placement === 'right' || (!step.placement && rect.right < 300);
    if (wantRight && rect.right + GAP + width < viewport.w) {
      return { left: rect.right + GAP, top: verticalTop, width };
    }
    if (step.placement === 'left' && rect.left > width + GAP + 12) {
      return { left: Math.max(12, rect.left - GAP - width), top: verticalTop, width };
    }

    const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 12), Math.max(12, viewport.w - width - 12));
    const spaceBelow = viewport.h - rect.bottom;
    if (step.placement === 'top' && rect.top > 240) return { left, bottom: viewport.h - rect.top + GAP, width };
    if (spaceBelow > 240 || spaceBelow >= rect.top) return { left, top: rect.bottom + GAP, width };
    return { left, bottom: viewport.h - rect.top + GAP, width };
  })();

  return (
    <>
      {/* Blocks stray clicks while the guide is on screen. */}
      <div
        className="fixed inset-0 z-[94]"
        style={{ background: rect ? 'transparent' : 'rgba(17,24,39,0.55)' }}
        aria-hidden="true"
      />

      {rect && (
        <div
          className="pointer-events-none fixed z-[95] rounded-lg transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(17,24,39,0.55)',
            border: '2px solid var(--color-primary-500)',
          }}
          aria-hidden="true"
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        className="fixed z-[96] rounded-lg bg-white shadow-2xl ring-1 ring-gray-900/10 animate-fade-in"
        style={cardStyle}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary-600)]">
                {tTour('tour.ui.step', { current: index + 1, total })}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-gray-900">{step.title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={tTour('tour.ui.close')}
              className="-mr-1.5 -mt-1.5 shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors duration-150 cursor-pointer"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.body}</p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {Array.from({ length: total }).map((_, dot) => (
                <span
                  key={dot}
                  className={`h-1.5 rounded-full transition-all duration-150 ${dot === index ? 'w-4 bg-[var(--color-primary-600)]' : 'w-1.5 bg-gray-200'}`}
                />
              ))}
            </div>
            {!isLast && (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors duration-150 cursor-pointer"
              >
                {tTour('tour.ui.skip')}
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={onPrev}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
              >
                {tTour('tour.ui.back')}
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              className="rounded-md bg-[var(--color-primary-600)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-500)] transition-colors duration-150 cursor-pointer"
            >
              {isLast ? tTour('tour.ui.finish') : tTour('tour.ui.next')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
