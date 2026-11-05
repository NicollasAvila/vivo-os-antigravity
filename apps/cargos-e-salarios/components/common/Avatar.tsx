import React from 'react';
import { useAvatarColor } from '../../lib/userColors';

interface AvatarProps {
  name?: string | null;
  /** Workspace user id — used to pick the platform avatar color. */
  userId?: string | null;
  /** Explicit color (e.g. `avatar_color` already at hand). Wins over the registry. */
  color?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

// The app has its own tooltip component, so the avatar NEVER sets the native
// `title` attribute — two bubbles (dark custom + grey browser one) would stack.
// The name stays available to screen readers through `aria-label`.

// Slightly larger circles + marginally smaller glyphs so two initials (e.g. "TM")
// always keep visual breathing room against the circle edge.
const sizeClasses: Record<string, string> = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-[11px]',
};

export function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, userId, color, size = 'sm', className = '' }: AvatarProps) {
  const bg = useAvatarColor(name, userId, color);
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white shrink-0 leading-none tracking-tight select-none ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bg }}
      role="img"
      aria-label={name || undefined}
    >
      {initials(name)}
    </div>
  );
}
