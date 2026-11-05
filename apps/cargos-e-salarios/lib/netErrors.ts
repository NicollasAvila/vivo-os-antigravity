/**
 * Network blips vs. real failures.
 *
 * Background work (the silent list refresh, the presence heartbeat) runs while
 * the person switches tabs, loses Wi-Fi for a second or closes the app. The
 * browser aborts the in-flight request and throws `TypeError: Failed to fetch`.
 * That is not a bug and must not be reported as an error — it just means "try
 * again on the next cycle".
 *
 * ⚠️ Desde 17/09 a API de dados dos Apps ADMITE a carga aos poucos: com 8
 * leituras em voo por App (12 por workspace, 16 por nó) ou 2 escritas por App,
 * ela responde 429/503 com `data_busy` / `data_rate_limited` /
 * `data_unavailable` ANTES de executar qualquer coisa. Isso é "tente de novo
 * em alguns segundos", nunca "não existe" — e tratar como falha definitiva era
 * o que deixava telas em branco e listas vazias sem aviso.
 */

const RECUSAS_DE_ADMISSAO = ['data_busy', 'data_rate_limited', 'data_unavailable'];

function codigoDe(err: any): string {
  return String(err?.body?.error || err?.message || err || '').trim().toLowerCase();
}

/**
 * A plataforma recusou o pedido NA PORTA (antes de ler ou gravar).
 *
 * É a única falha em que repetir uma ESCRITA é seguro: o plug de admissão
 * interrompe a requisição antes do controlador, então nada foi gravado.
 */
export function isAdmissionRefusal(err: any): boolean {
  if (!err) return false;
  const codigo = codigoDe(err);
  return RECUSAS_DE_ADMISSAO.some((c) => codigo === c || codigo.startsWith(`${c}:`));
}

/** Quantos milissegundos a plataforma pediu para esperar (padrão: 5 s). */
export function retryAfterMs(err: any, padrao = 5000): number {
  const segundos = Number(err?.body?.retry_after);
  return Number.isFinite(segundos) && segundos >= 0 ? Math.min(60_000, segundos * 1000) : padrao;
}

export function isTransientNetworkError(err: any): boolean {
  if (!err) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (isAdmissionRefusal(err)) return true;

  const name = String(err?.name || '');
  if (name === 'AbortError' || name === 'NetworkError' || name === 'TimeoutError') return true;

  const message = String(err?.message || err || '').toLowerCase();
  return (
    message.includes('data_busy') ||
    message.includes('data_rate_limit') ||
    message.includes('too many requests') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('load failed') ||
    message.includes('operation was aborted') ||
    message.includes('connection closed') ||
    message.includes('err_network') ||
    message.includes('err_internet_disconnected')
  );
}

/** True while the browser reports no connection at all. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Runs a read and quietly retries it while the failure is only a network blip
 * or an admission refusal. Real errors (permission, bad payload, a column that
 * does not exist) surface on the first attempt.
 */
export async function withNetworkRetry<T>(run: () => Promise<T>, attempts = 3, delayMs = 900): Promise<T> {
  let last: any = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await run();
    } catch (err) {
      last = err;
      if (!isTransientNetworkError(err) || attempt === attempts - 1) throw err;
      await wait(delayMs * (attempt + 1));
    }
  }
  throw last;
}
