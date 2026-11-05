import React from 'react';
import Avatar from './Avatar';
import Tooltip, { type TooltipPlacement } from '../ui/Tooltip';
import { usePresence } from '../../hooks/usePresence';
import { tPresence } from '../../lib/i18nPresence';
import type { OnlinePerson } from '../../services/presence';

type Variant = 'expanded' | 'rail' | 'bar';

interface PresencePanelProps {
  /** expanded = sidebar open · rail = collapsed sidebar · bar = mobile top bar */
  variant?: Variant;
}

function personLabel(person: OnlinePerson): string {
  return person.isSelf ? `${person.name} (${tPresence('presence.you')})` : person.name;
}

function OnlineAvatar({ person, placement }: { person: OnlinePerson; placement: TooltipPlacement }) {
  return (
    <Tooltip content={personLabel(person)} placement={placement}>
      <div className="relative cursor-default">
        <Avatar
          name={person.name}
          userId={person.user_id}
          size="xs"
          className={`ring-2 ring-white ${person.isSelf ? 'shadow-sm' : ''}`}
        />
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"
        />
      </div>
    </Tooltip>
  );
}

function MoreChip({ rest, placement }: { rest: OnlinePerson[]; placement: TooltipPlacement }) {
  if (rest.length === 0) return null;
  return (
    <Tooltip
      placement={placement}
      content={
        <span className="block space-y-0.5">
          {rest.map((p) => <span key={p.user_id} className="block">{personLabel(p)}</span>)}
        </span>
      }
    >
      <div className="w-6 h-6 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-[9px] font-semibold text-gray-600 cursor-default">
        {tPresence('presence.more', { count: rest.length })}
      </div>
    </Tooltip>
  );
}

export default function PresencePanel({ variant = 'expanded' }: PresencePanelProps) {
  const { people } = usePresence();
  if (people.length === 0) return null;

  const max = variant === 'expanded' ? 5 : 3;
  const shown = people.slice(0, max);
  const rest = people.slice(max);
  // Sidebar sits flush against the left edge, so bubbles open to the right
  // (same behaviour as the settings / language items). On the mobile top bar
  // they open downwards.
  const tip: TooltipPlacement = variant === 'bar' ? 'bottom' : 'right';

  if (variant === 'rail') {
    return (
      <div className="flex flex-col items-center gap-1.5 py-2">
        {shown.map((p) => <OnlineAvatar key={p.user_id} person={p} placement={tip} />)}
        <MoreChip rest={rest} placement={tip} />
      </div>
    );
  }

  if (variant === 'bar') {
    return (
      <div className="flex items-center -space-x-1.5">
        {shown.map((p) => <OnlineAvatar key={p.user_id} person={p} placement={tip} />)}
        <MoreChip rest={rest} placement={tip} />
      </div>
    );
  }

  return (
    <div className="px-2.5 py-2">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 truncate">
          {tPresence('presence.online_now')}
        </span>
        <span className="ml-auto text-[11px] font-medium text-gray-400">{people.length}</span>
      </div>
      <div className="flex items-center -space-x-1.5">
        {shown.map((p) => <OnlineAvatar key={p.user_id} person={p} placement={tip} />)}
        <MoreChip rest={rest} placement={tip} />
      </div>
      {people.length === 1 && people[0].isSelf && (
        <p className="mt-1.5 text-[11px] text-gray-400 truncate">{tPresence('presence.only_you')}</p>
      )}
    </div>
  );
}
