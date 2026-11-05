// SEIVA_SDK_VERSION: 32
// Typed wrapper around the Seiva SDK (auto-injected at build time).
// This file is rewritten on every build to match the platform SDK —
// do NOT hand-edit; add app-specific helpers in another file.
// Usage: import { db } from '../lib/seiva';
//
// ============================================================
// RECORD SHAPE — READ BEFORE WRITING ANY UI THAT DISPLAYS DATA
// ============================================================
// Two APIs return different shapes for the same record. Pick one and
// stay consistent in your component.
//
//   db.list<T>("socios")  →  [{ id, nome, email, ..., _created_at, _updated_at, _created_by, _allowed_user_ids }]
//                            FLAT — payload fields are spread to the top level.
//                            Access as: item.nome, item.email
//                            NEVER as:  item.data.nome   ← WRONG, will be undefined
//
//   seiva.data.list("socios")  →  { ok, data: [{ id, collection, data: { nome, email, ... }, created_at, ... }] }
//                                 RAW server shape — payload is nested under `data`.
//                                 Access as: row.data.nome
//
// The flat shape is what you almost always want. `data` is the JSONB
// column name on the server; the `db.*` wrapper unwraps it so your
// TypeScript interface should describe the *payload fields directly*:
//
//   interface Socio { id: string; nome: string; email: string; }      // ✓ correct for db.*
//   interface Socio { id: string; data: { nome: string } }            // ✗ wrong — that's the raw shape
//
// Same rule for db.create / db.update / db.get — they all return the flat shape.

type DuckLakeFilter =
  | { field: string; op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'between' | 'contains' | 'starts_with' | 'ends_with' | 'like' | 'ilike' | 'is_null' | 'is_not_null'; value?: any }
  | { and: DuckLakeFilter[] }
  | { or: DuckLakeFilter[] }
  | { not: DuckLakeFilter | DuckLakeFilter[] };

type DuckLakeAggregate = {
  op: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field?: string;
  as?: string;
};

type DuckLakeQuery = {
  columns?: string[];
  select?: string[];
  fields?: string[];
  where?: DuckLakeFilter | DuckLakeFilter[];
  filter?: DuckLakeFilter | DuckLakeFilter[];
  aggregate?: DuckLakeAggregate | DuckLakeAggregate[];
  group_by?: string | string[];
  order_by?: Array<string | { field: string; dir?: 'asc' | 'desc' }>;
  limit?: number;
};

export type ContextBlock = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  total_chunks?: number;
  total_tokens?: number;
  last_indexed_at?: string | null;
};

export type ContextSearchResult = {
  chunk_id: string;
  block_id: string;
  block_name: string;
  source_id: string;
  ord: number;
  snippet: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
};

declare const seiva: {
  // Workspace display timezone (IANA, e.g. "America/Sao_Paulo"), injected
  // by the platform at serve time. This is the BUSINESS timezone — always
  // format instants with it, never with the viewer's browser zone.
  timezone: string;
  // Timezone-correct formatting for instants (ISO-8601 strings or Date).
  // Wraps Intl.DateTimeFormat pinned to `seiva.timezone`. Prefer these
  // over toLocaleString()/manual Date math for any business timestamp.
  format: {
    dateTime: (value: string | Date, opts?: Intl.DateTimeFormatOptions) => string;
    date: (value: string | Date, opts?: Intl.DateTimeFormatOptions) => string;
    time: (value: string | Date, opts?: Intl.DateTimeFormatOptions) => string;
  };
  data: {
    // Records returned by list/get include `_created_by` (the user id that created the row)
    // and `_allowed_user_ids` (empty array = public within the app; non-empty = restricted).
    // To restrict a record at create/update time, include `_allowed_user_ids` in the data object.
    // `list` is paginated — default limit is 100, max 1000. NEVER aggregate
    // (`.length`, `.reduce(...)`, `.filter(...).length`) over the result.
    // For totals/sums/averages call `count` or `aggregate` instead.
    list: (collection: string, params?: Record<string, any>) => Promise<{ ok: boolean; data: any[]; collection: string; total_count?: number }>;
    // Server-side total count for a collection. Pass an optional filter to
    // count a subset. Always exact, never truncated by pagination.
    count: (collection: string, filter?: any) => Promise<{ ok: boolean; count: number; collection: string }>;
    // Server-side aggregation. `op` ∈ count|sum|avg|min|max. For sum/avg/min/max
    // the `field` is required. Pass `group_by` to get a per-group breakdown.
    // The response carries either `value` (scalar) or `groups` (array).
    aggregate: (collection: string, spec: {
      op: 'count' | 'sum' | 'avg' | 'min' | 'max';
      field?: string;
      filter?: any;
      group_by?: string;
    }) => Promise<{
      ok: boolean;
      collection: string;
      op: string;
      field?: string | null;
      group_by?: string | null;
      value?: number | null;
      groups?: Array<{ key: any; count: number; sum?: number | null; avg?: number | null; min?: number | null; max?: number | null }>;
    }>;
    get: (collection: string, id: string) => Promise<{ ok: boolean; data: any }>;
    create: (collection: string, data: Record<string, any>) => Promise<{ ok: boolean; data: any }>;
    update: (collection: string, id: string, data: Record<string, any>) => Promise<{ ok: boolean; data: any }>;
    delete: (collection: string, id: string) => Promise<{ ok: boolean }>;
    // Realtime subscription. The callback receives `{ type, collection, record, actor }`.
    // `record` is the RAW server shape (with nested `data` field) — apps almost always
    // want the FLAT shape; use `db.subscribe` instead of touching this directly.
    subscribe: (
      collection: string,
      callback: (event: { type: 'created' | 'updated' | 'deleted'; collection: string; record: any; actor: string | null }) => void
    ) => () => void;
    onChange: (
      collection: string,
      eventName: 'created' | 'updated' | 'deleted',
      callback: (payload: any) => void
    ) => () => void;
  };
  context: {
    blocks: () => Promise<{ ok: boolean; blocks: ContextBlock[] }>;
    search: (
      query: string,
      opts?: { limit?: number; block_ids?: string[]; blockIds?: string[] }
    ) => Promise<{ ok: boolean; results: ContextSearchResult[]; result_count: number }>;
  };
  dataSources: {
    query: (
      dataSourceKey: string,
      sql: string,
      parameters?: Record<string, any>,
      options?: { signal?: AbortSignal }
    ) => Promise<{ ok: boolean; rows: any[]; columns: string[]; row_count: number }>;
    streamQuery: (
      dataSourceKey: string,
      sql: string,
      parameters?: Record<string, any>,
      options?: { signal?: AbortSignal }
    ) => AsyncIterable<{ rows: any[]; columns: string[]; row_count: number }>;
    execute: (
      dataSourceKey: string,
      sql: string,
      parameters?: Record<string, any>,
      options?: { signal?: AbortSignal }
    ) => Promise<{ ok: boolean; rows: any[]; columns: string[]; row_count: number }>;
  };
  storage: {
    list: (params?: { limit?: number; offset?: number; file_type?: string; search?: string; folder?: string; folder_prefix?: string }) => Promise<{ ok: boolean; files: any[] }>;
    // Back-compat: upload(file, "name.pdf") still works.
    upload: (file: File, opts?: string | { name?: string; folder?: string }) => Promise<{ ok: boolean; file: any }>;
    // Only for small generated base64 strings. User-selected files should
    // go through upload/uploadLarge to avoid >10 MB JSON bodies.
    uploadBase64: (name: string, base64: string, opts?: string | { contentType?: string; folder?: string }) => Promise<{ ok: boolean; file: any }>;
    reserveUpload: (opts: { filename?: string; name?: string; contentType?: string; content_type?: string; sizeBytes?: number; size_bytes?: number; maxBytes?: number; max_bytes?: number; folder?: string }) => Promise<{ ok: boolean; file_id: string; storage_file_id: string; signed_put_url: string; max_bytes: number; expires_at: string }>;
    commitUpload: (fileId: string) => Promise<{ ok: boolean; file: any; "$file"?: any }>;
    uploadLarge: (file: File, opts?: string | { name?: string; folder?: string; contentType?: string; maxBytes?: number }) => Promise<{ ok: boolean; file: any; "$file"?: any }>;
    download: (fileId: string) => Promise<Blob>;
    getUrl: (fileId: string, expiresIn?: number) => Promise<{ ok: boolean; url: string; expires_in: number }>;
    move: (fileId: string, folder: string) => Promise<{ ok: boolean; file: any }>;
    delete: (fileId: string) => Promise<{ ok: boolean }>;
  };
  user: {
    id: string;
    name: string;
    email: string;
    me: () => Promise<{ ok: boolean; app_id: string; permissions: string[]; data_scope: 'private' | 'shared' | 'hybrid'; user: { id: string; name: string; email: string; avatar_color: string; initials: string } | null }>;
    list: () => Promise<{ ok: boolean; users: Array<{ id: string; name: string; email: string; role: string; avatar_color: string }> }>;
    // Writes the person's PLATFORM avatar color (follows them across Mogno).
    updateAvatarColor: (color: string) => Promise<{ ok: boolean; user: { id: string; avatar_color: string; initials: string } }>;
  };
  log: {
    track: (action: string, metadata?: Record<string, any>) => Promise<{ ok: boolean }>;
  };
  tool: {
    list: () => Promise<{ ok: boolean; tools: Array<{ name: string; description: string; input_schema: any; source: string }> }>;
    execute: (name: string, input?: Record<string, any>) => Promise<{ ok: boolean; result: any; error?: string }>;
  };
  // Word document (.docx) generation. Two modes:
  // 1) Template: pass `templateUrl` + `templateData` (Jinja2 placeholders) — best fidelity.
  // 2) From scratch: pass `content` blocks — simple, no template needed.
  // Auto-downloads the file in the browser unless `download: false`.
  documents: {
    exportDocx: (opts: {
      content?: Array<
        | { type: 'heading'; text: string; level?: 1 | 2 | 3 | 4 | 5 | 6 }
        | { type: 'paragraph'; text: string; bold?: boolean; italic?: boolean; underline?: boolean }
        | { type: 'table'; rows: any[][]; header?: boolean }
        | { type: 'page_break' }
      >;
      templateUrl?: string;
      templateData?: Record<string, any>;
      filename?: string;
      download?: boolean;
    }) => Promise<{ ok?: boolean; docx_base64?: string; size_bytes?: number; filename?: string; error?: string }>;
  };
  // Excel spreadsheet (.xlsx) generation. Two modes:
  // 1) Template: pass `templateUrl` + `cellWrites` to overwrite cells in a base .xlsx.
  // 2) From scratch: pass `sheets` — list of { name, rows }. Cells starting with "=" are formulas.
  spreadsheets: {
    exportXlsx: (opts: {
      sheets?: Array<{ name: string; rows: any[][] }>;
      templateUrl?: string;
      cellWrites?: Array<{ sheet: string; cell: string; value: any }>;
      filename?: string;
      download?: boolean;
    }) => Promise<{ ok?: boolean; xlsx_base64?: string; size_bytes?: number; filename?: string; error?: string }>;
  };
  ai: {
    analyzeFile: (fileOrForm: File | FormData, prompt?: string) => Promise<{ ok: boolean; analysis: string; error?: string }>;
  };
  agent: {
    chatAsync: (message: string, opts?: Record<string, any>) => Promise<{ ok: boolean; session_id: string; error?: string }>;
    getSession: (sessionId: string) => Promise<{ ok: boolean; status: string; reply?: string; extracted?: any; steps?: any[]; error?: string }>;
    list: () => Promise<{ ok: boolean; agents: Array<{ id: string; name: string; color: string; avatar_url?: string }> }>;
    /** Fire a `[agent-only]` scheduled trigger (no DAG). Fire-and-forget — no output value. */
    trigger: (triggerId: string, input?: Record<string, any>) => Promise<{ ok: boolean; trigger_id: string; session_id: string; status: string; error?: string }>;
  };
  workflow: {
    run: (triggerId: string, input?: Record<string, any>, opts?: { timeoutMs?: number }) => Promise<{
      ok: boolean;
      execution_id: string;
      status: 'success' | 'failed' | 'running';
      output?: any;
      steps?: any[];
      duration_ms?: number;
      timed_out?: boolean;
      error?: string;
    }>;
    runAsync: (triggerId: string, input?: Record<string, any>) => Promise<{ ok: boolean; execution_id: string; status: string; error?: string }>;
    getExecution: (executionId: string) => Promise<{ ok: boolean; execution_id: string; status: string; output?: any; steps?: any[] }>;
    runStreaming: (
      triggerId: string,
      input: Record<string, any>,
      onStep: (event: { type: 'step_started' | 'step_completed' | 'step_error' | 'completed'; [k: string]: any }) => void
    ) => Promise<{ execution_id: string; status: string; output?: any; steps?: any[] }>;
    listTriggers: () => Promise<{ ok: boolean; workflows: Array<{ id: string; name: string; graph_status?: string; input_contract?: any }> }>;
  };
  // Relational structures (DataPacks) granted to this App by the workspace admin.
  // The backend enforces read/write grants on every call (revocation is
  // immediate, no token reissue).
  // Schemas and grants for this App come from the App Builder agent at
  // build time (via `app_list_available_datapacks` + `app_describe_datapack_table`).
  // To introspect granted Data Models from inside the running App at runtime,
  // call `seiva.tool.execute('seiva_describe_app_datapacks')`.
  datapack: (packKey: string) => {
    table: (tableName: string) => {
      // `list` is paginated (default 50, max 500). For totals/sums use
      // `count` or `aggregate` — never `.reduce()` over the result.
      list: (params?: { limit?: number; offset?: number }) => Promise<{ ok: boolean; rows: any[]; total: number; limit: number; offset: number }>;
      // Server-side row count. Optional filter: { field, op, value }
      // where op ∈ eq|neq|gt|gte|lt|lte|in.
      count: (filter?: any) => Promise<{ ok: boolean; count: number }>;
      // Server-side aggregation over a column. `op` ∈ count|sum|avg|min|max.
      // For sum/avg/min/max, `field` must be a numeric column. Pass
      // `group_by` to get one row per distinct value.
      aggregate: (spec: {
        op: 'count' | 'sum' | 'avg' | 'min' | 'max';
        field?: string;
        filter?: any;
        group_by?: string;
      }) => Promise<{
        ok: boolean;
        op: string;
        field?: string | null;
        group_by?: string | null;
        value?: number | null;
        groups?: Array<{ key: any; count: number; value?: number | null }>;
      }>;
      get: (id: string) => Promise<{ ok: boolean; row: any }>;
      create: (data: Record<string, any>) => Promise<{ ok: boolean; row: any; errors?: any }>;
      bulkCreate: (records: Array<Record<string, any>>) => Promise<{ ok: boolean; inserted: number; rows: any[]; errors?: any }>;
      update: (id: string, data: Record<string, any>) => Promise<{ ok: boolean; row: any; errors?: any }>;
      delete: (id: string) => Promise<{ ok: boolean; errors?: any }>;
      // Realtime row events for this table. Rows the current user cannot
      // read are NEVER pushed, and the grant is re-checked live — revoking
      // it stops the stream immediately.
      //
      // The topic is keyed by TABLE, not by App, so two Apps granted on the
      // same table stay in sync with each other.
      //
      // A bulk insert arrives as ONE `bulk_created` event with a count
      // (not thousands of rows) — refetch on it.
      //
      // Returns an unsubscribe function.
      subscribe: (
        callback: (event: {
          type: 'created' | 'updated' | 'deleted' | 'bulk_created';
          pack: string;
          table: string;
          row?: any;
          count?: number;
          actor?: string | null;
        }) => void,
      ) => () => void;
    };
  };
  // Analytics structures backed by DuckLake/Parquet. Use structured
  // query({ columns, where, aggregate, group_by, order_by, limit }) for
  // app filters/dashboards; writes are versioned bulk ingests and require
  // a `can_write` grant.
  ducklake: (packKey: string) => {
    table: (tableName: string) => {
      list: (params?: { limit?: number } | DuckLakeQuery) => Promise<{ ok: boolean; rows: any[]; columns?: string[]; truncated?: boolean }>;
      query: (sqlOrQuery?: string | DuckLakeQuery, opts?: { limit?: number }) => Promise<{ ok: boolean; rows: any[]; columns?: string[]; truncated?: boolean }>;
      // Auto-chunks large arrays below the 10 MB JSON cap. For
      // mode:"replace", first chunk replaces and later chunks append.
      bulkIngest: (
        records: Array<Record<string, any>>,
        opts?: {
          partition_key?: Record<string, any>;
          partitionKey?: Record<string, any>;
          mode?: 'append' | 'replace';
          idempotency_key?: string;
          idempotencyKey?: string;
          technical_column?: string;
          technicalColumn?: string;
        }
      ) => Promise<{ ok: boolean; inserted: number; partitions: any[]; batch?: any }>;
    };
  };
  // Action registry supplied by the runtime; declarations are extracted
  // at build time for the app's permissions manifest.
  actions: {
    define: (spec: {
      name: string;
      description?: string;
      input: { safeParse: (input: unknown) => any };
      permissions?: string[];
      effects?: string[];
      approval?: { required_when: (input: any) => boolean };
      handler: (input: any, ctx: any) => any;
    }) => void;
    has: (name: string) => boolean;
    list: () => string[];
    get: (name: string) => { name: string; description: string; permissions: string[]; effects: string[]; approval_required: boolean } | null;
    invoke: (name: string, input: unknown) => Promise<{ ok: boolean; result?: any; error?: string; message?: string; details?: any[] }>;
  };
  // Declarative page manifest. Each `define()` call at module level adds
  // a row to `app_pages` at build time (see code_builder/extractManifests).
  // The Permissions tab reads from that table to render the page whitelist
  // UI; the app itself uses `auth.canAccessPage()` to gate navigation.
  pages: {
    define: (spec: { path: string; name: string; description?: string }) => void;
    has: (path: string) => boolean;
    list: () => string[];
    get: (path: string) => { path: string; name: string; description: string | null } | null;
  };
  // Sync permission checks for the current user. Returns true permissively
  // in PR2 (the underlying cache is hydrated by PR3's extended /me). Call
  // sites should treat these as "should I show this UI?" — server still
  // enforces the same rules on every mutation, so a stale `true` is safe.
  auth: {
    canAccessPage: (path: string) => boolean;
    canDoAction: (name: string) => boolean;
    canWriteData: () => boolean;
    canDeleteData: () => boolean;
    canManageApp: () => boolean;
    subscribe: (fn: () => void) => () => void;

    // Dedicated login — this App draws its own sign-in screen and Mogno
    // checks the code. Style it however you want; only the check is ours.
    //
    //   if (seiva.auth.requiresLogin() && !seiva.auth.isSignedIn()) {
    //     return <YourOwnSignInScreen />;
    //   }
    //
    // Outside a dedicated-login App `requiresLogin()` is false and
    // `isSignedIn()` is true, so the same gate is a no-op when the App is
    // opened from the workspace.
    requiresLogin: () => boolean;
    isSignedIn: () => boolean;
    // Emails a 6-digit code. Resolves the SAME way whether or not the
    // address can open the App — the server refuses to say, so show one
    // "check your email" state either way.
    requestCode: (email: string) => Promise<{ ok: boolean }>;
    // On success the page reloads (the session is an HttpOnly cookie).
    // On failure it throws `{ error, message }` — render `message`.
    verifyCode: (email: string, code: string) => Promise<{ ok: boolean }>;
    signOut: () => Promise<void>;
  };
};

// Shape a server record (as returned by /api/v1/apps/data/*) into the flat object apps
// work with. Spreads `data` onto the top level and surfaces id, timestamps, and the
// row-level ACL fields (`_created_by`, `_allowed_user_ids`).
function __shapeRecord(r: any): any {
  if (!r) return r;
  return {
    id: r.id,
    ...r.data,
    _created_at: r.created_at,
    _updated_at: r.updated_at,
    _created_by: r._created_by ?? null,
    _allowed_user_ids: r._allowed_user_ids || [],
  };
}

export const db = {
  async list<T = any>(collection: string, params?: Record<string, any>): Promise<T[]> {
    const res = await seiva.data.list(collection, params);
    return (res.data || []).map((r: any) => __shapeRecord(r)) as T[];
  },

  async get<T = any>(collection: string, id: string): Promise<T | null> {
    try {
      const res = await seiva.data.get(collection, id);
      return res.data ? (__shapeRecord(res.data) as T) : null;
    } catch {
      return null;
    }
  },

  async create<T = any>(collection: string, data: Partial<T>): Promise<T> {
    const res = await seiva.data.create(collection, data as Record<string, any>);
    return __shapeRecord(res.data) as T;
  },

  async update<T = any>(collection: string, id: string, data: Partial<T>): Promise<T> {
    const res = await seiva.data.update(collection, id, data as Record<string, any>);
    return __shapeRecord(res.data) as T;
  },

  async remove(collection: string, id: string): Promise<void> {
    await seiva.data.delete(collection, id);
  },

  /**
   * Subscribe to realtime changes on a collection. Callback receives the
   * FLAT-shaped record (same layout as `db.list` / `db.get`), so what you
   * get in the subscription is identical to what you store in your state.
   *
   *   const unsub = db.subscribe<Conta>('contas', (event) => {
   *     // event.type ∈ 'created' | 'updated' | 'deleted'
   *     // event.record is the flat record (or `{id}` on 'deleted')
   *   });
   *   // call unsub() when leaving the page
   *
   * Server filters by row-level ACL — records the current user cannot
   * read are never pushed. Use this when you need fine control; for the
   * common case of "list page that auto-refreshes" use `useCollection`,
   * which wires this up for you.
   */
  subscribe<T = any>(
    collection: string,
    callback: (event: {
      type: 'created' | 'updated' | 'deleted';
      collection: string;
      record: T;
      actor: string | null;
    }) => void
  ): () => void {
    return seiva.data.subscribe(collection, (raw) => {
      const shaped: any =
        raw.type === 'deleted'
          ? raw.record // already `{id}`
          : __shapeRecord(raw.record);

      callback({
        type: raw.type,
        collection: raw.collection,
        record: shaped as T,
        actor: raw.actor,
      });
    });
  },
};

/**
 * Row-level access control helpers.
 *
 * Every record carries a `_created_by` (user id of the creator, or null for legacy/system
 * records) and `_allowed_user_ids` (empty = visible to everyone with app access).
 *
 * The platform ALREADY filters list/get/update/delete server-side — apps do not need to
 * re-filter in the client. Use these helpers only to render sharing UI (e.g. an edit button
 * that hides itself for non-owners) and to update the ACL.
 */
export const acl = {
  canEdit(row: any, userId?: string): boolean {
    if (!row) return false;
    if (!row._created_by) return true; // system/legacy records are editable by anyone
    const uid = userId ?? (seiva as any).user?.id;
    return !!uid && row._created_by === uid;
  },

  isPublic(row: any): boolean {
    return !row?._allowed_user_ids || row._allowed_user_ids.length === 0;
  },

  /** Update the allowed-user list for a record. Pass an empty array to make it public. */
  share(collection: string, id: string, userIds: string[]) {
    return db.update(collection, id, { _allowed_user_ids: userIds } as any);
  },
};

export const context = {
  async blocks(): Promise<ContextBlock[]> {
    const res = await seiva.context.blocks();
    return res.blocks || [];
  },

  async search(
    query: string,
    opts?: { limit?: number; block_ids?: string[]; blockIds?: string[] }
  ): Promise<{ results: ContextSearchResult[]; result_count: number }> {
    const res = await seiva.context.search(query, opts || {});
    return {
      results: res.results || [],
      result_count: res.result_count ?? (res.results || []).length,
    };
  },
};

/**
 * DataSources — SELECT/INSERT/UPDATE/DELETE against a partner database
 * registered on the workspace (see the DataSources panel in the platform).
 * The app never sees a URL or credential: `dataSourceKey` is the only
 * thing identifying which database to talk to, and it must already be
 * granted to this app.
 *
 *   const result = await executeDataSourceQuery("warehouse", "SELECT * FROM orders WHERE status = $1", { "1": "open" });
 *   console.log(result.rows, result.columns);
 *
 *   const updated = await executeDataSourceCommand("warehouse", "INSERT INTO orders (customer) VALUES ($1) RETURNING id", { "1": "acme" });
 *   console.log(updated.rows[0].id); // present when the SQL has RETURNING; otherwise rows is []
 *
 *   // Large result: Arrow RecordBatches are decoded incrementally in the browser.
 *   const controller = new AbortController();
 *   for await (const batch of streamDataSourceQuery("warehouse", "SELECT id, total FROM orders", {}, { signal: controller.signal })) {
 *     consumeRows(batch.rows);
 *   }
 *   // controller.abort() cancels the HTTP stream and propagates upstream.
 *
 *   // Pagination: inline LIMIT/OFFSET as literal integers (the app owns
 *   // them), NOT as parameters — matches the platform's "Test query" panel.
 *   // Fetch pageSize + 1 rows so a full page means "there is a next page".
 *   const pageSize = 10, offset = 0;
 *   const page = await executeDataSourceQuery(
 *     "warehouse",
 *     `SELECT * FROM orders ORDER BY id LIMIT ${pageSize + 1} OFFSET ${offset}`
 *   );
 *   const hasMore = page.rows.length > pageSize;
 *
 * `executeDataSourceCommand` requires write access to be granted for this
 * DataSource; `executeDataSourceQuery` is read-only. `parameters` and
 * placeholder syntax (`$1`, `?`, named, ...) depend on the DataSource's
 * underlying engine (Postgres, MySQL, etc). Use parameters for values that
 * need safe binding (filters, user input); inline LIMIT/OFFSET for pagination.
 */
export type DataSourceQueryResult<T = any> = {
  rows: T[];
  columns: string[];
  rowCount: number;
};

export type DataSourceRecordBatch<T = any> = DataSourceQueryResult<T>;
export type DataSourceRequestOptions = { signal?: AbortSignal };

export async function executeDataSourceQuery<T = any>(
  dataSourceKey: string,
  sql: string,
  parameters?: Record<string, any>,
  options?: DataSourceRequestOptions
): Promise<DataSourceQueryResult<T>> {
  const res = await seiva.dataSources.query(dataSourceKey, sql, parameters || {}, options || {});
  return { rows: res.rows || [], columns: res.columns || [], rowCount: res.row_count ?? 0 };
}

export async function* streamDataSourceQuery<T = any>(
  dataSourceKey: string,
  sql: string,
  parameters?: Record<string, any>,
  options?: DataSourceRequestOptions
): AsyncIterable<DataSourceRecordBatch<T>> {
  for await (const batch of seiva.dataSources.streamQuery(dataSourceKey, sql, parameters || {}, options || {})) {
    yield { rows: batch.rows || [], columns: batch.columns || [], rowCount: batch.row_count ?? 0 };
  }
}

export async function executeDataSourceCommand<T = any>(
  dataSourceKey: string,
  sql: string,
  parameters?: Record<string, any>,
  options?: DataSourceRequestOptions
): Promise<DataSourceQueryResult<T>> {
  const res = await seiva.dataSources.execute(dataSourceKey, sql, parameters || {}, options || {});
  return { rows: res.rows || [], columns: res.columns || [], rowCount: res.row_count ?? 0 };
}

export const storage = {
  async list(params?: { limit?: number; offset?: number; file_type?: string; search?: string; folder?: string; folder_prefix?: string }): Promise<any[]> {
    const res = await seiva.storage.list(params);
    return res.files || [];
  },

  // Back-compat: upload(file, "name.pdf") still works.
  async upload(file: File, opts?: string | { name?: string; folder?: string }): Promise<any> {
    const res = await seiva.storage.upload(file, opts as any);
    return res.file;
  },

  // Only for small generated base64 strings. For user-selected files,
  // pass the File to upload/uploadLarge; never FileReader.readAsDataURL.
  async uploadBase64(name: string, base64: string, opts?: string | { contentType?: string; folder?: string }): Promise<any> {
    const res = await seiva.storage.uploadBase64(name, base64, opts as any);
    return res.file;
  },

  async reserveUpload(opts: { filename?: string; name?: string; contentType?: string; content_type?: string; sizeBytes?: number; size_bytes?: number; maxBytes?: number; max_bytes?: number; folder?: string }): Promise<any> {
    return seiva.storage.reserveUpload(opts);
  },

  async commitUpload(fileId: string): Promise<any> {
    const res = await seiva.storage.commitUpload(fileId);
    return res["$file"] ? { "$file": res["$file"] } : (res.file || res);
  },

  async uploadLarge(file: File, opts?: string | { name?: string; folder?: string; contentType?: string; maxBytes?: number }): Promise<any> {
    const res = await seiva.storage.uploadLarge(file, opts as any);
    return res["$file"] ? { "$file": res["$file"] } : (res.file || res);
  },

  async download(fileId: string): Promise<Blob> {
    return seiva.storage.download(fileId);
  },

  /**
   * Signed URL (GCS) to embed a stored file directly — e.g. `<iframe src={url}>`
   * for a PDF/image preview, or `<img src={url}>`. Unlike `download()`, this
   * does NOT go through fetch/Blob, so it also works for large files without
   * loading them into memory first. `storage.googleapis.com` is allowed in the
   * app's `frame-src`/`img-src` CSP. Expires after `expiresIn` seconds (default
   * 3600, max 86400) — call again if the preview stays open longer than that.
   */
  async getUrl(fileId: string, expiresIn?: number): Promise<{ ok: boolean; url: string; expires_in: number }> {
    return seiva.storage.getUrl(fileId, expiresIn);
  },

  /**
   * Fetches a stored file (authenticated) and triggers a browser download.
   * Use this for file outputs returned by a tool: a Python tool that returns
   * a "$file_output" envelope is materialized into storage, and tool.run gives
   * you back { "$file": { storage_file_id, filename, ... } }. Pass those here:
   *   const out = await tool.run("make_report", { ... });
   *   const f = out?.["$file"];
   *   if (f) await storage.triggerDownload(f.storage_file_id, f.filename);
   */
  async triggerDownload(fileId: string, filename?: string): Promise<void> {
    const blob = await seiva.storage.download(fileId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    if (filename) a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  async move(fileId: string, folder: string): Promise<any> {
    const res = await seiva.storage.move(fileId, folder);
    return res.file;
  },
};

// Collects every "$file" envelope from a tool result (single "$file",
// a "$files" list, or nested). Used by tool.runAndDownload.
function collectFileEnvelopes(value: any): Array<{ storage_file_id: string; filename?: string }> {
  const out: Array<{ storage_file_id: string; filename?: string }> = [];
  const walk = (v: any) => {
    if (!v || typeof v !== 'object') return;
    if (v['$file'] && typeof v['$file'] === 'object' && v['$file'].storage_file_id) {
      out.push(v['$file']);
    }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    Object.values(v).forEach(walk);
  };
  walk(value);
  return out;
}

export const ai = {
  /** Sends a message to the agent and waits for the full reply (client-side polling). */
  async ask(message: string, agentName?: string): Promise<string> {
    const opts: any = {};
    if (agentName) opts.agent_name = agentName;
    // Start async — returns immediately with session_id (no server-side blocking)
    const start = await seiva.agent.chatAsync(message, opts);
    if (!start.ok) throw new Error(start.error || 'Agent call failed');
    const sid = start.session_id;
    // Poll until complete or error (max 5 min)
    const deadline = Date.now() + 300_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 1500));
      const poll = await seiva.agent.getSession(sid);
      if (poll.status === 'complete') return poll.reply || '';
      if (poll.status === 'error') throw new Error('Agent execution failed');
    }
    throw new Error('Agent timed out (5 min)');
  },

  /** Starts the agent and returns the session_id immediately (non-blocking). */
  async askAsync(message: string, agentName?: string): Promise<string> {
    const opts: any = {};
    if (agentName) opts.agent_name = agentName;
    const res = await seiva.agent.chatAsync(message, opts);
    if (!res.ok) throw new Error(res.error || 'Agent call failed');
    return res.session_id;
  },

  async poll(sessionId: string): Promise<{ status: string; reply?: string }> {
    const res = await seiva.agent.getSession(sessionId);
    return { status: res.status, reply: res.reply };
  },

  async list(): Promise<Array<{ id: string; name: string; color: string }>> {
    const res = await seiva.agent.list();
    return res.agents || [];
  },

  /**
   * Analyze a file once with the LLM. The file is NOT persisted.
   * Use this when the user wants a one-shot read ("extract totals from this invoice",
   * "summarize this PDF"). The returned string is the LLM's analysis.
   *
   * For files the user should be able to download later, use `storage.upload` instead
   * and attach the returned file id to a record so the app can show a download link.
   */
  async analyzeFile(file: File, prompt?: string): Promise<string> {
    const res = await (seiva as any).ai.analyzeFile(file, prompt);
    if (!res.ok) throw new Error(res.error || 'File analysis failed');
    return res.analysis;
  },

  /**
   * Run a configured agent with optional skills injected and wait for the final reply.
   * Optionally extract structured JSON from the reply by providing outputSchema.
   *
   * Sync (default): blocks up to 120s. Returns { reply, extracted }.
   * Async: pass { async: true } to get back only { sessionId } — poll via ai.poll(sessionId)
   *        to retrieve reply + extracted when complete. Use async for agents that may
   *        request human approval (sync fails fast in that case).
   */
  async runWithSkill(opts: {
    agent: string;
    skills?: string[];
    prompt: string;
    context?: Record<string, any> | string;
    outputSchema?: Record<string, any>;
    extractionModel?: string;
    async?: boolean;
  }): Promise<{ reply?: string; extracted?: any; sessionId?: string; agent?: any; skillsUsed?: any[] }> {
    const payload: Record<string, any> = {
      agent: opts.agent,
      prompt: opts.prompt,
    };
    if (opts.skills && opts.skills.length) payload.skills = opts.skills;
    if (opts.context !== undefined) payload.context = opts.context;
    if (opts.outputSchema) payload.output_schema = opts.outputSchema;
    if (opts.extractionModel) payload.extraction_model = opts.extractionModel;
    if (opts.async) payload.async = true;

    const res = await (seiva as any).agent.runWithSkill(payload);
    if (!res.ok) throw new Error(res.error || 'Agent call failed');

    if (opts.async) {
      return { sessionId: res.result?.session_id };
    }

    return {
      reply: res.result?.reply,
      extracted: res.result?.extracted,
      agent: res.result?.agent,
      skillsUsed: res.result?.skills_used || [],
    };
  },
};

function currentRuntimeUser(): { id: string; name: string; email: string } | null {
  const u = (seiva as any).user;
  if (!u?.id) return null;
  return { id: u.id, name: u.name || '', email: u.email || '' };
}

export const users = {
  /** Returns the current logged-in user's info (id, name, email). Available without API call. */
  currentUser(): { id: string; name: string; email: string } | null {
    return currentRuntimeUser();
  },

  /**
   * Compatibility helper for older generated apps. Returns app metadata from
   * `seiva.user.me()` plus the injected runtime user fields when available.
   * For just the current user's identity, prefer `users.currentUser()`.
   */
  async me(): Promise<{
    ok: boolean;
    app_id: string;
    permissions: string[];
    data_scope: 'private' | 'shared' | 'hybrid';
    user_permissions?: any;
    id?: string;
    name?: string;
    email?: string;
  }> {
    const meta = await seiva.user.me();
    return { ...(currentRuntimeUser() || {}), ...(meta as any) };
  },

  /** Returns just the current user's email. */
  currentEmail(): string {
    return (seiva as any).user?.email || '';
  },

  /** Returns just the current user's name. */
  currentName(): string {
    return (seiva as any).user?.name || '';
  },

  /** Fetches the full list of workspace users (requires API call). */
  async list(): Promise<Array<{ id: string; name: string; email: string; role: string; avatar_color: string }>> {
    const res = await seiva.user.list();
    return (res as any).users || [];
  },
};

export const log = {
  /** Track a custom event for audit/analytics purposes. */
  async track(action: string, metadata?: Record<string, any>): Promise<void> {
    await seiva.log.track(action, metadata);
  },
};

export const tool = {
  /** List all available tools for this app. */
  async list(): Promise<Array<{ name: string; description: string; input_schema: any; source: string }>> {
    const res = await seiva.tool.list();
    return res.tools || [];
  },

  /**
   * Execute any workspace tool by name. Returns the tool's result.
   *
   * File inputs: pass a browser `File`/`Blob` directly under the tool's
   * file-param name — the SDK auto-uploads it (signed PUT) and sends a
   * `$file` reference, exactly like Tool Test Mode. No base64, no manual
   * upload:
   *   await tool.run("parse_xlsx", { spreadsheet: fileFromInput })
   */
  async run(name: string, input?: Record<string, any>): Promise<any> {
    const res = await seiva.tool.execute(name, input || {});
    if (!res.ok) throw new Error(res.error || 'Tool execution failed');
    return res.result;
  },

  /**
   * Runs a tool and, if its result contains any "$file" output(s), triggers
   * a browser download for each. Returns the full result so you can also read
   * other fields. Wire a button to this when a tool produces a downloadable
   * file (PDF/png/csv/xlsx/txt):
   *   <button onClick={() => tool.runAndDownload("make_report", { period })}>
   */
  async runAndDownload(name: string, input?: Record<string, any>): Promise<any> {
    const result = await tool.run(name, input);
    for (const f of collectFileEnvelopes(result)) {
      await storage.triggerDownload(f.storage_file_id, f.filename);
    }
    return result;
  },

  /** Convenience: make an HTTP request. */
  async httpRequest(url: string, opts?: { method?: string; headers?: Record<string, string>; body?: string; timeout_ms?: number }): Promise<any> {
    return tool.run('http_request', { url, ...opts });
  },

  /** Convenience: execute code in a sandbox (JS/Python/Go). */
  async executeCode(code: string, opts?: { language?: 'javascript' | 'python' | 'go'; input?: any; timeout_ms?: number }): Promise<any> {
    return tool.run('execute_code', { code, ...opts });
  },

  /** Convenience: call an LLM for summarization, classification, extraction, etc. */
  async callLLM(prompt: string, opts?: { system_prompt?: string; model?: string; max_tokens?: number; temperature?: number }): Promise<any> {
    return tool.run('call_llm', { prompt, ...opts });
  },

  /** Convenience: get current date/time. */
  async now(timezone?: string): Promise<any> {
    return tool.run('get_current_datetime', timezone ? { timezone } : {});
  },
};

/**
 * DEPRECATED — legacy App Functions alias.
 *
 * The per-app `functions/*.py` flow was retired. Server-side logic
 * now lives in workspace **Edge Functions** (Tools with handler type
 * "function", managed under /functions and granted to the app) and is
 * invoked via `tool.run(name, input)` — use that for all new code.
 *
 * `fn.run` remains only so previously-published bundles keep working:
 * it POSTs the permanent compat route `/api/v1/apps/fn/<name>`, which
 * resolves the migrated Edge Function server-side.
 */
export const fn = {
  /** @deprecated Use `tool.run(name, input)` with a granted Edge Function. */
  async run(name: string, input?: Record<string, any>): Promise<any> {
    if (!(fn as any).__deprecation_warned) {
      (fn as any).__deprecation_warned = true;
      console.warn("[seiva] seiva.fn is deprecated — use seiva.tool.run(name, input)");
    }
    const res = await (seiva as any).fn.run(name, input || {});
    if (res && res.ok === false) {
      throw new Error(res.error || "Function execution failed");
    }
    return res && Object.prototype.hasOwnProperty.call(res, "result") ? res.result : res;
  },
};

/**
 * Workflow (DAG) invocation. Use this to run a multi-step workflow that the
 * user has built in the Schedules editor.
 *
 * `workflow.run` is the right default for "user clicks button → see result":
 * it blocks up to 120s and returns the final output. For long pipelines,
 * use `workflow.runAsync` (poll later) or `workflow.runStreaming`
 * (live step events).
 */
export const workflow = {
  /**
   * Run a workflow synchronously. Returns the final output when the DAG
   * completes (≤120s). Throws on failure. If the run exceeds the timeout,
   * the response is `{ status: 'running', timed_out: true, execution_id }`
   * — use `workflow.getExecution(execution_id)` to keep polling.
   *
   * File inputs: pass a browser `File`/`Blob` directly under the workflow's
   * input field name — the SDK auto-uploads it (signed PUT) and sends a
   * `$file` reference, exactly like Workflow Test Mode:
   *   await workflow.run(triggerId, { planilha: fileFromInput })
   */
  async run(triggerId: string, input?: Record<string, any>, opts?: { timeoutMs?: number }): Promise<{
    execution_id: string;
    status: 'success' | 'running';
    output?: any;
    steps?: any[];
    duration_ms?: number;
    timed_out?: boolean;
  }> {
    const res = await seiva.workflow.run(triggerId, input || {}, opts || {});
    if (res.ok === false || res.status === 'failed') {
      throw new Error(res.error || 'Workflow failed');
    }
    return res as any;
  },

  /**
   * Fire-and-forget. Returns `{ executionId }` immediately so the UI can
   * keep going. Poll with `workflow.getExecution(executionId)` when the
   * user opens a status panel.
   */
  async runAsync(triggerId: string, input?: Record<string, any>): Promise<{ executionId: string }> {
    const res = await seiva.workflow.runAsync(triggerId, input || {});
    if (!res.execution_id) throw new Error(res.error || 'Workflow enqueue failed');
    return { executionId: res.execution_id };
  },

  /** Poll an execution started via `runAsync`. */
  async getExecution(executionId: string): Promise<{
    execution_id: string;
    status: string;
    output?: any;
    steps?: any[];
  }> {
    return seiva.workflow.getExecution(executionId);
  },

  /**
   * Run the workflow and receive live step events via `onStep`.
   * Use for long-running workflows where the UI shows progress
   * (each node's start/finish/error). Resolves once the DAG completes.
   */
  async runStreaming(
    triggerId: string,
    input: Record<string, any> | undefined,
    onStep: (event: { type: 'step_started' | 'step_completed' | 'step_error' | 'completed'; [k: string]: any }) => void
  ): Promise<{ execution_id: string; status: string; output?: any; steps?: any[] }> {
    return seiva.workflow.runStreaming(triggerId, input || {}, onStep);
  },
};

/** Domain actions use the runtime registry, including input validation. */
export const actions = seiva.actions;

/** One editable/readonly leaf of a review section. */
export type ApprovalReviewField = {
  key: string;
  path: (string | number)[];
  label: string;
  kind: string;
  value: any;
  editable: boolean;
  required: boolean;
  options: { value: any; label: string }[];
};

/** The platform-built review of an approval — never the raw payload. */
export type ApprovalReview = {
  kind: string;
  headline: string;
  summary?: string | null;
  why?: string | null;
  editable: boolean;
  sections: (
    | { type: 'fields'; title?: string | null; fields: ApprovalReviewField[] }
    | { type: 'kv'; title?: string | null; items: { label: string; value: any; long?: boolean }[] }
    | { type: string; [k: string]: any }
  )[];
  actions: { approve: string; reject: string; changes: boolean };
  meta: { expires_at?: string | null; revision: string; edited?: boolean; [k: string]: any };
};

export type AppApproval = {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | string;
  action_name: string | null;
  session_id: string | null;
  revision: string;
  requested_at?: string | null;
  responded_at?: string | null;
  expires_at?: string | null;
  execution_status?: string | null;
  review: ApprovalReview | null;
};

export type ApprovalDecision = {
  decision: 'approve' | 'reject';
  /** Only the Action input can change: `{ fields: { [field.key]: value } }`. */
  edits?: { fields?: Record<string, any> };
  note?: string;
  /** The `revision` of the card you rendered — the decision is refused (409) if it changed. */
  expectedRevision?: string;
};

/**
 * Approvals raised by THIS App's agent — an Action declared with
 * `approval` waits for a person. The conversation with the agent and
 * the review card both live in the PLATFORM's agent surface (the agent
 * button on the App's topbar); an App never builds a chat of its own,
 * and it does not need this API to be operated.
 *
 * Use it only when the App wants its OWN list of what is waiting on
 * this person — a queue screen or a badge — rendered with
 * `<ApprovalCard/>` or your own UI. The card IS the authorization:
 * what the person approved (including edits to `input.*`) is exactly
 * what runs. Requires a signed-in person.
 */
export const approvals = {
  async pending(): Promise<AppApproval[]> {
    const res = await (seiva as any).approvals.pending();
    if (res && res.ok === false) throw new Error(res.error || 'Could not list approvals');
    return (res && res.approvals) || [];
  },
  async review(id: string): Promise<AppApproval> {
    const res = await (seiva as any).approvals.review(id);
    if (!res || res.ok === false || !res.approval) throw new Error((res && res.error) || 'Approval not found');
    return res.approval as AppApproval;
  },
  async decide(id: string, opts: ApprovalDecision): Promise<AppApproval> {
    const res = await (seiva as any).approvals.decide(id, opts);
    if (!res || res.ok === false) {
      const err: any = new Error((res && res.error) || 'Decision refused');
      err.code = res && res.code;
      err.errors = res && res.errors;
      err.approval = res && res.approval;
      throw err;
    }
    return res.approval as AppApproval;
  },
  /** Subscribe to cards raised for this person; returns the unsubscribe. */
  onRequested(cb: (card: AppApproval) => void): () => void {
    return (seiva as any).approvals.onRequested(cb);
  },
  onResolved(cb: (event: { id: string; action_name?: string; status: string }) => void): () => void {
    return (seiva as any).approvals.onResolved(cb);
  },
};

/**
 * Self-description for the App's agent. `registerSnapshot` returns a
 * small object with what the user is looking at (current page, filters,
 * selection, period) — the agent asks for it before acting on "this
 * screen". `registerDescribe` returns a short prose description of the
 * App's current state (e.g. "Fechamento de setembro: 3 empresas sem
 * partição publicada"). Register at MODULE level or inside the root
 * component; keep the snapshot under a few KB and never put secrets or
 * other users' data in it.
 */
export const app = {
  registerSnapshot(fn: () => Record<string, any>): void {
    return seiva.app.registerSnapshot(fn);
  },
  registerDescribe(fn: () => string): void {
    return seiva.app.registerDescribe(fn);
  },
  snapshot(): Record<string, any> {
    return seiva.app.snapshot();
  },
  describe(): string {
    return seiva.app.describe();
  },
};

/**
 * Declarative page manifest. Call once per page at MODULE level (not inside
 * a hook or component) so the introspector running in `code_builder` can
 * harvest the spec without executing your render code. The manifest is
 * persisted in `app_pages` and surfaced in the Permissions tab — workspace
 * admins choose which pages a given user can navigate to via the
 * whitelist UI.
 *
 * @example
 *   pages.define({ path: '/', name: 'Home' });
 *   pages.define({ path: '/reports', name: 'Reports', description: 'Numbers' });
 */
export const pages = {
  define(spec: { path: string; name: string; description?: string }): void {
    return seiva.pages.define(spec);
  },
  has(path: string): boolean {
    return seiva.pages.has(path);
  },
  list(): string[] {
    return seiva.pages.list();
  },
  get(path: string): { path: string; name: string; description: string | null } | null {
    return seiva.pages.get(path);
  },
};

/**
 * Component catalog publication — for the ONE App that serves as the
 * platform's component catalog. No ordinary app calls this.
 *
 * The catalog app calls `kit.publish(COMPONENTS)` at module level; the
 * build harvests it (same introspection pass as `pages.define()`) and the
 * platform serves it to the App Builder agent through the
 * `app_import_component` tool. Calling it is inert at runtime.
 *
 * It has to be a CALL, not an export: the bundle is emitted as an IIFE,
 * which exports nothing — a host-installed global the app invokes is the
 * only surface build-time introspection can see.
 */
export const kit = {
  publish(components: unknown[]): void {
    return seiva.kit.publish(components);
  },
  published(): number {
    return seiva.kit.published();
  },
};

/**
 * Sync permission checks for the current user — safe to call from inside
 * a render (they read from a permissive cache hydrated at boot). Use to
 * decide whether to render a button, link, or page; the server still
 * enforces the same rules on every mutation, so a stale `true` cannot
 * grant access by accident.
 *
 * @example
 *   {auth.canDoAction('send_email') && <button onClick={send}>Send</button>}
 *   {auth.canAccessPage('/reports') ? <Reports /> : <Forbidden />}
 */
export const auth = {
  canAccessPage(path: string): boolean {
    return seiva.auth.canAccessPage(path);
  },
  canDoAction(name: string): boolean {
    return seiva.auth.canDoAction(name);
  },
  canWriteData(): boolean {
    return seiva.auth.canWriteData();
  },
  canDeleteData(): boolean {
    return seiva.auth.canDeleteData();
  },
  canManageApp(): boolean {
    return seiva.auth.canManageApp();
  },
  /**
   * Dedicated login (Apps served at /l/<public_slug>). Outside a
   * dedicated-login App `requiresLogin()` is false and `isSignedIn()` is
   * true, so a sign-in gate keeps working unchanged in the workspace.
   */
  requiresLogin(): boolean {
    return seiva.auth.requiresLogin();
  },
  isSignedIn(): boolean {
    return seiva.auth.isSignedIn();
  },
  requestCode(email: string): Promise<{ ok: boolean }> {
    return seiva.auth.requestCode(email);
  },
  verifyCode(email: string, code: string): Promise<{ ok: boolean }> {
    return seiva.auth.verifyCode(email, code);
  },
  signOut(): Promise<void> {
    return seiva.auth.signOut();
  },
  /**
   * Re-render when permissions change WHILE the app is open (an admin
   * revokes a page mid-session). The first paint is already correct — the
   * resolved map ships inline with the HTML — so this is not needed just to
   * render a menu.
   *
   * @example
   *   const [, force] = useReducer((n) => n + 1, 0);
   *   useEffect(() => auth.subscribe(force), []);
   */
  subscribe(fn: () => void): () => void {
    return seiva.auth.subscribe(fn);
  },
};
