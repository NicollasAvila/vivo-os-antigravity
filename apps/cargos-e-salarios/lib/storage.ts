// ============================================================================
// storage — preferências locais (localStorage) com prefixo único do app
// ============================================================================
//
// Toda leitura/escrita de preferência local passa por aqui:
//   - um único prefixo evita colisão com outros apps servidos no mesmo domínio;
//   - `perUser: true` isola a preferência por pessoa (sidebar de A não afeta B
//     no mesmo computador compartilhado);
//   - todas as chamadas são à prova de storage bloqueado (modo anônimo,
//     iframes com restrição) — nunca quebram a tela.
//
// NÃO grave dados de negócio aqui — dado de negócio vive nas collections
// (db.* / useCollection). localStorage é só para preferência de interface:
// idioma, sidebar recolhida, layout escolhido, tours vistos, avisos fechados.
// ============================================================================

import { users as usersApi } from './seiva';

/** Prefixo único deste app no localStorage (preenchido na criação do app). */
export const STORAGE_PREFIX = 'cargos_e_sala_rios_px';

function userId(): string {
  try {
    return usersApi.currentUser()?.id || 'anon';
  } catch {
    return 'anon';
  }
}

/** Chave completa: `app.nome` ou `app.nome.<user_id>` quando por pessoa. */
export function prefKey(name: string, perUser = false): string {
  return perUser ? `${STORAGE_PREFIX}.${name}.${userId()}` : `${STORAGE_PREFIX}.${name}`;
}

export function readPref(name: string, perUser = false): string | null {
  try {
    return window.localStorage.getItem(prefKey(name, perUser));
  } catch {
    return null;
  }
}

export function writePref(name: string, value: string, perUser = false): void {
  try {
    window.localStorage.setItem(prefKey(name, perUser), value);
  } catch { /* storage bloqueado — preferência só não persiste */ }
}

export function removePref(name: string, perUser = false): void {
  try {
    window.localStorage.removeItem(prefKey(name, perUser));
  } catch { /* ignore */ }
}

/** Variante JSON — para listas/objetos pequenos (ex.: ids de tours vistos). */
export function readJsonPref<T>(name: string, fallback: T, perUser = false): T {
  const raw = readPref(name, perUser);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonPref(name: string, value: unknown, perUser = false): void {
  try {
    writePref(name, JSON.stringify(value), perUser);
  } catch { /* ignore */ }
}
