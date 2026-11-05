// Current signed-in person, resolved defensively.
// The platform injects the authenticated user at runtime — there is no login
// flow in the app. Every read is guarded so a missing field never crashes a screen.
import { users } from './seiva';

declare const seiva: any;

export interface CurrentActor {
  id: string;
  name: string;
  email: string;
}

export function currentActor(): CurrentActor {
  try {
    const u = (users as any)?.currentUser?.();
    if (u?.id) return { id: u.id, name: u.name || u.email || '', email: u.email || '' };
  } catch (err) {
    console.error('[me] currentUser failed', err);
  }
  const raw = typeof seiva !== 'undefined' ? seiva?.user : null;
  return { id: raw?.id || '', name: raw?.name || raw?.email || '', email: raw?.email || '' };
}
