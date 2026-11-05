import React, { useMemo, useState } from 'react';
import type { AppApproval, ApprovalDecision, ApprovalReviewField } from '../../lib/seiva';
import { Button } from './Button';

type Props = {
  approval: AppApproval;
  /** Usually `decide` from `useApprovals()`. */
  onDecide: (id: string, opts: ApprovalDecision) => Promise<unknown>;
  /** Called after a decision was registered (either verb). */
  onDecided?: (approval: AppApproval, decision: 'approve' | 'reject') => void;
};

/**
 * The review card of an App Action awaiting the person inside the App.
 *
 * Renders the platform-built `review` (headline, summary, sections) — never
 * the raw payload — with inputs only for the leaves the platform marked
 * editable (the Action's `input.*`). Approve sends the edits and the
 * `revision` the person saw; a card that changed underneath is refused by
 * the server and surfaced here instead of silently re-approved.
 */
export function ApprovalCard({ approval, onDecide, onDecided }: Props) {
  const review = approval.review;
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fields = useMemo<ApprovalReviewField[]>(() => {
    if (!review) return [];
    const out: ApprovalReviewField[] = [];
    for (const section of review.sections) {
      if (section.type === 'fields') out.push(...(section as any).fields);
    }
    return out;
  }, [review]);

  const kv = useMemo(() => {
    if (!review) return [] as { label: string; value: any; long?: boolean }[];
    const out: { label: string; value: any; long?: boolean }[] = [];
    for (const section of review.sections) {
      if (section.type === 'kv') out.push(...(section as any).items);
    }
    return out;
  }, [review]);

  const pending = approval.status === 'pending';

  async function submit(decision: 'approve' | 'reject') {
    setBusy(decision);
    setError(null);
    setFieldErrors({});
    try {
      const opts: ApprovalDecision = {
        decision,
        expectedRevision: approval.revision,
        note: note.trim() || undefined,
      };
      if (decision === 'approve' && Object.keys(edits).length > 0) {
        opts.edits = { fields: edits };
      }
      await onDecide(approval.id, opts);
      onDecided?.(approval, decision);
    } catch (e: any) {
      if (e?.errors && typeof e.errors === 'object') setFieldErrors(e.errors);
      setError(
        e?.code === 'stale_revision'
          ? 'Esta solicitação mudou desde que foi aberta. Recarregue o card antes de decidir.'
          : e?.message || 'Não foi possível registrar a decisão.',
      );
    } finally {
      setBusy(null);
    }
  }

  if (!review) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
        Solicitação de aprovação ({approval.action_name || approval.id}).
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3"
      role="group"
      aria-label={review.headline}
      data-approval-id={approval.id}
    >
      <div className="space-y-1">
        <div className="text-xs font-medium uppercase tracking-wide text-amber-700">
          {pending ? 'Aprovação necessária' : `Decisão: ${approval.status}`}
        </div>
        <h3 className="text-base font-semibold text-gray-900">{review.headline}</h3>
        {review.summary && <p className="text-sm text-gray-700">{review.summary}</p>}
        {review.why && <p className="text-xs text-gray-500">{review.why}</p>}
      </div>

      {fields.length > 0 && (
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {fields.map((field) => {
            const value = field.key in edits ? edits[field.key] : field.value;
            const editable = pending && field.editable;
            const err = fieldErrors[field.key];
            return (
              <div key={field.key} className="min-w-0">
                <dt className="text-xs text-gray-500">{field.label}</dt>
                <dd className="mt-0.5">
                  {editable ? (
                    field.kind === 'select' && field.options?.length ? (
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
                        value={String(value ?? '')}
                        onChange={(e) => setEdits({ ...edits, [field.key]: e.target.value })}
                      >
                        {field.options.map((opt) => (
                          <option key={String(opt.value)} value={String(opt.value)}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.kind === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => setEdits({ ...edits, [field.key]: e.target.checked })}
                      />
                    ) : field.kind === 'textarea' || (typeof value === 'string' && value.length > 80) ? (
                      <textarea
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
                        rows={3}
                        value={String(value ?? '')}
                        onChange={(e) => setEdits({ ...edits, [field.key]: e.target.value })}
                      />
                    ) : (
                      <input
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
                        type={typeof value === 'number' ? 'number' : 'text'}
                        value={String(value ?? '')}
                        onChange={(e) => setEdits({ ...edits, [field.key]: e.target.value })}
                      />
                    )
                  ) : (
                    <span className="text-sm text-gray-900 break-words">{String(value ?? '—')}</span>
                  )}
                  {err && <p className="text-xs text-red-600">{err}</p>}
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      {kv.length > 0 && (
        <dl className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {kv.map((item) => (
            <div key={item.label} className={item.long ? 'sm:col-span-2' : ''}>
              <dt className="text-xs text-gray-500">{item.label}</dt>
              <dd className="text-sm text-gray-900 break-words">{String(item.value ?? '—')}</dd>
            </div>
          ))}
        </dl>
      )}

      {pending && (
        <textarea
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
          rows={2}
          placeholder="Observação (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {pending && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" disabled={busy !== null} onClick={() => void submit('reject')}>
            {busy === 'reject' ? '…' : review.actions.reject}
          </Button>
          <Button disabled={busy !== null} onClick={() => void submit('approve')}>
            {busy === 'approve' ? '…' : review.actions.approve}
          </Button>
        </div>
      )}
    </div>
  );
}
