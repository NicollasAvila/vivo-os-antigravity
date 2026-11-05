import { useCallback, useEffect, useRef, useState } from 'react';
import { approvals, type AppApproval, type ApprovalDecision } from '../lib/seiva';

/**
 * The approval cards the App's own agent raised for the signed-in person
 * (Actions declared with `approval`). Loads the pending list, refreshes when
 * the platform pushes `approval.requested` / `approval.resolved` on the agent
 * channel, and exposes `decide` — the card is the authorization; what the
 * person approves (edits included) is exactly what runs.
 *
 *   const { items, loading, decide } = useApprovals();
 *   items.map((a) => <ApprovalCard key={a.id} approval={a} onDecide={decide} />)
 */
export function useApprovals(): {
  items: AppApproval[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  decide: (id: string, opts: ApprovalDecision) => Promise<AppApproval>;
} {
  const [items, setItems] = useState<AppApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const list = await approvals.pending();
      if (!alive.current) return;
      setItems(list);
      setError(null);
    } catch (e: any) {
      if (!alive.current) return;
      // A token without a signed-in person (public/guest) has no cards: not an error to show.
      setItems([]);
      setError(e?.code === 'app_session_required' ? null : e?.message || String(e));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void refresh();
    const offRequested = approvals.onRequested(() => void refresh());
    const offResolved = approvals.onResolved(() => void refresh());
    return () => {
      alive.current = false;
      offRequested();
      offResolved();
    };
  }, [refresh]);

  const decide = useCallback(
    async (id: string, opts: ApprovalDecision) => {
      const decided = await approvals.decide(id, opts);
      await refresh();
      return decided;
    },
    [refresh],
  );

  return { items, loading, error, refresh, decide };
}
