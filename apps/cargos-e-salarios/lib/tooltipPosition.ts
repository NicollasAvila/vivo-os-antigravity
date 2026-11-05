/**
 * Tooltip collision math — pure, framework-free and testable.
 *
 * Kept out of the component on purpose: the bubble only knows how to render;
 * every decision about WHERE it lands (which side, how it slides back into the
 * viewport, where the arrow points) lives here.
 */

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface AnchorRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface BubbleSize {
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface TooltipPosition {
  /** Final viewport coordinates of the bubble (position: fixed). */
  left: number;
  top: number;
  /** Side actually used after the collision pass — may differ from the requested one. */
  placement: TooltipPlacement;
  /** Arrow offset in px, measured from the bubble's own top/left edge. */
  arrow: number;
  /** false when the anchor sits so far off that the arrow would not point at it. */
  arrowVisible: boolean;
}

/** Distance between the anchor and the bubble. */
export const TOOLTIP_GAP = 8;
/** Minimum breathing room against the viewport border. */
export const TOOLTIP_EDGE = 8;
/** Hard cap for the bubble width (still clamped to the screen on small viewports). */
export const TOOLTIP_MAX_WIDTH = 288;
/** How close to its own corner the arrow may get. */
const ARROW_INSET = 12;

const OPPOSITE: Record<TooltipPlacement, TooltipPlacement> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

const ALL_PLACEMENTS: TooltipPlacement[] = ['top', 'bottom', 'left', 'right'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Width the bubble may use: never wider than maxWidth, never wider than the screen. */
export function availableTooltipWidth(viewportWidth: number, maxWidth: number = TOOLTIP_MAX_WIDTH): number {
  return Math.max(140, Math.min(maxWidth, viewportWidth - TOOLTIP_EDGE * 2));
}

/** Free space on each side of the anchor, already discounting gap + edge. */
function freeSpace(anchor: AnchorRect, viewport: Viewport): Record<TooltipPlacement, number> {
  return {
    top: anchor.top - TOOLTIP_GAP - TOOLTIP_EDGE,
    bottom: viewport.height - anchor.bottom - TOOLTIP_GAP - TOOLTIP_EDGE,
    left: anchor.left - TOOLTIP_GAP - TOOLTIP_EDGE,
    right: viewport.width - anchor.right - TOOLTIP_GAP - TOOLTIP_EDGE,
  };
}

function needed(placement: TooltipPlacement, bubble: BubbleSize): number {
  return placement === 'top' || placement === 'bottom' ? bubble.height : bubble.width;
}

/** Preferred side first, then its opposite, then the perpendicular ones. */
export function placementOrder(preferred: TooltipPlacement): TooltipPlacement[] {
  const opposite = OPPOSITE[preferred];
  return [preferred, opposite, ...ALL_PLACEMENTS.filter((p) => p !== preferred && p !== opposite)];
}

/**
 * Which side actually gets used: the first one in preference order where the
 * measured bubble fits; when nothing fits, the side with the most room left.
 */
export function resolvePlacement(
  anchor: AnchorRect,
  bubble: BubbleSize,
  preferred: TooltipPlacement,
  viewport: Viewport,
): TooltipPlacement {
  const space = freeSpace(anchor, viewport);
  const order = placementOrder(preferred);
  const fits = order.find((p) => space[p] >= needed(p, bubble));
  if (fits) return fits;
  return order
    .slice()
    .sort((a, b) => (space[b] - needed(b, bubble)) - (space[a] - needed(a, bubble)))[0];
}

/**
 * Full placement pass: pick the side, center the bubble on the anchor, slide it
 * back inside the viewport on the cross axis and move the arrow so it keeps
 * pointing at the anchor even after the slide.
 */
export function computeTooltipPosition(
  anchor: AnchorRect,
  bubble: BubbleSize,
  preferred: TooltipPlacement,
  viewport: Viewport,
): TooltipPosition {
  const placement = resolvePlacement(anchor, bubble, preferred, viewport);
  const centerX = anchor.left + anchor.width / 2;
  const centerY = anchor.top + anchor.height / 2;
  const vertical = placement === 'top' || placement === 'bottom';

  let left: number;
  let top: number;

  if (vertical) {
    left = clamp(centerX - bubble.width / 2, TOOLTIP_EDGE, viewport.width - TOOLTIP_EDGE - bubble.width);
    top = placement === 'top'
      ? anchor.top - TOOLTIP_GAP - bubble.height
      : anchor.bottom + TOOLTIP_GAP;
    top = clamp(top, TOOLTIP_EDGE, viewport.height - TOOLTIP_EDGE - bubble.height);
  } else {
    top = clamp(centerY - bubble.height / 2, TOOLTIP_EDGE, viewport.height - TOOLTIP_EDGE - bubble.height);
    left = placement === 'left'
      ? anchor.left - TOOLTIP_GAP - bubble.width
      : anchor.right + TOOLTIP_GAP;
    left = clamp(left, TOOLTIP_EDGE, viewport.width - TOOLTIP_EDGE - bubble.width);
  }

  const along = vertical ? centerX - left : centerY - top;
  const size = vertical ? bubble.width : bubble.height;
  const arrow = clamp(along, ARROW_INSET, Math.max(ARROW_INSET, size - ARROW_INSET));

  return {
    left: Math.round(left),
    top: Math.round(top),
    placement,
    arrow: Math.round(arrow),
    // When the anchor ends up outside the bubble's own span (tiny target pinned
    // to a corner), a visible arrow would point at nothing — hide it instead.
    arrowVisible: along >= 0 && along <= size,
  };
}
