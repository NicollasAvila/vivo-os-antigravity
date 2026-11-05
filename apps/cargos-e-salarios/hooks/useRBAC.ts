// ============================================================================
// useRBAC — carrega colaboradores DIRETO do Google Sheets via get_dados_drive
//
// Planilha fixa: 17MdQs2plUl8TM5H_lji8ENNrt2veTzOqgSUJoMMQ0Nw
//
// Fluxo:
//   1. get_dados_drive com spreadsheet_id fixo → retorna índice de abas
//   2. Lê aba "Colaboradores v2" como fonte principal
//   3. Enriquece com "Cadastro VIVO" (email_telefonica, matricula_sap)
//   4. Enriquece com "ALTERAÇÕES SALARIAIS" (histórico salarial)
// ============================================================================
import { useState, useEffect } from 'react';
import { tool } from '../lib/seiva';
import { Colaborador } from '../services/rbac';

// Cache em memória — evita re-fetchar toda vez que o componente remonta
let cache: { data: Colaborador[]; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/** Limpa o cache — chamado quando queremos forçar re-fetch */
export function invalidateRBACCache() {
  cache = null;
  console.log('[useRBAC] Cache invalidado');
}

/** Normaliza chave de coluna: minúsculas, sem acento, espaços simples */
function normKey(k: string): string {
  return String(k)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\n\r\t/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Converte linha (array ou objeto) em objeto usando os cabeçalhos */
function rowToObj(row: any, columns: string[]): Record<string, any> {
  if (Array.isArray(row)) {
    const obj: Record<string, any> = {};
    columns.forEach((col, i) => {
      if (col) obj[col] = row[i] ?? '';
    });
    return obj;
  }
  return typeof row === 'object' && row !== null ? { ...row } : {};
}

/** Obtém valor de um objeto pelo nome de coluna normalizado */
function getVal(obj: Record<string, any>, ...candidates: string[]): string {
  for (const c of candidates) {
    const nc = normKey(c);
    // Busca exata primeiro
    if (obj[c] !== undefined && obj[c] !== null && String(obj[c]).trim()) {
      return String(obj[c]).trim();
    }
    // Busca normalizada
    for (const [k, v] of Object.entries(obj)) {
      if (normKey(k) === nc && v !== null && v !== undefined && String(v).trim()) {
        return String(v).trim();
      }
    }
  }
  return '';
}

/**
 * Extrai dados de uma aba a partir de qualquer formato de resposta da tool.
 * A tool pode retornar:
 *   - { sheets: [{ sheet, columns, rows, row_count }] }   ← múltiplas abas
 *   - { sheet, columns, rows, row_count }                 ← aba única
 *   - { success, total_sheets, sheets: [...] }            ← formato índice
 */
function extractSheet(raw: any, abaNome: string): { columns: string[]; rows: any[] } | null {
  if (!raw) return null;

  // Caso 1: tem array sheets[]
  if (Array.isArray(raw.sheets) && raw.sheets.length > 0) {
    const found = raw.sheets.find((s: any) =>
      s.sheet?.toLowerCase() === abaNome.toLowerCase()
    );
    const sheet = found ?? raw.sheets[0];
    if (sheet && Array.isArray(sheet.rows) && sheet.rows.length > 0) {
      return { columns: sheet.columns ?? sheet.headers ?? [], rows: sheet.rows };
    }
    return null;
  }

  // Caso 2: a própria resposta é uma aba única (sheet, columns, rows)
  if (Array.isArray(raw.rows) && raw.rows.length > 0) {
    return { columns: raw.columns ?? raw.headers ?? [], rows: raw.rows };
  }

  // Caso 3: sheet_data (formato da Edge Function)
  if (raw.sheet_data && raw.sheet_data[abaNome]) {
    const sd = raw.sheet_data[abaNome];
    return { columns: sd.headers ?? [], rows: sd.rows ?? [] };
  }

  return null;
}

/** Lê uma aba específica — tenta com e sem spreadsheet_id */
async function lerAba(abaNome: string, spreadsheetId?: string): Promise<{ columns: string[]; rows: any[] } | null> {
  const params: Record<string, any> = { sheet_name: abaNome };
  if (spreadsheetId) params.spreadsheet_id = spreadsheetId;

  try {
    console.log(`[useRBAC] Lendo aba "${abaNome}"...`);
    const resp = await tool.run('get_dados_drive', params);
    const d = resp?.result ?? resp;
    console.log(`[useRBAC] Resposta "${abaNome}":`, JSON.stringify({
      success: d?.success,
      keys: Object.keys(d ?? {}),
      sheets_len: Array.isArray(d?.sheets) ? d.sheets.map((s: any) => `${s.sheet}(${Array.isArray(s.rows) ? s.rows.length : s.row_count})`) : 'n/a',
      rows_direto: Array.isArray(d?.rows) ? d.rows.length : 'n/a',
    }));

    const sheet = extractSheet(d, abaNome);
    if (sheet) {
      console.log(`[useRBAC] ✓ "${abaNome}": ${sheet.rows.length} linhas, ${sheet.columns.length} colunas`);
      return sheet;
    }

    // Segunda tentativa sem spreadsheet_id
    if (spreadsheetId) {
      console.log(`[useRBAC] Tentando "${abaNome}" sem spreadsheet_id...`);
      const resp2 = await tool.run('get_dados_drive', { sheet_name: abaNome });
      const d2 = resp2?.result ?? resp2;
      const sheet2 = extractSheet(d2, abaNome);
      if (sheet2) {
        console.log(`[useRBAC] ✓ "${abaNome}" (sem id): ${sheet2.rows.length} linhas`);
        return sheet2;
      }
    }

    console.warn(`[useRBAC] ✗ "${abaNome}": nenhuma linha encontrada`);
    return null;
  } catch (e) {
    console.warn(`[useRBAC] Exceção ao ler "${abaNome}":`, e);
    return null;
  }
}

async function fetchAllSheetsData(): Promise<{ colabSheet: any; vivoSheet: any; altSheet: any }> {
  // PASSO 1: Usa spreadsheet_id fixo (planilha principal configurada)
  const SPREADSHEET_ID = '17MdQs2plUl8TM5H_lji8ENNrt2veTzOqgSUJoMMQ0Nw';
  let spreadsheetId = SPREADSHEET_ID;
  let abasDisponiveis: string[] = [];
  try {
    console.log('[useRBAC] Buscando índice de abas com spreadsheet_id:', spreadsheetId);
    const indexRaw = await tool.run('get_dados_drive', { spreadsheet_id: spreadsheetId });
    const idx = indexRaw?.result ?? indexRaw;
    // Mantém o ID fixo mas registra as abas disponíveis
    if (idx?.spreadsheet_id) spreadsheetId = idx.spreadsheet_id;
    abasDisponiveis = (idx?.sheets ?? []).map((s: any) => s.sheet as string).filter(Boolean);
    console.log('[useRBAC] spreadsheet_id:', spreadsheetId, '| abas:', abasDisponiveis.join(', '));
  } catch (e) {
    console.warn('[useRBAC] Falhou buscar índice:', e);
  }

  // PASSO 2: Lê abas em paralelo
  const [colabSheet, pag1Sheet, vivoSheet, altSheet] = await Promise.all([
    lerAba('Colaboradores v2', spreadsheetId),
    lerAba('Página1', spreadsheetId),
    lerAba('Cadastro VIVO', spreadsheetId),
    lerAba('ALTERAÇÕES SALARIAIS', spreadsheetId),
  ]);

  // Escolhe melhor aba de colaboradores
  const melhor = [colabSheet, pag1Sheet].find(s => s && s.rows.length > 0);
  return { colabSheet: melhor ?? null, vivoSheet: vivoSheet ?? null, altSheet: altSheet ?? null };
}

async function fetchColaboradoresFromSheets(): Promise<Colaborador[]> {
  // Verifica cache
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    console.log('[useRBAC] Usando cache:', cache.data.length, 'colaboradores');
    return cache.data;
  }

  const { colabSheet, vivoSheet, altSheet } = await fetchAllSheetsData();

  if (!colabSheet) {
    throw new Error('Não foi possível carregar a aba de colaboradores da planilha.');
  }

  const colabCols: string[] = colabSheet.columns;
  const colabRows: any[] = colabSheet.rows;

  console.log(`[useRBAC] Aba de colaboradores: ${colabRows.length} linhas, ${colabCols.length} colunas`);
  console.log('[useRBAC] Primeiras colunas:', colabCols.slice(0, 12).join(' | '));

  if (colabRows[0]) {
    const tipo = Array.isArray(colabRows[0]) ? 'ARRAY' : 'OBJETO';
    console.log(`[useRBAC] Formato das linhas: ${tipo}`);
    if (tipo === 'ARRAY') {
      console.log('[useRBAC] 1ª linha (array):', JSON.stringify(colabRows[0].slice(0, 8)));
    } else {
      console.log('[useRBAC] 1ª linha KEYS:', JSON.stringify(Object.keys(colabRows[0]).slice(0, 10)));
      console.log('[useRBAC] 1ª linha VALORES:', JSON.stringify(Object.fromEntries(Object.entries(colabRows[0]).slice(0, 8))));
    }
  }

  // Converte linhas em objetos Colaborador — NÃO filtra por status para não perder ninguém
  const colaboradores: Colaborador[] = colabRows
    .map((row, idx) => ({
      id: `sheets-${idx}`,
      ...rowToObj(row, colabCols),
    }))
    .filter((c) => {
      // Remove apenas linhas 100% vazias (cabeçalho repetido ou linha em branco)
      const nome = getVal(c, 'NOME COMPLETO', 'NOME', 'nome', 'nome_completo');
      const mat = getVal(c, 'MATRICULA', 'MATRÍCULA', 'matricula');
      const email = getVal(c, 'EMAIL IPNET', 'E-MAIL IPNET', 'email', 'email_corporativo');
      return !!(nome || mat || email);
    });

  console.log(`[useRBAC] Colaboradores válidos: ${colaboradores.length} de ${colabRows.length} linhas`);

  // ── Enriquecer com Cadastro VIVO ──────────────────────────────────────
  if (vivoSheet && vivoSheet.rows.length > 0) {
    const vivoCols = vivoSheet.columns;
    const vivoRows = vivoSheet.rows;
    console.log(`[useRBAC] Cruzando com Cadastro VIVO (${vivoRows.length} linhas)`);
    console.log('[useRBAC] Colunas VIVO:', vivoCols.slice(0, 10).join(' | '));

    const vivoMap = new Map<string, Record<string, any>>();
    for (const row of vivoRows) {
      const obj = rowToObj(row, vivoCols);
      const nome = normKey(getVal(obj, 'NOME', 'nome'));
      const matNtt = getVal(obj, 'MATRÍCULA NTT (5)', 'MATRICULA NTT (5)', 'matricula_ntt', 'MATRICULA').replace(/\.0+$/, '').trim();
      if (nome) vivoMap.set(nome, obj);
      if (matNtt) vivoMap.set(matNtt, obj);
    }

    for (const colab of colaboradores) {
      const nomeNorm = normKey(getVal(colab, 'NOME COMPLETO', 'NOME', 'nome'));
      const mat = getVal(colab, 'MATRICULA', 'MATRÍCULA', 'matricula').replace(/\.0+$/, '').trim();
      const vivoData = vivoMap.get(nomeNorm) ?? vivoMap.get(mat);
      if (vivoData) {
        const emailTel = getVal(vivoData, 'E-MAIL TELEFONICA', 'E-MAIL TELEFÔNICA', 'EMAIL TELEFONICA', 'email_telefonica');
        const matSap = getVal(vivoData, 'MATRÍCULA SAP (80)', 'MATRICULA SAP (80)', 'matricula_sap', 'SAP');
        const tipoCont = getVal(vivoData, 'TIPO DE CONTRATAÇÃO', 'TIPO DE CONTRATACAO', 'tipo_contratacao');
        if (emailTel) (colab as any)['_email_telefonica'] = emailTel;
        if (matSap) (colab as any)['_matricula_sap'] = matSap;
        if (tipoCont) (colab as any)['_tipo_contratacao'] = tipoCont;
      }
    }
    console.log('[useRBAC] Enriquecimento com VIVO concluído');
  }

  // ── Enriquecer com ALTERAÇÕES SALARIAIS ───────────────────────────────
  if (altSheet && altSheet.rows.length > 0) {
    const altCols = altSheet.columns;
    const altRows = altSheet.rows;
    console.log(`[useRBAC] Histórico salarial: ${altRows.length} alterações`);

    const altMap = new Map<string, any[]>();
    for (const row of altRows) {
      const obj = rowToObj(row, altCols);
      const email = getVal(obj, 'E-MAIL COLABORADOR', 'EMAIL COLABORADOR', 'email_colaborador').toLowerCase();
      if (email) {
        if (!altMap.has(email)) altMap.set(email, []);
        altMap.get(email)!.push(obj);
      }
    }

    for (const colab of colaboradores) {
      const email = getVal(colab, 'EMAIL IPNET', 'E-MAIL IPNET', 'email').toLowerCase();
      if (email && altMap.has(email)) {
        (colab as any)['_historico_salarial'] = altMap.get(email);
      }
    }
    console.log('[useRBAC] Enriquecimento com histórico salarial concluído');
  }

  // Salva no cache
  cache = { data: colaboradores, ts: Date.now() };
  console.log(`[useRBAC] Cache salvo: ${colaboradores.length} colaboradores`);
  return colaboradores;
}

export function useRBAC() {
  const [todos, setTodos] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchColaboradoresFromSheets()
      .then((colabs) => {
        if (!cancelled) {
          setTodos(colabs);
          console.log('[useRBAC] Total carregado do Sheets:', colabs.length);
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          console.error('[useRBAC] Erro ao carregar do Sheets:', e);
          setError(e?.message || 'Erro ao carregar colaboradores do Google Sheets.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { visiveis: todos, todos, perfil: 'diretor' as const, emailUsuario: '', loading, error };
}
