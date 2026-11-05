import { useState, useEffect, useCallback, useRef } from 'react';
import { db, users } from '../lib/seiva';
import { isTransientNetworkError, withNetworkRetry } from '../lib/netErrors';

/**
 * useCollection — list page hook with REAL-TIME synchronization.
 *
 * What it does:
 *   1. Loads the collection on mount.
 *   2. Subscribes to realtime events (`created` / `updated` / `deleted`).
 *      Any change — from this user, another tab, the AI agent, or another
 *      user with access — is reflected automatically. No refetch needed.
 *   3. Keeps `create` / `update` / `remove` for instant local feedback in
 *      the component that triggers the write. Collection-backed CRUD screens
 *      should call these helpers directly instead of importing `db` and
 *      hand-maintaining local arrays. The realtime event that comes back is
 *      deduped against what's already in state, so you never get duplicates
 *      or flicker.
 *
 * Why subscribing matters:
 *   The agent (Monica) and other users can write to the same collection
 *   you're viewing. Without a subscription your list stays frozen on the
 *   data it had at mount and only refreshes on page reload. With this
 *   hook the list updates the moment a write happens, regardless of
 *   source. THIS IS NOT OPTIONAL — every list page in a Seiva app must
 *   use this hook (or call `db.subscribe` directly with the same merge
 *   semantics).
 *
 * @example
 *   const { items, loading, create, update, remove } = useCollection<Conta>('contas');
 *   const { items } = useCollection<Sessao>('presence', { pollMs: 12000 });
 */
export interface UseCollectionOptions {
  /**
   * Safety net for collections that MUST stay live even if the realtime
   * channel misses an event (presence roster, notification inbox): quietly
   * re-reads the collection every N ms while the tab is visible. The refresh
   * never toggles `loading` and only re-renders when something really changed.
   */
  pollMs?: number;
  /** Re-read as soon as the tab regains focus. Defaults to true when polling. */
  refreshOnFocus?: boolean;
}

export function useCollection<T extends { id: string }>(collection: string, options: UseCollectionOptions = {}) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollMs = options.pollMs ?? 0;
  const refreshOnFocus = options.refreshOnFocus ?? pollMs > 0;

  // Hold the latest collection name in a ref so the subscription effect
  // can re-create cleanly when the caller swaps collections without
  // triggering a feedback loop on every state change.
  const collectionRef = useRef(collection);
  collectionRef.current = collection;

  // Mirror of the rendered list, read by the background refresh to diff
  // against the server without depending on the effect closure.
  const itemsRef = useRef<T[]>(items);
  itemsRef.current = items;
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await withNetworkRetry(() => loadAll<T>(collection));
      setItems(data);
    } catch (err: any) {
      logReadFailure(collection, err);
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [collection]);

  // ---------------------------------------------------------------------
  // Initial fetch + realtime subscription
  // ---------------------------------------------------------------------
  useEffect(() => {
    let active = true;

    // 1) Fetch. A busy refusal (`data_busy`) on the FIRST read is not a
    // failure: the data API admits reads a few at a time when a screen asks
    // for many collections at once. Keep trying with growing waits instead of
    // handing the screen an empty list — an empty `app_admins` reads as "this
    // app has no administrator", an empty list reads as "nothing here".
    (async () => {
      const waits = [1500, 3000, 6000, 12000];
      for (let attempt = 0; ; attempt += 1) {
        try {
          setLoading(true);
          setError(null);
          const data = await withNetworkRetry(() => loadAll<T>(collection));
          if (!active) return;
          setItems(data);
          setLoading(false);
          return;
        } catch (err: any) {
          if (!active) return;
          if (isTransientNetworkError(err) && attempt < waits.length) {
            console.log('[useCollection] read deferred (busy), retrying', { collection, attempt: attempt + 1 });
            await new Promise<void>((resolve) => window.setTimeout(resolve, waits[attempt]));
            if (!active) return;
            continue;
          }
          logReadFailure(collection, err);
          setError(err?.message || 'Failed to load data');
          setLoading(false);
          return;
        }
      }
    })();

    // 2) Subscribe (server realtime)
    const unsubscribe = db.subscribe<T>(collection, (event) => {
      if (!active || event.collection !== collection) return;
      setItems((prev) => applyChange(prev, event));
    });

    // 3) Subscribe (in-tab bus) — writes made by ANOTHER component of this
    //    same tab (a modal, a side panel) must reach every mounted list of
    //    the same collection immediately, without waiting for (or relying
    //    on) the server broadcast round-trip.
    const unsubscribeLocal = subscribeLocal(collection, (event) => {
      if (!active) return;
      setItems((prev) => applyChange(prev, event as any));
    });

    return () => {
      active = false;
      try { unsubscribe(); } catch { /* noop */ }
      try { unsubscribeLocal(); } catch { /* noop */ }
    };
  }, [collection]);

  // ---------------------------------------------------------------------
  // Background refresh — the realtime channel is the primary path, this is
  // the fallback that guarantees a colleague's write (a new notification, a
  // heartbeat from someone who just opened the app) shows up without the
  // person reloading the page.
  // ---------------------------------------------------------------------
  const quietSync = useCallback(async () => {
    const name = collectionRef.current;
    if (syncingRef.current) return;
    syncingRef.current = true;
    // Nothing to sync while the browser reports no connection — the next
    // cycle (or the focus listener) picks it up as soon as it is back.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      syncingRef.current = false;
      return;
    }
    lastSyncAt.set(name, Date.now());
    try {
      const fresh = await loadAll<T>(name);
      if (collectionRef.current !== name) return;
      const previous = itemsRef.current;
      if (signatureOf(previous) === signatureOf(fresh)) return;
      itemsRef.current = fresh;
      setItems(fresh);
      setError(null);
      // Other mounted instances of the same collection reuse this read.
      broadcastDiff(name, previous, fresh);
      console.log('[useCollection] background refresh', { collection: name, count: fresh.length });
    } catch (err) {
      // A dropped request during a background refresh is expected (tab going
      // to sleep, Wi-Fi hiccup). The list keeps the data it already has and
      // the next cycle retries — never surface it as an error.
      if (isTransientNetworkError(err)) {
        console.log('[useCollection] background refresh skipped (connection)', { collection: name });
      } else {
        console.error('[useCollection] background refresh failed', err);
      }
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!pollMs) return;
    const id = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      // Several mounted instances (sidebar + page) share one read per cycle.
      const last = lastSyncAt.get(collectionRef.current) || 0;
      if (Date.now() - last < pollMs * 0.75) return;
      void quietSync();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, collection, quietSync]);

  useEffect(() => {
    if (!refreshOnFocus) return;
    const wake = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void quietSync();
    };
    window.addEventListener('focus', wake);
    document.addEventListener('visibilitychange', wake);
    return () => {
      window.removeEventListener('focus', wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [refreshOnFocus, collection, quietSync]);

  // ---------------------------------------------------------------------
  // Write helpers — instant local feedback. The realtime event that
  // bounces back from the server is deduped by the merge function below,
  // so calling create/update/remove and ALSO receiving the broadcast is
  // safe (no double-insert, no flicker).
  // ---------------------------------------------------------------------
  const create = useCallback(async (data: Partial<T>) => {
    const created = await db.create<T>(collection, data);
    setItems((prev) => mergeUpsert(prev, created));
    emitLocal(collection, { type: 'created', record: created });
    return created;
  }, [collection]);

  const update = useCallback(async (id: string, data: Partial<T>) => {
    const updated = await db.update<T>(collection, id, data);
    const merged = { id, ...(data as any), ...(updated as any) } as T;
    setItems((prev) => mergeUpsert(prev, merged));
    emitLocal(collection, { type: 'updated', record: merged });
    return updated;
  }, [collection]);

  const remove = useCallback(async (id: string) => {
    await db.remove(collection, id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    emitLocal(collection, { type: 'deleted', record: { id } });
  }, [collection]);

  return { items, loading, error, refresh, create, update, remove };
}

// ---------------------------------------------------------------------
// In-tab bus — the server realtime channel does not necessarily echo a
// write back to the very tab that made it, so two components rendering
// the same collection (e.g. the board columns and the automations modal)
// would drift apart until a remount. Every write helper republishes the
// record here and every mounted instance merges it with the exact same
// idempotent semantics used for server events.
// ---------------------------------------------------------------------
type LocalEvent = { type: 'created' | 'updated' | 'deleted'; record: any };
type LocalListener = (event: LocalEvent) => void;

const localBus = new Map<string, Set<LocalListener>>();

function subscribeLocal(collection: string, listener: LocalListener): () => void {
  let set = localBus.get(collection);
  if (!set) {
    set = new Set<LocalListener>();
    localBus.set(collection, set);
  }
  set.add(listener);
  return () => {
    const current = localBus.get(collection);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) localBus.delete(collection);
  };
}

/** Last background read per collection — shared by every mounted instance. */
const lastSyncAt = new Map<string, number>();

/** Cheap change detector: ids + server timestamps, in order. */
function signatureOf(list: any[]): string {
  return (list ?? [])
    .map((item) => {
      if (!item) return '';
      const stamp = item._updated_at || item.updated_at || item.last_seen;
      if (stamp) return `${item.id}:${stamp}`;
      // No timestamp on the record — fall back to the payload itself.
      try { return `${item.id}:${JSON.stringify(item)}`; } catch { return `${item.id}`; }
    })
    .join('|');
}

/** Republishes what a background read changed so sibling lists stay in sync. */
function broadcastDiff(collection: string, previous: any[], fresh: any[]) {
  const before = new Map((previous ?? []).map((item) => [item?.id, item]));
  (fresh ?? []).forEach((item) => {
    if (!item?.id) return;
    const old = before.get(item.id);
    if (!old || signatureOf([old]) !== signatureOf([item])) {
      emitLocal(collection, { type: old ? 'updated' : 'created', record: item });
    }
    before.delete(item.id);
  });
  before.forEach((_value, id) => {
    if (id) emitLocal(collection, { type: 'deleted', record: { id } });
  });
}

function emitLocal(collection: string, event: LocalEvent) {
  const set = localBus.get(collection);
  if (!set || set.size === 0) return;
  Array.from(set).forEach((listener) => {
    try { listener(event); } catch (err) { console.error('[useCollection] local listener failed', err); }
  });
}

// ---------------------------------------------------------------------
// Full load — `db.list` is paginated (default 100, max 1000), so a plain
// call silently truncates boards/lists once a collection grows. Walk the
// pages until the server returns a short page (with a hard safety cap).
// ---------------------------------------------------------------------
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

/** Connection blips are logged as info; anything else is a real error. */
function logReadFailure(collection: string, err: any) {
  if (isTransientNetworkError(err)) {
    console.log('[useCollection] read unavailable (connection)', { collection });
    return;
  }
  console.error('[useCollection] read failed', { collection }, err);
}

// The same collection requested at the same time by several instances (page +
// sidebar + a hook used in three components) becomes ONE read. Only what is in
// flight is shared, per user — nothing is kept after it arrives.
const activeReads = new Map<string, Promise<any[]>>();

function loadAll<T extends { id: string }>(collection: string): Promise<T[]> {
  const key = JSON.stringify([users.currentUser()?.id || '', collection]);
  const current = activeReads.get(key);
  if (current) return current as Promise<T[]>;
  const next = loadAllPages<T>(collection).finally(() => activeReads.delete(key));
  activeReads.set(key, next);
  return next;
}

async function loadAllPages<T extends { id: string }>(collection: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await db.list<T>(collection, { limit: PAGE_SIZE, offset: page * PAGE_SIZE });
    const rows = batch ?? [];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return out;
}

// ---------------------------------------------------------------------
// Merge helpers (idempotent — safe to call from both write callbacks
// and incoming subscription events for the same record).
// ---------------------------------------------------------------------

function applyChange<T extends { id: string }>(
  items: T[],
  event: { type: 'created' | 'updated' | 'deleted'; record: any }
): T[] {
  if (event.type === 'deleted') {
    const id = event.record?.id;
    if (!id) return items;
    return items.filter((item) => item.id !== id);
  }

  const incoming = event.record as T;
  if (!incoming || !(incoming as any).id) return items;
  return mergeUpsert(items, incoming);
}

function mergeUpsert<T extends { id: string }>(items: T[], incoming: T): T[] {
  const idx = items.findIndex((i) => i.id === incoming.id);
  if (idx === -1) {
    // New record — newest-first (mirrors the list ordering most apps want).
    return [incoming, ...items];
  }

  const existing = items[idx] as any;
  const next = incoming as any;

  // Prefer the newer of the two by `_updated_at` timestamp (set by the
  // platform). Timestamps are second-granularity, so equal timestamps may
  // still carry a real same-second edit; only discard strictly older data.
  if (existing?._updated_at && next?._updated_at) {
    if (next._updated_at < existing._updated_at) return items;
  }

  const copy = items.slice();
  copy[idx] = { ...(existing as T), ...(incoming as T) } as T;
  return copy;
}
