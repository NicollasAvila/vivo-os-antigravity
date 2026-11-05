// ============================================================================
// CSV Parser — lê arquivos CSV exportados das 6 abas da Base Almeida
//
// Abas suportadas:
//   Colaboradores_v2  → STATUS, MATRICULA, 56 colunas (sem Salário)
//   Página1           → SITUAÇÃO, MATRICULA, 51 colunas (com coluna "Salário")
//   ALTERAÇÕES SALARIAIS → 15 colunas
//   Cadastro_VIVO     → 8 colunas (integração Telefônica)
//   Head_Count        → métricas agregadas mensais
//   Página6           → hierarquia Gerente Sênior → Gerente
// ============================================================================

import { Colaborador, AlteracaoSalarial, parseSalario } from './rbac';

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^\uFEFF/, '').trim());
  const rows = lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
  return { headers, rows };
}

// Normaliza cabeçalho: remove acentos, maiúsculas, espaços extras, quebras de linha
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findCol(headers: string[], candidates: string[]): string {
  // Match exato normalizado
  for (const c of candidates) {
    const found = headers.find((h) => norm(h) === norm(c));
    if (found) return found;
  }
  // Match parcial (contém)
  for (const c of candidates) {
    const found = headers.find((h) => norm(h).includes(norm(c)));
    if (found) return found;
  }
  return '';
}

export interface ParsedColaborador extends Omit<Colaborador, 'id'> {}
export interface ParsedAlteracao extends Omit<AlteracaoSalarial, 'id'> {}

// ── Parser de texto estruturado (formato "Base de Dados - Almeida" do Drive)
// O MCP read_file_content retorna o conteúdo como texto tabular com " | " como separador
export function parseSheetText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.includes('|') && l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };

  const splitLine = (line: string) =>
    line.split('|').map((c) => c.trim()).filter((_, i, arr) => i > 0 || arr[0] !== '');

  const headers = splitLine(lines[0]).map((h) => h.replace(/^\uFEFF/, '').trim());

  const rows = lines.slice(1).map((line) => {
    const vals = splitLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });

  return { headers, rows };
}

// ── Detecta automaticamente o formato (CSV com vírgula ou texto com pipes) ──
function autoParseSheet(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  if (firstLine.includes('|')) {
    return parseSheetText(text);
  }
  return parseCSV(text);
}

// ── Parser principal de colaboradores ─────────────────────────────────────────
// Suporta as duas fontes principais:
//   - Colaboradores_v2: STATUS + 56 colunas (sem coluna Salário)
//   - Página1: SITUAÇÃO + 51 colunas (com coluna "Salário" minúsculo)
export function parseColaboradoresFromSheet(text: string): ParsedColaborador[] {
  const { headers, rows } = autoParseSheet(text);
  const col = (candidates: string[]) => findCol(headers, candidates);

  // Campo de status: Página1 usa "SITUAÇÃO", Colaboradores_v2 usa "STATUS"
  const SITUACAO    = col(['SITUAÇÃO', 'SITUACAO', 'STATUS']);
  const MATRICULA   = col(['MATRICULA', 'MATRÍCULA']);
  const NOME        = col(['NOME COMPLETO', 'NOME']);
  const EMAIL       = col(['EMAIL IPNET', 'EMAIL CORPORATIVO', 'E-MAIL CORPORATIVO', 'E-MAIL IPNET', 'EMAIL']);
  const CARGO       = col(['CARGO']);
  // "Salário" (com acento, minúsculo) é exclusivo da Página1
  // Colaboradores_v2 não tem coluna de salário
  const SALARIO     = col(['Salário', 'SALÁRIO BRUTO', 'SALARIO BRUTO', 'SALARIO', 'SALÁRIO']);
  const AREA        = col(['ÁREA', 'AREA']);
  const DEPARTAMENTO = col(['DEPARTAMENTO']);
  const CENTRO_CUSTO = col(['CENTRO DE CUSTO']);
  const GERENTE     = col(['GERENTE']);
  const GERENTE_SR  = col(['GERENTE SÊNIOR', 'GERENTE SENIOR']);
  const EMAIL_GER   = col(['E-MAIL GERENTE', 'EMAIL GERENTE']);
  // "COORDENADOR/\nSUPERVISOR" — pandas preserva a quebra de linha no nome da coluna
  const COORD       = col(['COORDENADOR/\nSUPERVISOR', 'COORDENADOR/SUPERVISOR', 'COORDENADOR', 'SUPERVISOR']);
  const EMAIL_COORD = col(['E-MAIL COORDENADOR/SUPERVISOR', 'EMAIL COORDENADOR/SUPERVISOR', 'E-MAIL COORDENADOR']);
  // Admissão: preferencialmente ADMISSÃO CONTRATUAL, fallback 1º ADMISSÃO
  const ADMISSAO    = col(['ADMISSÃO CONTRATUAL', 'ADMISSAO CONTRATUAL', '1º ADMISSÃO', '1 ADMISSAO', 'DATA DE ADMISSÃO', 'DATA DE ADMISSAO']);
  const SENIORIDADE = col(['NÍVEL DE SENIORIDADE', 'NIVEL DE SENIORIDADE', 'SENIORIDADE']);
  const EMPRESA     = col(['EMPRESA']);
  const TIPO_CONTRATO = col(['TIPO DE CONTRATO', 'TIPO DE CONTRATACAO', 'TIPO DE CONTRATAÇÃO']);
  // Campos extras da Colaboradores_v2
  const KEY_PEOPLE  = col(['KEY PEOPLE']);
  const PCD         = col(['PCD']);
  const SEXO        = col(['SEXO']);
  const GRAU_INST   = col(['GRAU DE INSTRUCAO', 'GRAU DE INSTRUÇÃO']);

  console.log('[Parser] Headers encontrados:', headers.length, headers.slice(0, 10));
  console.log('[Parser] Campos críticos:', { SITUACAO, EMAIL, CARGO, AREA, SALARIO, GERENTE, COORD, ADMISSAO });

  return rows
    .filter((r) => {
      const sit = (r[SITUACAO] ?? '').toUpperCase().trim();
      // Aceita ATIVO, ou linha sem campo de status, mas rejeita INATIVO/DEMITIDO/etc.
      if (sit === 'INATIVO' || sit === 'DEMITIDO' || sit === 'AFASTADO') return false;
      return true;
    })
    .map((r) => {
      const emailRaw = (r[EMAIL] ?? '').toLowerCase().trim();
      const salarioRaw = r[SALARIO] ?? '';
      const salarioNum = salarioRaw ? parseSalario(salarioRaw) : null;
      const dept = r[AREA] || r[DEPARTAMENTO] || r[CENTRO_CUSTO] || '';

      return {
        // Campos canônicos (usados por rbac.ts e pelos helpers colab*)
        matricula:    r[MATRICULA] ? String(r[MATRICULA]).replace(/\.0$/, '').trim() : '',
        status:       (r[SITUACAO] ?? 'ATIVO').toUpperCase().trim() || 'ATIVO',
        nome:         r[NOME] ?? '',
        nome_completo: r[NOME] ?? '',
        email:        emailRaw,
        email_corporativo: emailRaw,
        cargo:        r[CARGO] ?? '',
        salario:      salarioNum,
        salario_bruto: salarioNum,
        departamento: dept,
        gerente:      r[GERENTE] ?? '',
        email_gerente: (r[EMAIL_GER] ?? '').toLowerCase().trim(),
        coordenador:  r[COORD] ?? '',
        coordenador_supervisor: r[COORD] ?? '',
        email_coord:  (r[EMAIL_COORD] ?? '').toLowerCase().trim(),
        email_coordenador: (r[EMAIL_COORD] ?? '').toLowerCase().trim(),
        admissao:     r[ADMISSAO] ?? '',
        data_admissao: r[ADMISSAO] ?? '',
        senioridade:  r[SENIORIDADE] ?? '',
        nivel_senioridade: r[SENIORIDADE] ?? '',
        empresa:      r[EMPRESA] ?? '',
        gerente_senior: r[GERENTE_SR] ?? '',
        tipo_contrato: r[TIPO_CONTRATO] ?? '',
        centro_custo: r[CENTRO_CUSTO] ?? '',
        // Campos demográficos extras (quando disponíveis)
        key_people:   r[KEY_PEOPLE] ?? '',
        pcd:          r[PCD] ?? '',
        sexo:         r[SEXO] ?? '',
        grau_instrucao: r[GRAU_INST] ?? '',
      };
    })
    .filter((r) => r.email && r.nome);
}

export function parseColaboradoresCSV(text: string): ParsedColaborador[] {
  return parseColaboradoresFromSheet(text);
}

// ── Parser de Alterações Salariais ────────────────────────────────────────────
// Fonte: Base_de_Dados_Almeida_ALTERAÇÕES_SALARIAIS.csv (399 linhas, 15 colunas)
// Atenção: SALÁRIO ANTERIOR / SALÁRIO NOVO podem estar zerados no CSV real
export function parseAlteracoesCSV(text: string): ParsedAlteracao[] {
  const { headers, rows } = autoParseSheet(text);
  const col = (candidates: string[]) => findCol(headers, candidates);

  const MATRICULA   = col(['MATRÍCULA', 'MATRICULA']);
  const COLABORADOR = col(['COLABORADOR']);
  const EMAIL       = col(['E-MAIL COLABORADOR', 'EMAIL COLABORADOR', 'E-MAIL', 'EMAIL']);
  const EMPRESA     = col(['EMPRESA']);
  const DEPTO       = col(['DEPARTAMENTO']);
  const DATA        = col(['A PARTIR DE', 'DATA', 'DATA ALTERACAO', 'DATA DE ALTERAÇÃO']);
  const MOTIVO      = col(['MOTIVO']);
  const CARGO_ANT   = col(['CARGO ANTERIOR']);
  const NOVO_CARGO  = col(['NOVO CARGO']);
  const SAL_ANT     = col(['SALÁRIO ANTERIOR', 'SALARIO ANTERIOR']);
  const SAL_NOVO    = col(['SALÁRIO NOVO', 'SALARIO NOVO']);
  const DIFF        = col(['DIFERENÇA DE SALÁRIO', 'DIFERENCA DE SALARIO']);
  const PCT         = col(['Percentual de Aumento', 'PERCENTUAL DE AUMENTO']);
  const EMAIL_HEAD  = col(['E-MAIL HEAD', 'EMAIL HEAD']);
  const EMAIL_CLEVEL = col(['E-MAIL C-LEVEL', 'EMAIL C-LEVEL']);

  console.log('[Parser Alterações] Headers:', headers.length, '| EMAIL col:', EMAIL, '| DATA col:', DATA);

  return rows
    .map((r) => ({
      email_colaborador: (r[EMAIL] ?? '').toLowerCase().trim(),
      matricula:         r[MATRICULA] ? String(r[MATRICULA]).replace(/\.0$/, '').trim() : '',
      colaborador:       r[COLABORADOR] ?? '',
      empresa:           r[EMPRESA] ?? '',
      departamento:      r[DEPTO] ?? '',
      a_partir_de:       r[DATA] ?? '',
      motivo:            r[MOTIVO] ?? '',
      cargo_anterior:    r[CARGO_ANT] ?? '',
      novo_cargo:        r[NOVO_CARGO] ?? '',
      salario_anterior:  parseSalario(r[SAL_ANT]),
      salario_novo:      parseSalario(r[SAL_NOVO]),
      diferenca_salario: parseSalario(r[DIFF]),
      percentual_aumento: r[PCT] ?? '',
      email_head:        (r[EMAIL_HEAD] ?? '').toLowerCase().trim(),
      email_clevel:      (r[EMAIL_CLEVEL] ?? '').toLowerCase().trim(),
    }))
    .filter((r) => r.email_colaborador || r.matricula);
}

// ── Parser do Cadastro VIVO/Telefônica ────────────────────────────────────────
// Fonte: Base_de_Dados_Almeida_Cadastro_VIVO.csv (997 linhas, 8 colunas)
// Contém matrículas NTT e SAP para colaboradores alocados na conta Telefônica
export interface ParsedCadastroVivo {
  status: string;
  matricula_ntt: string;
  matricula_sap: string;
  nome: string;
  tipo_contratacao: string;
  data_admissao: string;
  politica: string;
  email_telefonica: string;
}

export function parseCadastroVivo(text: string): ParsedCadastroVivo[] {
  const { headers, rows } = autoParseSheet(text);
  const col = (candidates: string[]) => findCol(headers, candidates);

  const STATUS      = col(['STATUS']);
  const MAT_NTT     = col(['MATRÍCULA NTT', 'MATRICULA NTT']);
  const MAT_SAP     = col(['MATRÍCULA SAP', 'MATRICULA SAP']);
  const NOME        = col(['NOME']);
  const TIPO_CONT   = col(['TIPO DE CONTRATAÇÃO', 'TIPO DE CONTRATACAO']);
  const DATA_ADM    = col(['DATA DE ADMISSÃO', 'DATA DE ADMISSAO']);
  const POLITICA    = col(['POLÍTICA', 'POLITICA']);
  const EMAIL_TEL   = col(['E-MAIL TELEFONICA', 'EMAIL TELEFONICA']);

  return rows
    .filter((r) => {
      const s = (r[STATUS] ?? '').toUpperCase().trim();
      return s === 'ATIVO' || s === '';
    })
    .map((r) => ({
      status:          (r[STATUS] ?? '').toUpperCase().trim(),
      matricula_ntt:   r[MAT_NTT] ? String(r[MAT_NTT]).replace(/\.0$/, '').trim() : '',
      matricula_sap:   r[MAT_SAP] ?? '',
      nome:            r[NOME] ?? '',
      tipo_contratacao: r[TIPO_CONT] ?? '',
      data_admissao:   r[DATA_ADM] ?? '',
      politica:        r[POLITICA] ?? '',
      email_telefonica: (r[EMAIL_TEL] ?? '').toLowerCase().trim(),
    }))
    .filter((r) => r.nome || r.matricula_sap);
}

// ── Parser de Headcount Mensal ─────────────────────────────────────────────────
// Fonte: Base_de_Dados_Almeida_Head_Count.csv (2 linhas: Head Count e Estagiários)
export interface ParsedHeadcount {
  categoria: string;
  meses: Record<string, number | null>;
}

export function parseHeadcount(text: string): ParsedHeadcount[] {
  const { headers, rows } = autoParseSheet(text);
  // Primeira coluna é o nome da categoria (Unnamed: 0 / Head Count / Estagiários)
  const labelCol = headers[0] ?? '';
  const mesesCols = headers.slice(1);

  return rows
    .filter((r) => r[labelCol]?.trim())
    .map((r) => {
      const meses: Record<string, number | null> = {};
      mesesCols.forEach((m) => {
        const raw = r[m] ?? '';
        const n = parseFloat(raw);
        meses[m] = raw === '' || raw.toLowerCase() === 'nan' ? null : (isNaN(n) ? null : n);
      });
      return { categoria: r[labelCol].trim(), meses };
    });
}

// ── Parser de Hierarquia de Gestores (Página6) ──────────────────────────────
// Fonte: Base_de_Dados_Almeida_Página6.csv (20 linhas)
export interface ParsedHierarquia {
  gerente_senior: string;
  gerente: string;
}

export function parseHierarquia(text: string): ParsedHierarquia[] {
  const { headers, rows } = autoParseSheet(text);
  const col = (candidates: string[]) => findCol(headers, candidates);

  const GER_SR = col(['GERENTE SÊNIOR', 'GERENTE SENIOR']);
  const GER    = col(['GERENTE']);

  return rows
    .filter((r) => r[GER_SR]?.trim())
    .map((r) => ({
      gerente_senior: r[GER_SR]?.trim() ?? '',
      gerente:        r[GER]?.trim() ?? '',
    }));
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}
