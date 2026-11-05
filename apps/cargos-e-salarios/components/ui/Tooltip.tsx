import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  availableTooltipWidth,
  computeTooltipPosition,
  TOOLTIP_MAX_WIDTH,
  type AnchorRect,
  type TooltipPlacement,
  type TooltipPosition,
} from '../../lib/tooltipPosition';

export type { TooltipPlacement };

interface TooltipProps {
  /** Text (or node) shown inside the dark bubble. Empty/undefined disables the tooltip. */
  content?: React.ReactNode;
  /** Preferred side. The bubble flips automatically when it does not fit there. */
  placement?: TooltipPlacement;
  /** Delay before showing, in ms. */
  delay?: number;
  disabled?: boolean;
  /** Hard cap for the bubble width (still clamped to the screen on small viewports). */
  maxWidth?: number;
  children: React.ReactNode;
}

const ENTER_OFFSET: Record<TooltipPlacement, string> = {
  top: 'translateY(4px)',
  bottom: 'translateY(-4px)',
  left: 'translateX(4px)',
  right: 'translateX(-4px)',
};

/** The little square rotated 45deg, anchored on the side facing the trigger. */
function arrowStyle(pos: TooltipPosition): React.CSSProperties {
  const spin = ' rotate(45deg)';
  switch (pos.placement) {
    case 'bottom':
      return { left: pos.arrow, top: -3, transform: 'translateX(-50%)' + spin };
    case 'left':
      return { top: pos.arrow, right: -3, transform: 'translateY(-50%)' + spin };
    case 'right':
      return { top: pos.arrow, left: -3, transform: 'translateY(-50%)' + spin };
    default:
      return { left: pos.arrow, bottom: -3, transform: 'translateX(-50%)' + spin };
  }
}

/**
 * Single tooltip used across the whole app (dark bubble, soft fade + slide),
 * visually aligned with the dashboard chart tooltips.
 *
 * It renders in a portal so it is never clipped by scroll containers, and the
 * wrapper uses "display: contents" so the surrounding layout is untouched.
 *
 * Placement is a real two-pass collision routine: the bubble is mounted
 * invisible, measured at its final width (so wrapped text counts), and only
 * then flipped / slid back into the viewport and faded in. The arrow follows
 * that slide, so it keeps pointing at the trigger.
 */
export default function Tooltip({
  content,
  placement = 'top',
  delay = 150,
  disabled = false,
  maxWidth = TOOLTIP_MAX_WIDTH,
  children,
}: TooltipProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [pos, setPos] = useState<TooltipPosition | null>(null);
  const [visible, setVisible] = useState(false);

  const hasContent = content !== null && content !== undefined && content !== '';

  useEffect(() => () => {
    if (showTimer.current) window.clearTimeout(showTimer.current);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
  }, []);

  const readAnchor = useCallback((): AnchorRect | null => {
    const host = hostRef.current;
    if (!host) return null;
    const el = (host.firstElementChild as HTMLElement | null) || host;
    const rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) return null;
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const show = useCallback(() => {
    if (disabled || !hasContent) return;
    if (hideTimer.current) { window.clearTimeout(hideTimer.current); hideTimer.current = null; }
    if (showTimer.current) return;
    showTimer.current = window.setTimeout(() => {
      showTimer.current = null;
      const next = readAnchor();
      if (!next) return;
      setVisible(false);
      setPos(null);
      setAnchor(next);
    }, delay);
  }, [delay, disabled, hasContent, readAnchor]);

  const hide = useCallback(() => {
    if (showTimer.current) { window.clearTimeout(showTimer.current); showTimer.current = null; }
    setVisible(false);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = null;
      setAnchor(null);
      setPos(null);
    }, 180);
  }, []);

  useEffect(() => {
    if (disabled || !hasContent) hide();
  }, [disabled, hasContent, hide]);

  // Second pass: measure the real bubble, then decide side + coordinates.
  useLayoutEffect(() => {
    if (!anchor) return;
    const el = bubbleRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    setPos(computeTooltipPosition(
      anchor,
      { width: box.width, height: box.height },
      placement,
      { width: window.innerWidth, height: window.innerHeight },
    ));
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [anchor, placement, maxWidth]);

  useEffect(() => {
    if (!anchor) return;
    const dismiss = () => hide();
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [anchor, hide]);

  const width = typeof window !== 'undefined' ? availableTooltipWidth(window.innerWidth, maxWidth) : maxWidth;

  const bubble = anchor && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={bubbleRef}
          role="tooltip"
          className="pointer-events-none fixed z-[300] rounded-md bg-gray-900 px-2 py-1 text-xs font-medium leading-4 text-white shadow-lg shadow-gray-900/25 break-words"
          style={{
            left: pos ? pos.left : 0,
            top: pos ? pos.top : 0,
            maxWidth: width,
            // Measured invisibly on the first pass so the text wraps exactly as
            // it will on screen — no jump between measure and reveal.
            visibility: pos ? 'visible' : 'hidden',
            opacity: visible ? 1 : 0,
            transform: visible ? 'none' : ENTER_OFFSET[pos ? pos.placement : placement],
            transition: 'opacity 140ms cubic-bezier(0.16, 1, 0.3, 1), transform 190ms cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform, opacity',
          }}
        >
          <span className="block">{content}</span>
          {pos && pos.arrowVisible && (
            <span aria-hidden className="absolute w-2 h-2 bg-gray-900" style={arrowStyle(pos)} />
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <span
        ref={hostRef}
        style={{ display: 'contents' }}
        onMouseEnter={disabled ? undefined : (e) => { e.stopPropagation(); show(); }}
        onMouseLeave={disabled ? undefined : (e) => { e.stopPropagation(); hide(); }}
        onFocus={disabled ? undefined : (e) => { e.stopPropagation(); show(); }}
        onBlur={disabled ? undefined : (e) => { e.stopPropagation(); hide(); }}
        onClick={disabled ? undefined : (e) => { e.stopPropagation(); hide(); }}
      >
        {children}
      </span>
      {bubble}
    </>
  );
}
