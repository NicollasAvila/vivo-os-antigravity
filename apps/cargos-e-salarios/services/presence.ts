import { db, users } from '../lib/seiva';
import { isOffline, isTransientNetworkError } from '../lib/netErrors';

/**
 * Presence — "who is in the app right now".
 *
 * Every open tab sends a lightweight heartbeat into the `presence_sessions`
 * collection (one record per user). Other tabs receive the write through the
 * realtime subscription of `useCollection`, so the roster updates by itself.
 * A person is considered online while their last heartbeat is recent; when the
 * tab is closed (or left in the background for a long time) the heartbeat stops
 * and they naturally drop off the list.
 */

export const PRESENCE_COLLECTION = 'presence_sessions';

/** How often an open tab announces itself. */
export const HEARTBEAT_MS = 25_000;
/** How long a heartbeat keeps someone "online". */
export const ONLINE_WINDOW_MS = 70_000;
/** Background tabs stop announcing after this long, so they fade out. */
export const AWAY_AFTER_HIDDEN_MS = 5 * 60_000;
/** How often the UI re-evaluates staleness. */
export const TICK_MS = 15_000;

export interface PresenceSession {
  id: string;
  user_id: string;
  user_name: string;
  /** ISO timestamp of the last heartbeat. */
  last_seen: string;
  /** Explicitly set to false when the tab is closed. */
  online?: boolean;
  _updated_at?: string;
}

export interface OnlinePerson {
  user_id: string;
  name: string;
  last_seen: number;
  isSelf: boolean;
}

function seenAt(session?: PresenceSession | null): number {
  const raw = session?.last_seen;
  if (!raw) return 0;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : 0;
}

function isFresh(session: PresenceSession, now: number): boolean {
  if (session?.online === false) return false;
  const time = seenAt(session);
  return time > 0 && now - time <= ONLINE_WINDOW_MS;
}

/**
 * Latest session per user, filtered to fresh heartbeats. The current user is
 * always injected so they see themselves immediately, before the first
 * heartbeat round-trip completes.
 */
export function buildOnlineList(
  sessions: PresenceSession[] | null | undefined,
  now: number,
  selfId?: string | null,
  selfName?: string | null,
): OnlinePerson[] {
  const latest = new Map<string, PresenceSession>();
  (sessions ?? []).forEach((session) => {
    if (!session?.user_id) return;
    const current = latest.get(session.user_id);
    if (!current || seenAt(session) > seenAt(current)) latest.set(session.user_id, session);
  });

  const people: OnlinePerson[] = [];
  latest.forEach((session) => {
    if (!isFresh(session, now)) return;
    people.push({
      user_id: session.user_id,
      name: session.user_name || '—',
      last_seen: seenAt(session),
      isSelf: !!selfId && session.user_id === selfId,
    });
  });

  if (selfId && !people.some((p) => p.isSelf)) {
    people.push({ user_id: selfId, name: selfName || '—', last_seen: now, isSelf: true });
  }

  return people.sort((a, b) => {
    if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// ---------------------------------------------------------------------------
// Heartbeat singleton — refcounted so several mounted indicators (desktop rail
// + mobile drawer) never produce duplicated writes.
// ---------------------------------------------------------------------------

let refs = 0;
let timer: number | null = null;
let sessionId: string | null = null;
let writing = false;
let hiddenSince: number | null = null;

async function ensureSession(userId: string, userName: string): Promise<string | null> {
  if (sessionId) return sessionId;
  const rows = await db.list<PresenceSession>(PRESENCE_COLLECTION, { limit: 500 });
  const mine = (rows ?? [])
    .filter((r) => r?.user_id === userId)
    .sort((a, b) => seenAt(b) - seenAt(a))[0];
  if (mine?.id) {
    sessionId = mine.id;
    return sessionId;
  }
  const created = await db.create<PresenceSession>(PRESENCE_COLLECTION, {
    user_id: userId,
    user_name: userName,
    last_seen: new Date().toISOString(),
    online: true,
  });
  sessionId = created?.id ?? null;
  return sessionId;
}

async function beat(force = false): Promise<void> {
  const me = users.currentUser();
  if (!me?.id || writing) return;
  // No connection (or the tab is on its way out): skip this beat entirely.
  // The person simply fades from the roster and comes back on the next one.
  if (isOffline()) return;
  if (!force && typeof document !== 'undefined' && document.hidden && hiddenSince) {
    if (Date.now() - hiddenSince > AWAY_AFTER_HIDDEN_MS) return;
  }
  writing = true;
  try {
    const id = await ensureSession(me.id, me.name || '');
    if (!id) return;
    await db.update<PresenceSession>(PRESENCE_COLLECTION, id, {
      last_seen: new Date().toISOString(),
      user_name: me.name || '',
      online: true,
    });
  } catch (err) {
    if (isTransientNetworkError(err)) {
      // Heartbeats are disposable — a dropped one is not a failure.
      console.log('[presence] heartbeat skipped (connection)');
    } else {
      console.error('[presence] heartbeat failed', err);
      // A stale session id (record removed elsewhere) must not poison every
      // future beat — drop it so the next one recreates the session.
      sessionId = null;
    }
  } finally {
    writing = false;
  }
}

function markOffline(): void {
  const id = sessionId;
  if (!id) return;
  // Guard against React remounts: only really go offline if nothing re-acquired.
  window.setTimeout(() => {
    if (refs > 0) return;
    db.update<PresenceSession>(PRESENCE_COLLECTION, id, {
      online: false,
      last_seen: new Date().toISOString(),
    }).catch(() => { /* best effort on unload */ });
  }, 1200);
}

function onVisibility(): void {
  if (typeof document === 'undefined') return;
  if (document.hidden) {
    hiddenSince = Date.now();
  } else {
    hiddenSince = null;
    void beat(true);
  }
}

function onLeave(): void {
  const id = sessionId;
  if (!id) return;
  db.update<PresenceSession>(PRESENCE_COLLECTION, id, {
    online: false,
    last_seen: new Date().toISOString(),
  }).catch(() => { /* best effort on unload */ });
}

/** Starts (or joins) the heartbeat. Returns the release function. */
export function acquirePresence(): () => void {
  refs += 1;
  if (refs === 1) {
    void beat(true);
    timer = window.setInterval(() => { void beat(); }, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onLeave);
    window.addEventListener('pagehide', onLeave);
    console.log('[presence] heartbeat started');
  }
  return () => {
    refs = Math.max(0, refs - 1);
    if (refs === 0) {
      if (timer !== null) { window.clearInterval(timer); timer = null; }
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onLeave);
      window.removeEventListener('pagehide', onLeave);
      markOffline();
    }
  };
}
