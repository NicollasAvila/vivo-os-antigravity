import { useEffect, useMemo, useState } from 'react';
import { useCollection } from './useCollection';
import { users } from '../lib/seiva';
import {
  PRESENCE_COLLECTION,
  TICK_MS,
  acquirePresence,
  buildOnlineList,
  type OnlinePerson,
  type PresenceSession,
} from '../services/presence';

/**
 * Live roster of everyone currently in the app (the viewer included).
 * Subscribes to the presence collection and keeps the local heartbeat alive.
 */
export function usePresence(): { people: OnlinePerson[]; loading: boolean; selfId: string | null } {
  // The roster must react to people arriving and leaving without a reload, so
  // it re-reads periodically on top of the realtime channel.
  const { items, loading } = useCollection<PresenceSession>(PRESENCE_COLLECTION, {
    pollMs: 12_000,
    refreshOnFocus: true,
  });
  const me = users.currentUser();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => acquirePresence(), []);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(tick);
  }, []);

  const people = useMemo(
    () => buildOnlineList(items, now, me?.id, me?.name),
    [items, now, me?.id, me?.name],
  );

  return { people, loading, selfId: me?.id ?? null };
}
