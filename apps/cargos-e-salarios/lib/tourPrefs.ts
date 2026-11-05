// ============================================================================
// tourPrefs — memória local dos guias de uso (por pessoa, por dispositivo)
// ============================================================================
//
// Guarda o que já foi visto e se as dicas automáticas estão ligadas.
// Para ADICIONAR um tour novo: inclua o id no union `TourId` abaixo e
// registre a definição em services/tours.ts. Nada mais muda aqui.
// ============================================================================

import { readJsonPref, writeJsonPref, readPref, writePref, removePref } from './storage';

/** Todos os guias disponíveis no app. Adicione ids aqui ao criar tours novos. */
export type TourId = 'welcome' | 'settings';

const SEEN = 'tour.seen';
const AUTO = 'tour.auto';

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
}

/** Re-render helper para telas que listam os tours. */
export function subscribeTourPrefs(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function seenTours(): TourId[] {
  const parsed = readJsonPref<TourId[]>(SEEN, [], true);
  return Array.isArray(parsed) ? parsed : [];
}

export function isTourSeen(id: TourId): boolean {
  return seenTours().includes(id);
}

export function markTourSeen(id: TourId): void {
  const list = seenTours();
  if (list.includes(id)) return;
  writeJsonPref(SEEN, [...list, id], true);
  console.log('[tour] marked as seen', id);
  emit();
}

export function forgetTour(id: TourId): void {
  writeJsonPref(SEEN, seenTours().filter((item) => item !== id), true);
  emit();
}

export function forgetAllTours(): void {
  removePref(SEEN, true);
  emit();
}

/** Guias ficam disponíveis na Ajuda; a pessoa pode ativar dicas automáticas. */
export function autoToursEnabled(): boolean {
  return readPref(AUTO, true) === 'on';
}

export function setAutoTours(enabled: boolean): void {
  writePref(AUTO, enabled ? 'on' : 'off', true);
  emit();
}
