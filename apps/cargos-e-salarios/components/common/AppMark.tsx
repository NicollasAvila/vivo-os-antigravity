import React from 'react';

/**
 * The app mark — identical to the one drawn in the transactional emails
 * (lib/emailBrand.ts): a rounded square in the app color with three
 * kanban-like bars (white / primary-200 / primary-300).
 */
interface AppMarkProps {
  /** Square size in pixels. Bars scale proportionally. */
  size?: number;
  /** Subtle looping animation on the inner bars (with a pause between loops). */
  animated?: boolean;
  className?: string;
}

export default function AppMark({ size = 32, animated = false, className = '' }: AppMarkProps) {
  const scale = size / 40; // email reference is a 40px square
  const barWidth = Math.max(2, Math.round(5 * scale));
  const gap = Math.max(2, Math.round(3 * scale));
  const radius = Math.max(4, Math.round(10 * scale));
  const bars: { h: number; color: string }[] = [
    { h: 18, color: '#ffffff' },
    { h: 12, color: 'var(--color-primary-200)' },
    { h: 15, color: 'var(--color-primary-300)' },
  ];

  return (
    <div
      className={`flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: 'var(--color-primary-600)',
        gap,
      }}
      aria-hidden="true"
    >
      {bars.map((bar, i) => (
        <span
          key={i}
          className={animated ? 'appmark-bar' : undefined}
          style={{
            width: barWidth,
            height: Math.round(bar.h * scale),
            backgroundColor: bar.color,
            borderRadius: Math.max(1, Math.round(2 * scale)),
            display: 'block',
          }}
        />
      ))}
    </div>
  );
}
