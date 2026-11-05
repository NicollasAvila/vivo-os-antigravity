import React, { useLayoutEffect, useRef, useState } from 'react';

interface CardGridProps {
  children: React.ReactNode;
  /** Minimum card width in px — columns are added only when this fits. */
  min?: number;
  /** Optional explicit cap. By default cards fill the available row. */
  max?: number;
  gap?: number;
  className?: string;
}

/**
 * Responsive card grid driven by the AVAILABLE width (not the viewport).
 * Columns adapt to the container, so a collapsed/expanded sidebar or a
 * tablet split view never squeezes the cards below their comfortable width.
 */
export default function CardGrid({ children, min = 280, max, gap = 16, className = '' }: CardGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const count = Math.max(1, React.Children.toArray(children).length);
  const capacity = Math.max(1, Math.floor((width + gap) / (Math.max(1, min) + gap)));
  // Four KPIs use four columns or two equal rows, never a stranded fourth card.
  const columns = Math.ceil(count / Math.ceil(count / Math.min(count, capacity)));
  return (
    <div
      ref={ref}
      className={`grid w-full ${className}`}
      style={{
        gap: `${gap}px`,
        gridTemplateColumns: max
          ? `repeat(auto-fill, minmax(min(100%, ${min}px), ${Math.max(min, max)}px))`
          : `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}
