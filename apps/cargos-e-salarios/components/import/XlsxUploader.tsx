// ============================================================================
// XlsxUploader — Upload direto de .xlsx → Edge Function → preview por aba
// Lê TODAS as abas sem filtros; exibe prévia e salva nas coleções.
// ============================================================================
import React, { useState, useRef } from 'react';
import {
  ArrowUpTrayIcon, CheckCircleIcon, ExclamationTriangleIcon,
  ArrowPathIcon, TableCellsIcon, ChevronDownIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { tool, db, storage } from '../../lib/seiva';
import { pushToast } from '../../hooks/useToast';

declare const seiva: any;

type Status = 'idle' | 'uploading' | 'parsing' | 'preview' | 'importing' | 'done' | 'error';

interface SheetInfo {
  headers: string[];
  rows: Record<string, any>[];
  total_rows: number;
  error?: string;
}

interface ParseResult {
  sheets: string[];
  sheet_data: Record<string, SheetInfo>;
  summary: Record<string, { total_rows: number; columns: number; error?: string }>;
  total_sheets: number;
}

// ── Normalização de chave (remove acento, lowercase, espaços→_) ────────────
function normKey(k: string): string {
  return k
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\n\r\t/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Mapeamento de chaves normalizadas → campo canônico da coleção 'colaboradores'
const COLAB_FIELD_MAP: Record<string, string> = {
  // Identificação
  'matricula': 'matricula',
  'matricula ipnet': 'matricula',
  'numero matricula': 'matricula',
  'numero de matricula': 'matricula',
  'nome': 'nome',
  'nome completo': 'nome',
  'status': 'status',
  'situacao': 'status',
  // Contato
  'email ipnet': 'email',
  'e-mail ipnet': 'email',
  'email colaborador': 'email',
  'e-mail colaborador': 'email',
  'email corporativo': 'email_corporativo',
  'e-mail corporativo': 'email_corporativo',
  'email telefonica': 'email_telefonica',
  'e-mail telefonica': 'email_telefonica',
  'e-mail corp': 'email_telefonica',
  // Cargo e senioridade
  'cargo': 'cargo',
  'funcao': 'cargo',
  'cargo/funcao': 'cargo',
  'cargo atual': 'cargo',
  'nivel de senioridade': 'nivel_senioridade',
  'nivel senioridade': 'nivel_senioridade',
  'senioridade': 'nivel_senioridade',
  'seniority': 'nivel_senioridade',
  'level': 'nivel_senioridade',
  'nivel': 'nivel_senioridade',
  // Organização
  'area': 'area',
  'departamento': 'departamento',
  'depto': 'departamento',
  'setor': 'departamento',
  'empresa': 'empresa',
  'company': 'empresa',
  'centro de custo': 'centro_custo',
  'centro custo': 'centro_custo',
  'cc': 'centro_custo',
  // Hierarquia
  'gerente': 'gerente',
  'gerente direto': 'gerente',
  'gerente senior': 'gerente_senior',
  'gestor': 'gerente',
  'lider': 'gerente',
  'coordenador supervisor': 'coordenador',
  'coordenador': 'coordenador',
  'supervisor': 'coordenador',
  'e-mail gerente': 'email_gerente',
  'email gerente': 'email_gerente',
  'e-mail coordenador supervisor': 'email_coord',
  'email coordenador supervisor': 'email_coord',
  // Salário
  'salario': 'salario',
  'salario bruto': 'salario',
  'remuneracao': 'salario',
  'sal': 'salario',
  // Admissão
  'admissao contratual': 'admissao',
  '1 admissao': 'admissao',
  'data admissao': 'admissao',
  'admissao': 'admissao',
  'dt admissao': 'admissao',
  // SAP
  'matricula sap (80)': 'matricula_sap',
  'matricula sap': 'matricula_sap',
  'sap': 'matricula_sap',
  // Contrato
  'tipo de contratacao': 'tipo_contrato',
  'tipo de contrato': 'tipo_contrato',
  'tipo contrato': 'tipo_contrato',
  'contratacao': 'tipo_contrato',
  'regime': 'tipo_contrato',
  'vinculo': 'tipo_contrato',
  // Perfil pessoal
  'grau de instrucao': 'grau_instrucao',
  'escolaridade': 'grau_instrucao',
  'formacao': 'grau_instrucao',
  'instrucao': 'grau_instrucao',
  'sexo': 'sexo',
  'genero': 'sexo',
  'gender': 'sexo',
  'estado civil': 'estado_civil',
  'data de nascimento': 'data_nascimento',
  'nascimento': 'data_nascimento',
  'idade': 'idade',
  'pcd': 'pcd',
  'key people': 'key_people',
};

/**
 * Converte uma linha do Excel (chaves originais) em registro canônico para colaboradores.
 * Qualquer campo não mapeado é descartado. Limpa valores "NULL"/"None" → null.
 */
function normalizeColabRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [rawKey, rawVal] of Object.entries(row)) {
    const nk = normKey(rawKey);
    const canon = COLAB_FIELD_MAP[nk];
    if (!canon) continue;
    // Limpa valores nulos literais
    let val: any = rawVal;
    if (typeof val === 'string') {
      const up = val.trim().toUpperCase();
      if (up === 'NULL' || up === 'NONE' || up === 'N/A' || up === '-') val = null;
      else val = val.trim();
    }
    // Remove sufixo .0 de matrículas exportadas como float
    if ((canon === 'matricula' || canon === 'matricula_sap') && typeof val === 'string') {
      val = val.replace(/\.0+$/, '');
    }
    // Sobrescreve só se o atual está vazio/nulo e o novo tem valor
    const current = out[canon];
    const currentEmpty = current === undefined || current === null || String(current).trim() === '';
    const newHasValue = val !== null && val !== undefined && String(val).trim() !== '';
    if (currentEmpty && newHasValue) {
      out[canon] = val;
    } else if (current === undefined) {
      out[canon] = val; // garante que a chave existe
    }
  }
  return out;
}

// Mapeia nome da aba para nome de coleção
function sheetToCollection(sheetName: string): string {
  const n = sheetName.toLowerCase().replace(/\s+/g, '_');
  if (n.includes('colaborador')) return 'colaboradores';
  if (n.includes('altera')) return 'alteracoes_salariais';
  if (n.includes('vivo')) return 'cadastro_vivo';
  if (n.includes('head')) return 'headcount_mensal';
  if (n === 'página6' || n === 'pagina6' || n.includes('p%c3%a1gina6')) return 'hierarquia_gestores';
  if (n === 'página1' || n === 'pagina1' || n.includes('p%c3%a1gina1')) return 'colaboradores_p1';
  return sheetName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function wipe(col: string) {
  while (true) {
    const rows = await db.list<{ id: string }>(col, { limit: 1000 });
    if (!rows.length) break;
    await seiva.data.bulkDelete(col, { ids: rows.map((r) => r.id) });
    if (rows.length < 1000) break;
  }
}

/**
 * Upsert de colaboradores por matrícula:
 * - Se matrícula já existe → atualiza campos vazios com os novos valores (nunca apaga dado existente)
 * - Se não existe → cria novo registro
 */
async function upsertColaboradores(newRows: Record<string, any>[]) {
  // Carrega todos os existentes para mapear matrícula → id
  const existingAll: { id: string; matricula?: string }[] = [];
  let offset = 0;
  while (true) {
    const page = await db.list<{ id: string; matricula?: string }>('colaboradores', { limit: 1000, offset });
    existingAll.push(...page);
    if (page.length < 1000) break;
    offset += 1000;
  }

  // Mapa matrícula normalizada → id existente
  const matriculaMap = new Map<string, string>();
  for (const r of existingAll) {
    const mat = String(r.matricula ?? '').replace(/\.0+$/, '').trim();
    if (mat) matriculaMap.set(mat, r.id);
  }

  const toCreate: Record<string, any>[] = [];
  const toUpdate: { id: string; patch: Record<string, any> }[] = [];

  for (const row of newRows) {
    const mat = String(row.matricula ?? '').replace(/\.0+$/, '').trim();
    const existingId = mat ? matriculaMap.get(mat) : undefined;

    if (existingId) {
      // Patch: sobrescreve QUALQUER campo que tenha valor no Excel
      // Isso corrige registros gravados anteriormente com campos vazios
      const patch: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        if (k === 'id') continue;
        const newHasVal = v !== null && v !== undefined && String(v).trim() !== '';
        if (newHasVal) patch[k] = v;
      }
      if (Object.keys(patch).length > 0) toUpdate.push({ id: existingId, patch });
    } else {
      toCreate.push(row);
    }
  }

  console.log(`[upsertColaboradores] criar: ${toCreate.length}, atualizar: ${toUpdate.length}`);

  // Cria novos em bulk
  const CHUNK = 500;
  for (let i = 0; i < toCreate.length; i += CHUNK) {
    await seiva.data.bulkCreate('colaboradores', toCreate.slice(i, i + CHUNK));
  }

  // Atualiza existentes em lotes de 5 paralelos
  const UPDATE_CONCURRENCY = 5;
  for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
    const batch = toUpdate.slice(i, i + UPDATE_CONCURRENCY);
    await Promise.allSettled(batch.map(({ id, patch }) => db.update('colaboradores', id, patch)));
  }

  return { created: toCreate.length, updated: toUpdate.length };
}

async function bulkSave(col: string, items: any[]) {
  const CHUNK = 500;
  for (let i = 0; i < items.length; i += CHUNK) {
    await seiva.data.bulkCreate(col, items.slice(i, i + CHUNK));
  }
}

// ── Mini tabela de prévia ───────────────────────────────────────────────────
function SheetPreview({ name, info, defaultOpen }: { name: string; info: SheetInfo; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const validHeaders = info.headers.filter(Boolean);
  const visibleHeaders = validHeaders.slice(0, 8);
  const previewRows = info.rows.slice(0, 5);

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open
            ? <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            : <ChevronRightIcon className="w-4 h-4 text-gray-400" />
          }
          <span className="font-medium text-gray-800 text-sm">{name}</span>
          {info.error && <span className="text-xs text-red-500 ml-1">⚠ {info.error}</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{info.total_rows} linhas</span>
          <span>{validHeaders.length} colunas</span>
        </div>
      </button>

      {open && !info.error && previewRows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-t border-gray-100">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                {visibleHeaders.map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium whitespace-nowrap max-w-[160px] truncate">
                    {h}
                  </th>
                ))}
                {validHeaders.length > 8 && (
                  <th className="text-left px-3 py-2 text-gray-400 font-normal italic">
                    +{validHeaders.length - 8} colunas…
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  {visibleHeaders.map((h) => {
                    const val = row[h];
                    return (
                      <td key={h} className="px-3 py-2 text-gray-700 max-w-[160px] truncate whitespace-nowrap">
                        {val === null || val === undefined
                          ? <span className="text-gray-300">—</span>
                          : String(val)}
                      </td>
                    );
                  })}
                  {validHeaders.length > 8 && <td className="px-3 py-2 text-gray-300">…</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {info.total_rows > 5 && (
            <p className="px-3 py-2 text-xs text-gray-400 border-t border-gray-50">
              Mostrando 5 de {info.total_rows} linhas
            </p>
          )}
        </div>
      )}

      {open && previewRows.length === 0 && !info.error && (
        <p className="px-4 py-3 text-xs text-gray-400">Aba sem dados.</p>
      )}
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────
export default function XlsxUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [importProgress, setImportProgress] = useState('');

  async function processFile(f: File) {
    setFile(f);
    setStatus('uploading');
    setErrorMsg('');
    setResult(null);
    let uploadedFileId: string | null = null;

    try {
      console.log('[XlsxUploader] Arquivo:', f.name, Math.round(f.size / 1024), 'KB');

      // 1. Faz upload para o storage e obtém URL assinada
      console.log('[XlsxUploader] Fazendo upload para storage…');
      const uploaded = await storage.upload(f, { name: f.name });
      uploadedFileId = uploaded?.id ?? uploaded?.storage_file_id ?? null;
      console.log('[XlsxUploader] Upload ok, file id:', uploadedFileId);

      if (!uploadedFileId) throw new Error('Upload falhou: ID do arquivo não retornado.');

      const { url: signedUrl } = await storage.getUrl(uploadedFileId, 7200);
      console.log('[XlsxUploader] URL assinada obtida');

      // 2. Chama a Edge Function com a URL assinada
      setStatus('parsing');
      console.log('[XlsxUploader] Enviando para parse_almeida_xlsx…');

      let rawResponse: any;
      try {
        rawResponse = await tool.run('parse_almeida_xlsx', { signed_url: signedUrl });
      } catch (fnErr: any) {
        throw new Error(`Erro na função de parsing: ${fnErr?.message ?? String(fnErr)}`);
      }

      // tool.run envolve a resposta em { result: ... } — desembrulha aqui
      const raw: any = rawResponse?.result ?? rawResponse;

      console.log('[XlsxUploader] Resposta desembrulhada:', JSON.stringify({
        sheets: raw?.sheets,
        total_sheets: raw?.total_sheets,
        sheet_data_keys: Object.keys(raw?.sheet_data ?? {}),
        error: raw?.error,
        top_keys: Object.keys(raw ?? {}),
      }));

      // 3. Limpa o arquivo do storage (não precisa mais)
      if (uploadedFileId) {
        try { await seiva.storage.delete(uploadedFileId); } catch (_) {}
      }

      // Se a função não retornou sheets[], reconstrói a partir de sheet_data
      if (!raw?.sheets?.length && raw?.sheet_data) {
        raw.sheets = Object.keys(raw.sheet_data);
        raw.total_sheets = raw.sheets.length;
        // Garante summary
        if (!raw.summary) {
          raw.summary = {};
          for (const s of raw.sheets) {
            const info = raw.sheet_data[s];
            raw.summary[s] = {
              total_rows: info?.total_rows ?? info?.rows?.length ?? 0,
              columns: info?.headers?.length ?? 0,
              error: info?.error,
            };
          }
        }
      }

      if (raw?.error && !raw?.sheets?.length) {
        throw new Error(raw.error);
      }

      if (!raw?.sheets?.length) {
        throw new Error(
          `Nenhuma aba encontrada. Resposta: ${JSON.stringify(rawResponse).slice(0, 400)}`
        );
      }

      setResult(raw as ParseResult);
      setStatus('preview');
    } catch (e: any) {
      // Tenta limpar o arquivo em caso de erro
      if (uploadedFileId) {
        try { await seiva.storage.delete(uploadedFileId); } catch (_) {}
      }
      console.error('[XlsxUploader] Erro:', e);
      setStatus('error');
      setErrorMsg(e?.message ?? 'Não foi possível processar o arquivo.');
    }
  }

  async function handleImport() {
    if (!result) return;
    setStatus('importing');
    setImportProgress('Preparando…');
    let totalSaved = 0;
    let totalUpdated = 0;

    try {
      for (const sheetName of result.sheets) {
        const info = result.sheet_data[sheetName];
        if (!info || info.rows.length === 0) continue;

        const col = sheetToCollection(sheetName);

        if (col === 'colaboradores') {
          // Upsert por matrícula — preserva dados existentes, preenche campos vazios
          const normalized = info.rows
            .map(normalizeColabRow)
            .filter(r => r.nome || r.email || r.matricula);
          setImportProgress(`Sincronizando colaboradores (${normalized.length} registros)…`);
          const { created, updated } = await upsertColaboradores(normalized);
          totalSaved += created;
          totalUpdated += updated;
          console.log(`[XlsxUploader] "${sheetName}" → colaboradores: ${created} criados, ${updated} atualizados`);
        } else {
          // Para outras abas: wipe + recreate
          setImportProgress(`Limpando "${sheetName}"…`);
          await wipe(col);
          setImportProgress(`Salvando "${sheetName}" (${info.rows.length} registros)…`);
          await bulkSave(col, info.rows);
          totalSaved += info.rows.length;
          console.log(`[XlsxUploader] "${sheetName}" → "${col}": ${info.rows.length} registros`);
        }
      }

      setStatus('done');
      const msg = totalUpdated > 0
        ? `${totalSaved.toLocaleString('pt-BR')} criados + ${totalUpdated.toLocaleString('pt-BR')} atualizados!`
        : `${totalSaved.toLocaleString('pt-BR')} registros importados de ${result.total_sheets} aba(s)!`;
      pushToast('success', msg);
    } catch (e: any) {
      console.error('[XlsxUploader] Erro ao salvar:', e);
      setStatus('error');
      setErrorMsg('Erro ao salvar os dados. Tente novamente.');
      pushToast('error', 'Erro ao importar os dados.');
    }
  }

  function reset() {
    setStatus('idle');
    setErrorMsg('');
    setFile(null);
    setResult(null);
    setImportProgress('');
    if (inputRef.current) inputRef.current.value = '';
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) processFile(f);
    else pushToast('error', 'Envie um arquivo .xlsx');
  };

  // ── IDLE ─────────────────────────────────────────────────────────────────
  if (status === 'idle') return (
    <Card>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-100)] flex items-center justify-center">
            <TableCellsIcon className="w-5 h-5 text-[var(--color-primary-700)]" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Upload do arquivo Excel</h2>
            <p className="text-sm text-gray-500">Todas as abas serão lidas e exibidas para confirmação</p>
          </div>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
              : 'border-gray-200 hover:border-[var(--color-primary-300)] hover:bg-gray-50'
          }`}
        >
          <ArrowUpTrayIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-medium mb-1">Clique ou arraste o arquivo aqui</p>
          <p className="text-sm text-gray-400">Formatos aceitos: .xlsx, .xls</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
          />
        </div>
      </div>
    </Card>
  );

  // ── UPLOADING / PARSING ───────────────────────────────────────────────────
  if (status === 'uploading' || status === 'parsing') return (
    <Card>
      <div className="p-12 text-center space-y-3">
        <ArrowPathIcon className="w-9 h-9 animate-spin text-[var(--color-primary-600)] mx-auto" />
        <p className="font-semibold text-gray-900">
          {status === 'uploading' ? 'Enviando arquivo…' : 'Lendo abas da planilha…'}
        </p>
        <p className="text-sm text-gray-500">
          {file?.name} · {Math.round((file?.size ?? 0) / 1024)} KB
        </p>
      </div>
    </Card>
  );

  // ── IMPORTING ─────────────────────────────────────────────────────────────
  if (status === 'importing') return (
    <Card>
      <div className="p-12 text-center space-y-3">
        <ArrowPathIcon className="w-9 h-9 animate-spin text-[var(--color-primary-600)] mx-auto" />
        <p className="font-semibold text-gray-900">Importando dados…</p>
        <p className="text-sm text-gray-500">{importProgress}</p>
      </div>
    </Card>
  );

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (status === 'error') return (
    <Card>
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Erro ao processar o arquivo</p>
            <p className="text-sm mt-1">{errorMsg}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={reset}>Tentar novamente</Button>
      </div>
    </Card>
  );

  // ── DONE ─────────────────────────────────────────────────────────────────
  if (status === 'done' && result) return (
    <Card>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
          <CheckCircleIcon className="w-6 h-6 shrink-0 text-green-600" />
          <div>
            <p className="font-semibold">Importação concluída!</p>
            <p className="text-sm">
              {result.sheets.length} aba(s) importada(s):{' '}
              {result.sheets.map((s) => `${s} (${result.summary?.[s]?.total_rows ?? 0})`).join(', ')}
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={reset}>Nova importação</Button>
      </div>
    </Card>
  );

  // ── PREVIEW ───────────────────────────────────────────────────────────────
  if (status === 'preview' && result) {
    const totalRows = result.sheets.reduce(
      (acc, s) => acc + (result.sheet_data[s]?.total_rows ?? 0),
      0
    );

    return (
      <div className="space-y-4">
        {/* Cabeçalho de confirmação */}
        <Card>
          <div className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">
                {result.total_sheets} aba(s) encontrada(s) · {totalRows.toLocaleString('pt-BR')} linhas no total
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                Confira os dados abaixo antes de confirmar a importação.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={reset}>Cancelar</Button>
              <Button onClick={handleImport} icon={<ArrowUpTrayIcon className="w-4 h-4" />}>
                Importar {totalRows.toLocaleString('pt-BR')} registros
              </Button>
            </div>
          </div>
        </Card>

        {/* Resumo por aba */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {result.sheets.map((name) => {
            const s = result.summary?.[name];
            return (
              <div key={name} className="bg-white border border-gray-100 rounded-lg p-3 text-center">
                <p className="text-xs font-medium text-gray-700 truncate" title={name}>{name}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {(s?.total_rows ?? 0).toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-400">{s?.columns ?? 0} colunas</p>
                {s?.error && <p className="text-xs text-red-500 mt-1">⚠ Erro</p>}
              </div>
            );
          })}
        </div>

        {/* Prévias por aba (colapsáveis) */}
        <Card>
          <div className="p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 mb-3">Prévia dos dados por aba</p>
            {result.sheets.map((name, i) => (
              <SheetPreview
                key={name}
                name={name}
                info={result.sheet_data[name]}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        </Card>

        {/* Ações no rodapé */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleImport} icon={<ArrowUpTrayIcon className="w-4 h-4" />}>
            Confirmar e importar
          </Button>
          <Button variant="secondary" onClick={reset}>Cancelar</Button>
        </div>
      </div>
    );
  }

  return null;
}
