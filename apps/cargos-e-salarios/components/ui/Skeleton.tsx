import React from 'react';

export type SkeletonRadius = boolean | 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface SkeletonProps {
  className?: string;
  /** Announces what is loading. Decorative skeletons stay hidden from assistive technology. */
  ariaLabel?: string;
  /** `false` removes rounding; `true` uses the default radius. */
  rounded?: SkeletonRadius;
}

const radii: Record<Exclude<SkeletonRadius, boolean>, string> = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  full: 'var(--radius-full)',
};

export default function Skeleton({ className = '', ariaLabel, rounded }: SkeletonProps) {
  const borderRadius = rounded === undefined
    ? undefined
    : rounded === false
      ? '0'
      : rounded === true
        ? 'var(--radius-md)'
        : radii[rounded];

  return (
    <div
      role={ariaLabel ? 'status' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : 'true'}
      style={borderRadius === undefined ? undefined : { borderRadius }}
      className={`skeleton block motion-reduce:animate-none ${className}`}
    />
  );
}
