// ============================================================================
// appName — fonte única do nome de exibição do app
// ============================================================================
//
// O nome mostrado em QUALQUER lugar da interface (e nos e-mails que o app
// envia) é o nome que o workspace deu a este app na plataforma — nunca um
// literal digitado no código. Se a plataforma renomear o app, todas as telas
// acompanham no próximo load.
//
// Como funciona:
//   1. o último nome conhecido fica em cache no localStorage, então a primeira
//      pintura já sai correta (sem flash do nome antigo);
//   2. no boot o nome real é resolvido do runtime da plataforma e, quando muda,
//      todo assinante re-renderiza (hooks/useAppName.ts);
//   3. `brand()` reescreve o token `{{app}}` dos dicionários com o nome atual,
//      então as traduções ficam genéricas.
//
// Nos componentes use SEMPRE `useAppName()` (hook) ou o token `{{app}}` nas
// strings — nunca importe FALLBACK_NAME diretamente.
// ============================================================================

import { db } from './seiva';

declare const seiva: any;

/** Usado apenas até a plataforma responder (e se ela nunca responder).
 *  Preenchido automaticamente com o nome do app na criação. */
const FALLBACK_NAME = 'Cargos e Salários PX';

const CACHE_KEY = 'app.name_cache';
const PUBLISHED_KEY = 'app.name_published';
const APP_TOKEN_RE = /\{\{\s*app\s*\}\}/g;
const SETTINGS_COLLECTION = 'app_settings';
const SETTINGS_KEY = 'app_name';

let current = readCache();
let pending: Promise<string> | null = null;
const listeners = new Set<(name: string) => void>();

function readCache(): string {
  try {
    const stored = (localStorage.getItem(CACHE_KEY) || '').trim();
    if (stored) return stored;
  } catch { /* storage bloqueado */ }
  return FALLBACK_NAME;
}

/**
 * Espelha o nome da plataforma em `app_settings` para rotinas server-side
 * (e-mails, digests) assinarem com o mesmo nome das telas. Best-effort,
 * gravado no máximo uma vez por nome.
 */
async function publishName(name: string): Promise<void> {
  try {
    if (localStorage.getItem(PUBLISHED_KEY) === name) return;
  } catch { /* publica mesmo assim */ }
  try {
    const rows = await db.list<{ id: string; key?: string; value?: string }>(SETTINGS_COLLECTION, { limit: 100 });
    const existing = (rows ?? []).find((row) => row?.key === SETTINGS_KEY);
    if (existing?.id) {
      if (existing.value !== name) await db.update(SETTINGS_COLLECTION, existing.id, { value: name });
    } else {
      await db.create(SETTINGS_COLLECTION, { key: SETTINGS_KEY, value: name });
    }
    try { localStorage.setItem(PUBLISHED_KEY, name); } catch { /* ignore */ }
  } catch (err) {
    console.error('[appName] could not publish the name for server e-mails', err);
  }
}

function commit(name: string, source: string): void {
  const clean = String(name ?? '').trim().slice(0, 60);
  if (!clean || clean === current) return;
  current = clean;
  try { localStorage.setItem(CACHE_KEY, clean); } catch { /* ignore */ }
  console.log('[appName] resolved from platform', { name: clean, source });
  publishName(clean).catch(() => {});
  listeners.forEach((listener) => {
    try { listener(clean); } catch (err) { console.error('[appName] listener failed', err); }
  });
}

/** O nome do app como configurado na plataforma. Sempre seguro chamar. */
export function appName(): string {
  return current;
}

/** Reescreve `{{app}}` com o nome da plataforma. Aplicado por todo tradutor. */
export function brand(text: string): string {
  if (!text || typeof text !== 'string') return text;
  if (text.indexOf('{{') < 0) return text;
  return text.replace(APP_TOKEN_RE, current);
}

export function subscribeAppName(listener: (name: string) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// ---------------------------------------------------------------------------
// Resolução (defensiva: globals do runtime → identidade da plataforma)
// ---------------------------------------------------------------------------

/** Lê chaves de nome em objetos de config (nunca em objetos de usuário). */
function pickName(source: any, depth = 0): string | null {
  if (!source || typeof source !== 'object' || depth > 2) return null;
  const direct = ['appName', 'app_name', 'appTitle', 'app_title', 'displayName', 'display_name', 'name', 'title'];
  for (const key of direct) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  for (const key of ['app', 'application', 'config', 'meta', 'info', 'data']) {
    const nested = pickName(source[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}

/** Igual, mas só chaves escopadas ao app — para payloads que também trazem o usuário. */
function pickAppScopedName(source: any): string | null {
  if (!source || typeof source !== 'object') return null;
  for (const key of ['app_name', 'appName', 'app_title', 'appTitle']) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return pickName(source.app, 1);
}

function fromRuntimeGlobals(): string | null {
  const w = window as any;
  const sources = [w?.__SEIVA_CONFIG__, w?.__SEIVA__, w?.seiva?.config, w?.seiva?.app, w?.seiva?.appInfo];
  for (const source of sources) {
    const found = pickName(source);
    if (found) return found;
  }
  return null;
}

async function fromPlatformIdentity(): Promise<string | null> {
  try {
    const me = await seiva?.user?.me?.();
    if (me && typeof me === 'object') return pickAppScopedName(me);
  } catch (err) {
    console.warn('[appName] identity lookup unavailable', err);
  }
  return null;
}

async function resolve(): Promise<string> {
  const fromGlobals = fromRuntimeGlobals();
  if (fromGlobals) { commit(fromGlobals, 'runtime-config'); return current; }

  const fromIdentity = await fromPlatformIdentity();
  if (fromIdentity) { commit(fromIdentity, 'identity'); return current; }

  console.log('[appName] platform name not exposed — keeping last known', { name: current });
  return current;
}

/** Resolve o nome da plataforma uma vez por sessão. Seguro chamar de qualquer lugar. */
export function ensureAppName(): Promise<string> {
  if (!pending) {
    pending = resolve().catch((err) => {
      console.error('[appName] resolution failed', err);
      return current;
    });
  }
  return pending;
}
