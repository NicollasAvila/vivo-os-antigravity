/** Bound concurrent App data reads and honor admission backoff. Writes are never retried. */
export function createReadQueue(fetcher: typeof fetch, apiOrigin: string, concurrency = 3): typeof fetch {
  let active = 0;
  const waiting: Array<() => void> = [];
  const enter = () => new Promise<void>((resolve) => {
    const start = () => { active += 1; resolve(); };
    if (active < concurrency) start(); else waiting.push(start);
  });
  const leave = () => { active -= 1; waiting.shift()?.(); };
  const abortError = () => new DOMException('The operation was aborted', 'AbortError');
  const wait = (ms: number, signal?: AbortSignal | null) => new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(abortError()); return; }
    const abort = () => { clearTimeout(timer); reject(abortError()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
    const url = new URL(request?.url || String(input), apiOrigin);
    const method = (init?.method || request?.method || 'GET').toUpperCase();
    const dataPath = /^\/api\/v1\/apps\/(data|datapacks|ducklake)\//.test(url.pathname);
    const read = method === 'GET' || method === 'HEAD' ||
      (method === 'POST' && /^\/api\/v1\/apps\/ducklake\/[^/]+\/[^/]+\/query$/.test(url.pathname));
    if (url.origin !== new URL(apiOrigin).origin || !dataPath || !read) return fetcher(input, init);
    const signal = init?.signal || request?.signal;
    // A caller's Request body can be consumed only once. Clone it per read attempt.
    await enter();
    try {
      for (let attempt = 0; ; attempt += 1) {
        if (signal?.aborted) throw abortError();
        const response = await fetcher(request ? request.clone() : input, init);
        if (![429, 503].includes(response.status) || attempt >= 3) return response;
        const body = await response.clone().json().catch(() => null);
        if (!['data_busy', 'data_rate_limited', 'data_unavailable'].includes(body?.error)) return response;
        const header = response.headers.get('retry-after');
        const seconds = header !== null ? Number(header) : Number(body?.retry_after ?? 5);
        const delay = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 5000;
        await response.body?.cancel();
        await wait(Math.min(60_000, delay) + attempt * 250, signal);
      }
    } finally { leave(); }
  };
}

// Installed before App effects run; the generated SDK retains its own auth and
// response parsing. Only reads to the configured Mogno API pass through the queue.
if (typeof window !== 'undefined' && !(window as any).__mognoReadQueue) {
  const origin = (window as any).__SEIVA_CONFIG__?.apiUrl || window.location.origin;
  window.fetch = createReadQueue(window.fetch.bind(window), origin);
  (window as any).__mognoReadQueue = true;
}
