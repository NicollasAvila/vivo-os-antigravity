// ============================================================================
// SyncDrive — Lê dados direto do Google Sheets via get_dados_drive e sincroniza
// ============================================================================
import React, { useState, useEffect } from 'react';
import {
  ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon,
  ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { tool, pages } from '../lib/seiva';

pages.define({ path: '/sync-drive', name: 'Sync Drive', description: 'Verifica a conexão com o Google Sheets e visualiza os dados dos colaboradores' });

function normKey(k: string): string {
  return String(k ?? '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')      // remove acentos
    .replace(/[\n\r\t/\\()º°ª.]/g, ' ')  // barra, parênteses, grau, ponto → espaço
    .replace(/\s+/g, ' ').trim();
}

// --- FIELD_MAP removido: app lê direto do Sheets via useRBAC, não sincroniza banco ---
const _FIELD_MAP_UNUSED: Record<string, string> = {
  // Identificação
  'matricula': 'matricula',
  'matricula ipnet': 'matricula',
  // Nome
  'nome completo': 'nome',
  'nome': 'nome',
  // Status
  'status': 'status',
  'situacao': 'status',
  // E-mails
  'email ipnet': 'email',
  'e-mail ipnet': 'email',
  'email pessoal': 'email_pessoal',
  'e-mail telefonica': 'email_telefonica',
  'email telefonica': 'email_telefonica',
  'e-mail gerente': 'email_gerente',
  'email gerente': 'email_gerente',
  // "COORDENADOR/\nSUPERVISOR" → após normKey vira "coordenador/ supervisor"
  'e-mail coordenador/ supervisor': 'email_coord',
  'e-mail coordenador/supervisor': 'email_coord',
  'e-mail coordenador supervisor': 'email_coord',
  'email coordenador supervisor': 'email_coord',
  // Cargo — coluna exata: "CARGO"
  'cargo': 'cargo',
  // Senioridade — coluna exata: "NÍVEL DE SENIORIDADE" → normKey → "nivel de senioridade"
  'nivel de senioridade': 'nivel_senioridade',
  'nivel senioridade': 'nivel_senioridade',
  'senioridade': 'nivel_senioridade',
  // Área — coluna exata: "ÁREA" → normKey → "area"
  'area': 'area',
  'departamento': 'departamento',
  'empresa': 'empresa',
  // Centro de custo — coluna exata: "CENTRO DE CUSTO"
  'centro de custo': 'centro_custo',
  'centro de custo cloud': 'centro_custo_cloud',
  // Hierarquia
  'gerente': 'gerente',
  'gerente senior': 'gerente_senior', // "GERENTE SÊNIOR" → normKey
  // "COORDENADOR/\nSUPERVISOR" → normKey → "coordenador/ supervisor"
  'coordenador/ supervisor': 'coordenador',
  'coordenador/supervisor': 'coordenador',
  'coordenador supervisor': 'coordenador',
  // Admissão — colunas exatas: "1º ADMISSÃO" e "ADMISSÃO CONTRATUAL"
  '1o admissao': 'admissao',
  '1a admissao': 'admissao',
  '1 admissao': 'admissao',
  'admissao contratual': 'admissao',
  'data admissao': 'admissao',
  'admissao': 'admissao',
  'data de demissao': 'data_demissao',
  // SAP — coluna exata: "MATRÍCULA SAP (80)" → normKey → "matricula sap (80)"
  'matricula sap (80)': 'matricula_sap',
  'matricula sap': 'matricula_sap',
  // Contrato — colunas exatas: "TIPO DE CONTRATACAO" e "TIPO DE CONTRATO"
  'tipo de contratacao': 'tipo_contrato',
  'tipo de contrato': 'tipo_contrato_regime',
  // Perfil pessoal
  'grau de instrucao': 'grau_instrucao',
  'sexo': 'sexo',
  'estado civil': 'estado_civil',
  'data de nascimento': 'data_nascimento',
  'idade': 'idade',
  'pcd': 'pcd',
  'key people': 'key_people',
  'carta key people': 'key_people',
  // Outros
  'cbo': 'cbo',
  'descricao': 'descricao',
  'cpf': 'cpf',
  'pis': 'pis',
  'cnpj': 'cnpj',
  'cidade': 'cidade',
  'celular pessoal': 'celular',
  'divisao': 'divisao',
  'sigla': 'sigla',
  'cod empresa': 'cod_empresa',
};

// Abas candidatas (em ordem de prioridade)
const COLAB_SHEETS = ['Colaboradores v2', 'Colaboradores', 'colaboradores'];

// Campos que o app reconhece — inclui todos os nomes reais da planilha Colaboradores v2
// (normalizado via normKey antes da comparação)
const KNOWN_FIELDS = new Set([
  // Identificação
  'matricula', 'matricula ipnet', 'numero matricula', 'numero de matricula',
  // Nome
  'nome completo', 'nome',
  // Status
  'status', 'situacao',
  // E-mails
  'email ipnet', 'e-mail ipnet', 'email colaborador', 'e-mail colaborador',
  'email corporativo', 'e-mail corporativo',
  'email telefonica', 'e-mail telefonica', 'e-mail corp',
  'e-mail gerente', 'email gerente',
  'e-mail coordenador supervisor', 'e-mail coordenador/ supervisor',
  'email coordenador supervisor',
  'e-mail c-level', 'email c-level',
  'e-mail head', 'email head',
  // Cargo e senioridade
  'cargo', 'funcao', 'cargo funcao', 'cargo atual',
  'nivel de senioridade', 'nivel senioridade', 'senioridade', 'seniority', 'level', 'nivel',
  // Organização
  'area', 'departamento', 'depto', 'setor',
  'empresa', 'company',
  'centro de custo', 'centro custo', 'cc',
  'centro de custo cloud', 'divisao', 'sigla', 'cod empresa',
  // Hierarquia
  'gerente', 'gerente direto', 'gerente senior',
  'gestor', 'lider',
  'coordenador supervisor', 'coordenador/ supervisor', 'coordenador', 'supervisor',
  // Salário
  'salario', 'salario bruto', 'remuneracao', 'sal',
  'salario anterior', 'salario novo', 'novo salario',
  // Admissão e demissão
  '1o admissao', '1a admissao', '1 admissao',
  'admissao contratual', 'data admissao', 'admissao', 'dt admissao',
  'data de admissao', 'data de demissao', 'dt demissao',
  // SAP e matrícula Telefônica
  'matricula sap (80)', 'matricula sap', 'sap',
  'matricula ntt (5)', 'matricula ntt',
  // Tipo de contrato
  'tipo de contratacao', 'tipo de contrato', 'tipo contrato', 'contratacao', 'regime', 'vinculo', 'politica',
  // Perfil pessoal
  'grau de instrucao', 'escolaridade', 'formacao', 'instrucao',
  'sexo', 'genero', 'gender',
  'estado civil', 'data de nascimento', 'nascimento', 'idade', 'pcd',
  // Outros campos da planilha
  'key people', 'carta key people',
  'cbo', 'descricao', 'cpf', 'pis', 'cnpj', 'cidade', 'celular pessoal',
  'motivo', 'cargo anterior', 'novo cargo',
  'e-mail colaborador',
  // Campos pessoais/endereço (presentes na planilha mas não usados no app)
  'nome da mae', 'nome do pai', 'mae', 'pai',
  'endereco', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep',
  'tipo do contato de emergencia', 'nome do contato de emergencia', 'telefone do contato de emergencia',
  'contato de emergencia', 'emergencia',
  'e-mail do indicador', 'indicador', 'competencia de pagamento indicacao',
  'competencia pagamento indicacao', 'e-mail indicador',
  // Variações com OCR/caracteres especiais — normKey vai limpar e bater
  'w ie da mae', 'oereco', 'l iero', 'ccmplemento', 'cv 1petencia de pagamento indicacao',
  'nome da mae (w', 'logradouro l', 'numero n',
  // Matrícula SAP sem parênteses
  'matricula sap 80', 'matricula sap  80',
]);

type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';
interface ColInfo { original: string; known: boolean; sample: string; }

export default function DiagDrive() {
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState('');
  const [sheetUsed, setSheetUsed] = useState('');
  const [allSheets, setAllSheets] = useState<{ sheet: string; row_count: number }[]>([]);
  const [colInfos, setColInfos] = useState<ColInfo[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [validRows, setValidRows] = useState(0);
  const [showMapping, setShowMapping] = useState(false);
  const [rawLog, setRawLog] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setStatus('loading');
    setError('');
    setColInfos([]);
    setPreviewRows([]);
    setRawLog('');

    try {
      const SPREADSHEET_ID = '17MdQs2plUl8TM5H_lji8ENNrt2veTzOqgSUJoMMQ0Nw';
      console.log('[SyncDrive] Chamando get_dados_drive com spreadsheet_id:', SPREADSHEET_ID);
      const resp = await tool.run('get_dados_drive', { spreadsheet_id: SPREADSHEET_ID });
      // tool.run envolve em { result: ... }
      const inner = (resp as any)?.result ?? resp;

      console.log('[SyncDrive] success:', inner?.success,
        '| total_sheets:', inner?.total_sheets,
        '| sheets:', (inner?.sheets ?? []).map((s: any) => s.sheet));

      setRawLog(JSON.stringify({
        success: inner?.success,
        total_sheets: inner?.total_sheets,
        sheets: (inner?.sheets ?? []).map((s: any) => ({
          sheet: s.sheet,
          row_count: s.row_count,
          cols_sample: (s.columns ?? []).slice(0, 8),
        })),
      }, null, 2));

      if (!inner?.success || !Array.isArray(inner?.sheets) || inner.sheets.length === 0) {
        throw new Error(`Resposta inválida ou sem abas. Detalhes: ${JSON.stringify(inner).slice(0, 300)}`);
      }

      // Procura aba de colaboradores em ordem de prioridade
      let sheetData: any = null;
      for (const candidateName of COLAB_SHEETS) {
        sheetData = inner.sheets.find(
          (s: any) => String(s.sheet ?? '').toLowerCase() === candidateName.toLowerCase()
        );
        if (sheetData) break;
      }
      // Fallback: aba com mais linhas
      if (!sheetData) {
        sheetData = [...inner.sheets].sort((a: any, b: any) => (b.row_count ?? 0) - (a.row_count ?? 0))[0];
      }

      if (!sheetData) throw new Error('Nenhuma aba com dados encontrada.');

      const usedSheet: string = sheetData.sheet ?? '';
      const columns: string[] = sheetData.columns ?? [];
      const rows: Record<string, any>[] = sheetData.rows ?? [];

      console.log('[SyncDrive] Aba:', usedSheet, '| linhas:', rows.length, '| colunas:', columns.length);
      console.log('[SyncDrive] Primeiras colunas:', columns.slice(0, 15));
      if (rows[0]) console.log('[SyncDrive] 1ª linha (amostra):', JSON.stringify(rows[0]).slice(0, 500));

      if (rows.length === 0) throw new Error(`A aba "${usedSheet}" existe mas está sem linhas.`);

      setSheetUsed(usedSheet);
      setTotalRows(rows.length);
      setAllSheets((inner.sheets ?? []).map((s: any) => ({ sheet: s.sheet, row_count: s.row_count ?? 0 })));

      const valid = rows.filter((r: any) => {
        const nome = String(r['NOME COMPLETO'] ?? r['NOME'] ?? r['nome'] ?? '').trim();
        const mat = String(r['MATRICULA'] ?? r['MATRÍCULA'] ?? r['matricula'] ?? '').trim();
        return nome || mat;
      });
      setValidRows(valid.length);

      // Monta infos de colunas com sample da 1ª linha
      const sample = rows[0] ?? {};
      const infos: ColInfo[] = columns.map((col: string) => ({
        original: col,
        known: KNOWN_FIELDS.has(normKey(col)),
        sample: String(sample[col] ?? '').slice(0, 80),
      }));
      setColInfos(infos);
      setPreviewRows(rows.slice(0, 5));
      setStatus('loaded');
    } catch (e: any) {
      console.error('[SyncDrive] Erro:', e);
      setError(e?.message ?? String(e));
      setStatus('error');
    }
  }

  const knownCount = colInfos.filter(c => c.known).length;
  const coveragePct = colInfos.length ? Math.round(knownCount / colInfos.length * 100) : 0;
  const allPreviewHeaders = Object.keys(previewRows[0] ?? {});
  const previewHeaders = allPreviewHeaders.slice(0, 8);
  const extraCols = Math.max(0, allPreviewHeaders.length - 8);

  if (status === 'idle' || status === 'loading') return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Verificar conexão — Google Sheets</h1>
      <Card>
        <div className="p-12 text-center space-y-3">
          <ArrowPathIcon className="w-9 h-9 animate-spin text-[var(--color-primary-600)] mx-auto" />
          <p className="font-semibold text-gray-900">Lendo planilha do Google Drive…</p>
          <p className="text-sm text-gray-500">Buscando aba de colaboradores</p>
        </div>
      </Card>
    </div>
  );

  if (status === 'error') return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Verificar conexão — Google Sheets</h1>
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-red-800">Erro ao ler a planilha</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
      {rawLog && (
        <Card>
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">Estrutura retornada pelo Drive:</p>
            <pre className="text-xs bg-gray-50 rounded p-3 overflow-x-auto text-gray-700 max-h-64">{rawLog}</pre>
          </div>
        </Card>
      )}
      <Button onClick={loadData} icon={<ArrowPathIcon className="w-4 h-4" />}>
        Tentar novamente
      </Button>
    </div>
  );

  return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Verificar conexão — Google Sheets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Aba <span className="font-medium text-gray-700">"{sheetUsed}"</span> ·{' '}
            {totalRows.toLocaleString('pt-BR')} linhas ·{' '}
            <span className="text-[var(--color-primary-600)] font-medium">{validRows.toLocaleString('pt-BR')} colaboradores válidos</span>
          </p>
        </div>
        <Button variant="secondary" onClick={loadData} icon={<ArrowPathIcon className="w-4 h-4" />}>
          Recarregar
        </Button>
      </div>

      {/* Banner de sucesso */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex gap-3">
        <CheckCircleIcon className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-green-800">Conexão com Google Sheets ativa</p>
          <p className="text-sm text-green-700">O Dashboard lê os dados direto desta planilha. Nenhuma importação necessária.</p>
        </div>
      </div>

      {/* Abas disponíveis */}
      {allSheets.length > 1 && (
        <Card>
          <div className="p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Abas na planilha</p>
            <div className="flex flex-wrap gap-2">
              {allSheets.map(s => (
                <span key={s.sheet} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  s.sheet === sheetUsed
                    ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] ring-1 ring-[var(--color-primary-300)]'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {s.sheet} <span className="text-gray-400">{s.row_count.toLocaleString('pt-BR')} linhas</span>
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Cobertura */}
      <Card>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-medium text-gray-700">
              {knownCount} de {colInfos.length} colunas reconhecidas ({coveragePct}%)
              {colInfos.length - knownCount > 0 && (
                <span className="ml-2 text-gray-400 font-normal">· {colInfos.length - knownCount} não mapeadas</span>
              )}
            </p>
            <Button variant="ghost" size="sm"
              icon={showMapping ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
              onClick={() => setShowMapping(v => !v)}>
              {showMapping ? 'Ocultar' : 'Ver mapeamento'}
            </Button>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${coveragePct}%`,
                backgroundColor: coveragePct > 70 ? '#22c55e' : coveragePct > 40 ? '#eab308' : '#ef4444'
              }} />
          </div>
        </div>
      </Card>

      {/* Mapeamento de colunas */}
      {showMapping && (
        <Card>
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3">
              <span className="text-green-600 font-medium">Verde</span> = campo reconhecido ·{' '}
              <span className="text-red-400 font-medium">Vermelho</span> = não mapeado (não afeta o Dashboard)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Coluna no Sheets</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Reconhecida?</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Exemplo (1ª linha)</th>
                  </tr>
                </thead>
                <tbody>
                  {colInfos.map((c, i) => (
                    <tr key={i} className={`border-b border-gray-50 ${!c.known ? 'bg-red-50/40' : 'hover:bg-gray-50'}`}>
                      <td className="py-1.5 px-2 font-mono text-gray-700 whitespace-nowrap">{c.original}</td>
                      <td className="py-1.5 px-2">
                        {c.known
                          ? <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                              <CheckCircleIcon className="w-3 h-3" /> Sim
                            </span>
                          : <span className="text-red-400">Não mapeada</span>}
                      </td>
                      <td className="py-1.5 px-2 text-gray-400 max-w-[200px] truncate">{c.sample || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Preview */}
      {previewRows.length > 0 && (
        <Card>
          <div className="p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Prévia — primeiras {previewRows.length} linhas
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    {previewHeaders.map(h => (
                      <th key={h} className="text-left py-2 px-2 text-gray-500 font-medium whitespace-nowrap max-w-[140px] truncate">
                        {h}
                      </th>
                    ))}
                    {extraCols > 0 && (
                      <th className="text-left py-2 px-2 text-gray-400 italic font-normal">
                        +{extraCols} colunas…
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      {previewHeaders.map(h => (
                        <td key={h} className="py-1.5 px-2 text-gray-700 max-w-[140px] truncate whitespace-nowrap">
                          {row[h] === null || row[h] === undefined || String(row[h]).trim() === ''
                            ? <span className="text-gray-300">—</span>
                            : String(row[h])}
                        </td>
                      ))}
                      {extraCols > 0 && <td className="py-1.5 px-2 text-gray-300">…</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-gray-400">
                {totalRows.toLocaleString('pt-BR')} linhas no total · {validRows.toLocaleString('pt-BR')} com nome ou matrícula
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
