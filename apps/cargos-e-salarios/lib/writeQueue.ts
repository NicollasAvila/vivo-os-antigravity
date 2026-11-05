// ============================================================================
// Escritas na API de dados: no máximo DUAS por vez, e a recusa na porta é
// repetida em vez de virar erro.
//
// A plataforma admite no máximo 2 escritas simultâneas por App (4 por
// workspace) e responde `data_busy` à terceira. `lib/readQueue.ts` (do
// scaffold) enfileira só LEITURAS e deixa escrita passar direto — então
// "Publicar dicionário", que manda seis tabelas ao lago de uma vez, gravava
// duas e recusava quatro: dicionário publicado pela metade, sem que ninguém
// soubesse qual metade.
//
// Repetir é seguro SÓ para recusa de admissão (`data_busy`,
// `data_rate_limited`, `data_unavailable`): o plug interrompe a requisição
// antes do controlador, então nada foi gravado. Qualquer outra falha de escrita
// volta para quem chamou na primeira vez — inclusive erro de rede, em que o
// servidor pode ter gravado antes da conexão cair.
//
// Instale DEPOIS de `./readQueue` (App.tsx): este invólucro fica por fora e
// devolve as leituras intactas para a fila de leitura.
// ============================================================================

const RECUSAS = ['data_busy', 'data_rate_limited', 'data_unavailable'];

export function createWriteQueue(fetcher: typeof fetch, apiOrigin: string, concurrency = 2, tentativas = 4): typeof fetch {
  let active = 0;
  const waiting: Array<() => void> = [];
  const enter = () => new Promise<void>((resolve) => {
    const start = () => { active += 1; resolve(); };
    if (active < concurrency) start(); else waiting.push(start);
  });
  const leave = () => { active -= 1; waiting.shift()?.(); };
  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
    const url = new URL(request?.url || String(input), apiOrigin);
    const method = (init?.method || request?.method || 'GET').toUpperCase();
    const dataPath = /^\/api\/v1\/apps\/(data|datapacks|ducklake)\//.test(url.pathname);
    const leitura = method === 'GET' || method === 'HEAD' ||
      (method === 'POST' && /^\/api\/v1\/apps\/ducklake\/[^/]+\/[^/]+\/query$/.test(url.pathname));
    // Corpo em stream não pode ser reenviado: passa direto, sem repetição.
    const corpoReenviavel = !(init?.body && typeof ReadableStream !== 'undefined' && init.body instanceof ReadableStream);
    if (url.origin !== new URL(apiOrigin).origin || !dataPath || leitura || !corpoReenviavel) {
      return fetcher(input, init);
    }
    await enter();
    try {
      for (let tentativa = 0; ; tentativa += 1) {
        const response = await fetcher(request ? request.clone() : input, init);
        if (![429, 503].includes(response.status) || tentativa >= tentativas - 1) return response;
        const body = await response.clone().json().catch(() => null);
        if (!RECUSAS.includes(body?.error)) return response;
        const header = response.headers.get('retry-after');
        const segundos = header !== null ? Number(header) : Number(body?.retry_after ?? 5);
        const espera = Number.isFinite(segundos) && segundos >= 0 ? segundos * 1000 : 5000;
        await response.body?.cancel();
        await wait(Math.min(60_000, espera) + tentativa * 500);
      }
    } finally { leave(); }
  };
}

if (typeof window !== 'undefined' && !(window as any).__mognoWriteQueue) {
  const origin = (window as any).__SEIVA_CONFIG__?.apiUrl || window.location.origin;
  window.fetch = createWriteQueue(window.fetch.bind(window), origin);
  (window as any).__mognoWriteQueue = true;
}
