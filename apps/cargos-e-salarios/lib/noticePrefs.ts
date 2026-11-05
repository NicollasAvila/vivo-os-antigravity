// Memória por pessoa de quais avisos informativos (DismissibleNotice) foram
// fechados. O id do aviso deve ser estável — mudá-lo faz o aviso reaparecer.

import { readPref, writePref, removePref } from './storage';

function key(id: string): string {
  return `notice.${id}`;
}

export function isNoticeDismissed(id: string): boolean {
  return readPref(key(id), true) === 'dismissed';
}

export function dismissNotice(id: string) {
  writePref(key(id), 'dismissed', true);
  console.log('[notice] dismissed', id);
}

export function restoreNotice(id: string) {
  removePref(key(id), true);
}
