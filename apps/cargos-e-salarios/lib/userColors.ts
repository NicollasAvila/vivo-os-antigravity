import { useEffect, useReducer } from 'react';
import { users as usersApi } from './seiva';
import { colorForString } from './colors';

/**
 * Registry of platform avatar colors (workspace `avatar_color`) so every
 * avatar in the app matches the color the user already has on the platform.
 * Falls back to a deterministic color derived from the name when the
 * platform does not provide one.
 */

const byId = new Map<string, string>();
const byName = new Map<string, string>();
const listeners = new Set<() => void>();
let status: 'idle' | 'loading' | 'ready' = 'idle';

const NAMED_COLORS: Record<string, string> = {
  slate: '#64748b', gray: '#6b7280', zinc: '#71717a', neutral: '#737373', stone: '#78716c',
  red: '#ef4444', orange: '#f97316', amber: '#f59e0b', yellow: '#eab308', lime: '#84cc16',
  green: '#22c55e', emerald: '#10b981', teal: '#14b8a6', cyan: '#06b6d4', sky: '#0ea5e9',
  blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6', purple: '#a855f7', fuchsia: '#d946ef',
  pink: '#ec4899', rose: '#f43f5e', brown: '#92400e', black: '#111827', white: '#e5e7eb',
};

/** Accepts hex / rgb / hsl / tailwind-ish tokens ("indigo", "bg-indigo-500"). */
function normalizeColor(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return value;
  if (/^(rgb|hsl)a?\(/i.test(value)) return value;
  const token = value.toLowerCase().replace(/^(bg|text|border)-/, '').replace(/-\d{2,3}$/, '');
  if (NAMED_COLORS[token]) return NAMED_COLORS[token];
  return null;
}

function emit() {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* ignore */ }
  });
}

/** Seed the registry from an already-fetched workspace user list. */
export function registerUserColors(list?: Array<{ id?: string; name?: string; avatar_color?: string }> | null): void {
  if (!list || list.length === 0) return;
  let changed = false;
  for (const u of list) {
    const color = normalizeColor(u?.avatar_color);
    if (!color) continue;
    if (u?.id && byId.get(u.id) !== color) { byId.set(u.id, color); changed = true; }
    const key = (u?.name || '').trim().toLowerCase();
    if (key && byName.get(key) !== color) { byName.set(key, color); changed = true; }
  }
  if (changed) emit();
}

/** Loads the workspace user list once so avatars can use platform colors. */
export function ensureUserColors(): void {
  if (status !== 'idle') return;
  status = 'loading';
  usersApi
    .list()
    .then((list) => {
      registerUserColors(list as any);
      console.log('[userColors] platform avatar colors loaded', { users: (list || []).length });
    })
    .catch((err) => {
      console.error('[userColors] failed to load workspace users', err);
    })
    .finally(() => { status = 'ready'; emit(); });
}

export function subscribeUserColors(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Platform color for a user (by id, then by name). Null when unknown. */
export function platformUserColor(name?: string | null, userId?: string | null): string | null {
  if (userId && byId.has(userId)) return byId.get(userId) || null;
  const key = (name || '').trim().toLowerCase();
  if (key && byName.has(key)) return byName.get(key) || null;
  return null;
}

/** Resolved avatar color: explicit → platform → deterministic fallback. */
export function useAvatarColor(name?: string | null, userId?: string | null, explicit?: string | null): string {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    ensureUserColors();
    return subscribeUserColors(force);
  }, []);
  return normalizeColor(explicit) || platformUserColor(name, userId) || colorForString(name || '?');
}
