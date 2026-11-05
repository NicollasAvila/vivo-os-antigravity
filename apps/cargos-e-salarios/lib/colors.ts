// Curated color swatches used across teams, projects, stages and labels.
export const SWATCHES: { name: string; value: string }[] = [
  { name: 'violet', value: '#7c6df2' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'cyan', value: '#06b6d4' },
  { name: 'emerald', value: '#10b981' },
  { name: 'lime', value: '#84cc16' },
  { name: 'amber', value: '#f59e0b' },
  { name: 'orange', value: '#f97316' },
  { name: 'rose', value: '#f43f5e' },
  { name: 'pink', value: '#ec4899' },
  { name: 'fuchsia', value: '#d946ef' },
  { name: 'slate', value: '#64748b' },
  { name: 'indigo', value: '#6366f1' },
  { name: 'gray', value: '#9ca3af' },
  { name: 'graphite', value: '#475569' },
  { name: 'ink', value: '#1e293b' },
];

// Compact palette shown inline in the board column settings row.
// Includes neutral/dark tones so columns can be de-emphasized visually.
export const COLUMN_SWATCHES: { name: string; value: string }[] = [
  { name: 'violet', value: '#7c6df2' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'emerald', value: '#10b981' },
  { name: 'amber', value: '#f59e0b' },
  { name: 'rose', value: '#f43f5e' },
  { name: 'gray', value: '#9ca3af' },
  { name: 'graphite', value: '#475569' },
  { name: 'ink', value: '#1e293b' },
];

/**
 * Accepts a hex string, a swatch object (`{ name, value }`) or anything else and
 * always returns a usable hex string. Legacy records saved the whole swatch
 * object by mistake, so every color read goes through here.
 */
export function normalizeColor(input: unknown, fallback = '#9ca3af'): string {
  if (typeof input === 'string' && input.trim()) return input.trim();
  if (input && typeof input === 'object') {
    const value = (input as { value?: unknown }).value;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

export function hexToRgba(hex: unknown, alpha: number): string {
  const clean = normalizeColor(hex).replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function colorSoftBg(hex: unknown): string {
  return hexToRgba(hex, 0.12);
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#64748b',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};

export function priorityColor(priority: string): string {
  return PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
}

// Deterministic color for a user id/name, used for avatars.
const AVATAR_COLORS = ['#7c6df2', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#f43f5e', '#ec4899', '#d946ef', '#6366f1'];

export function colorForString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
