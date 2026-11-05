// ============================================================================
// RBAC — Controle de Acesso Baseado em Perfis
// Define perfil do usuário e filtra colaboradores visíveis
// ============================================================================

import { db } from '../lib/seiva';

export type Perfil = 'diretor' | 'gerente' | 'colaborador';

export interface Colaborador {
  id: string;
  // Índice genérico — todos os campos do Excel chegam como strings com seus nomes originais
  [key: string]: any;
}

export interface AlteracaoSalarial {
  id: string;
  email_colaborador: string;
  a_partir_de: string;
  motivo: string;
  cargo_anterior: string;
  novo_cargo: string;
  salario_anterior: number;
  salario_novo: number;
}

export interface ConfigRBAC {
  id: string;
  email: string;
}

const DIRETOR_KEYWORDS = ['DIRETOR', 'VP', 'C-LEVEL', 'SÓCIO', 'CEO', 'CFO', 'COO', 'CTO', 'CMO', 'CHRO'];
const GERENTE_KEYWORDS = ['GERENTE', 'COORDENADOR', 'SUPERVISOR', 'LEAD'];

// ============================================================================
// Helper universal — busca campo por nome CASE-INSENSITIVE sem acento
// ============================================================================

/** Normaliza chave: minúsculas, sem acento, sem barra, sem parênteses, espaços simples */
function normKey(k: string): string {
  return String(k ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .replace(/[\n\r\t/\\()º°ª.]/g, ' ') // barra, parênteses, grau, ponto → espaço
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca um valor no registro colaborador tentando:
 * 1. Chaves exatas na ordem fornecida
 * 2. Match case-insensitive sem acento contra TODAS as chaves do objeto
 * Retorna string ou '' se não encontrar.
 */
export function colabField(c: Colaborador, ...keys: string[]): string {
  if (!c) return '';
  // 1. Exata
  for (const key of keys) {
    const v = c[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  // 2. Normalizada (ignora acento, case, espaços, quebras)
  const normalized = keys.map(normKey);
  for (const [rk, rv] of Object.entries(c)) {
    if (rv === undefined || rv === null || String(rv).trim() === '') continue;
    if (normalized.includes(normKey(rk))) return String(rv).trim();
  }
  return '';
}

export async function resolvePerfil(emailUsuario: string): Promise<Perfil> {
  if (!emailUsuario) return 'colaborador';

  const emailNorm = emailUsuario.toLowerCase().trim();

  // Verifica whitelist de diretores
  try {
    const whitelist = await db.list<ConfigRBAC>('config_rbac');
    const naWhitelist = whitelist.some(
      (r) => r.email?.toLowerCase().trim() === emailNorm
    );
    if (naWhitelist) return 'diretor';
  } catch {
    // whitelist vazia ou não inicializada — continua
  }

  // Resolve cargo atual do colaborador
  try {
    const todos = await db.list<Colaborador>('colaboradores', { limit: 1000 });
    const eu = todos.find((c) => (c.email || c.email_corporativo || '').toLowerCase().trim() === emailNorm);
    if (eu?.cargo) {
      const cargoUp = eu.cargo.toUpperCase();
      if (DIRETOR_KEYWORDS.some((kw) => cargoUp.includes(kw))) return 'diretor';
      if (GERENTE_KEYWORDS.some((kw) => cargoUp.includes(kw))) return 'gerente';
    }
  } catch {
    // sem dados ainda
  }

  return 'colaborador';
}

// ── Helpers canônicos ──────────────────────────────────────────────────────

/** E-mail principal do colaborador */
export function colabEmail(c: Colaborador): string {
  return colabField(c,
    'email', 'EMAIL IPNET', 'E-MAIL IPNET',
    'EMAIL COLABORADOR', 'E-MAIL COLABORADOR',
    'email_corporativo', 'E-MAIL', 'EMAIL',
    'E-MAIL IPNET', 'EMAIL IPNET',
  ).toLowerCase();
}

/** Nome completo */
export function colabNome(c: Colaborador): string {
  return colabField(c, 'nome', 'NOME COMPLETO', 'NOME', 'nome_completo', 'NAME', 'COLABORADOR');
}

/** Matrícula (remove sufixo .0 de floats Python) */
export function colabMatricula(c: Colaborador): string {
  return colabField(c,
    'matricula', 'MATRICULA', 'MATRÍCULA',
    'MATRICULA IPNET', 'MATRÍCULA IPNET',
    'NUMERO MATRICULA', 'NÚMERO MATRÍCULA',
    'MATRÍCULA NTT (5)', 'MATRICULA NTT (5)',
    'NTT', 'ID', 'COD', 'CÓDIGO',
  ).replace(/\.0+$/, '');
}

/** Salário numérico */
export function colabSalario(c: Colaborador): number {
  const raw = colabField(c,
    'salario', 'Salário', 'SALARIO', 'SALÁRIO',
    'SALARIO BRUTO', 'SALÁRIO BRUTO', 'salario_bruto',
    'SAL', 'REMUNERAÇÃO', 'REMUNERACAO',
    'SALÁRIO BASE', 'SALARIO BASE',
    'SALÁRIO ATUAL', 'SALARIO ATUAL',
    'SALÁRIO MENSAL', 'SALARIO MENSAL',
    'REMUNERACAO ATUAL', 'REMUNERAÇÃO ATUAL',
  );
  // Trata string literal "NULL" ou "None" que vem do Python como vazio
  if (!raw || raw.toUpperCase() === 'NULL' || raw.toUpperCase() === 'NONE') return 0;
  return parseSalario(raw);
}

/** Nível de senioridade */
export function colabSenioridade(c: Colaborador): string {
  return colabField(c,
    // Nomes exatos da planilha Colaboradores v2
    'NÍVEL DE SENIORIDADE', 'NIVEL DE SENIORIDADE',
    // Variações
    'nivel_senioridade', 'senioridade',
    'NIVEL SENIORIDADE', 'NÍVEL SENIORIDADE',
    'SENIORIDADE', 'SENIORITY',
    'LEVEL', 'NÍVEL', 'NIVEL',
    'SENIORITY LEVEL', 'NIVEL DE MATURIDADE',
    'POLÍTICA', 'POLITICA',
  );
}

/** Data de admissão */
export function colabAdmissao(c: Colaborador): string {
  return colabField(c,
    'admissao',
    'ADMISSÃO CONTRATUAL', 'ADMISSAO CONTRATUAL',
    '1º ADMISSÃO', '1 ADMISSÃO', '1 ADMISSAO',
    'DATA ADMISSAO', 'DATA ADMISSÃO',
    'data_admissao', 'ADMISSÃO', 'ADMISSAO',
    'DT ADMISSAO', 'DT ADMISSÃO',
    'DATA DE ADMISSÃO', 'DATA DE ADMISSAO',
    'DT. ADMISSÃO', 'DT. ADMISSAO',
    'DATA ADMISSÃO CONTRATUAL', 'ADMISSÃO EMPRESA',
  );
}

/** E-mail do coordenador */
export function colabEmailCoord(c: Colaborador): string {
  return colabField(c,
    'email_coord',
    'E-MAIL COORDENADOR/SUPERVISOR', 'EMAIL COORDENADOR/SUPERVISOR',
    'E-MAIL COORDENADOR', 'EMAIL COORDENADOR',
    'email_coordenador',
  ).toLowerCase();
}

/** Área / Departamento */
export function colabArea(c: Colaborador): string {
  return colabField(c,
    // Nomes exatos da planilha
    'ÁREA', 'AREA', 'DEPARTAMENTO',
    // Variações
    'area', 'departamento',
    'DEPTO', 'DEPT', 'SETOR', 'DIVISÃO', 'DIVISAO',
    'UNIDADE', 'GERÊNCIA', 'GERENCIA',
  );
}

/** Cargo */
export function colabCargo(c: Colaborador): string {
  return colabField(c,
    // Nome exato da planilha
    'CARGO',
    // Variações
    'cargo',
    'FUNÇÃO', 'FUNCAO',
    'POSIÇÃO', 'POSICAO', 'TITLE', 'JOB TITLE',
    'CARGO/FUNÇÃO', 'CARGO ATUAL', 'FUNÇÃO ATUAL',
    'CARGO/\nFUNÇÃO', 'CARGO E NÍVEL', 'CARGO/NIVEL',
    'FUNÇÃO/CARGO', 'CARGO FUNÇÃO', 'OCUPAÇÃO', 'ROLE',
  );
}

/** Empresa */
export function colabEmpresa(c: Colaborador): string {
  return colabField(c, 'empresa', 'EMPRESA', 'COMPANY', 'RAZAO SOCIAL', 'RAZÃO SOCIAL');
}

/** Gerente direto */
export function colabGerente(c: Colaborador): string {
  return colabField(c,
    'gerente', 'GERENTE', 'GERENTE DIRETO',
    'GERENTE SÊNIOR', 'GERENTE SENIOR',
    'NOME GERENTE', 'GESTOR', 'LIDER', 'LÍDER',
  );
}

/** Coordenador/Supervisor */
export function colabCoordenador(c: Colaborador): string {
  return colabField(c,
    // Nome exato da planilha (com quebra de linha e barra)
    'COORDENADOR/\nSUPERVISOR',
    'COORDENADOR/SUPERVISOR',
    // Variações
    'coordenador', 'coordenador_supervisor',
    'COORDENADOR', 'SUPERVISOR', 'COORD',
    'COORDENADOR SUPERVISOR',
  );
}

/** E-mail Telefônica — busca campo direto da aba VIVO ou do objeto enriquecido */
export function colabEmailTelefonica(c: Colaborador): string {
  return colabField(c,
    '_email_telefonica',
    'email_telefonica',
    'E-MAIL TELEFONICA', 'E-MAIL TELEFÔNICA',
    'EMAIL TELEFONICA', 'EMAIL TELEFÔNICA',
    'E-MAIL CORP', 'EMAIL CORP',
    'E-MAIL CORPORATIVO', 'EMAIL CORPORATIVO',
    'E-MAIL CORP.', 'E-MAIL\nTELEFÔNICA', 'E-MAIL\nTELEFONICA',
  );
}

/** Matrícula SAP — busca campo direto da aba VIVO ou do objeto enriquecido */
export function colabMatriculaSap(c: Colaborador): string {
  return colabField(c,
    // enriquecido pelo VIVO
    '_matricula_sap',
    // Nome exato da aba Cadastro VIVO: "MATRÍCULA SAP (80)"
    // após normKey: "matricula sap  80 " → normaliza parênteses/espaços
    'MATRÍCULA SAP (80)', 'MATRICULA SAP (80)',
    // Variações
    'matricula_sap',
    'MATRICULA SAP', 'MATRÍCULA SAP',
    'SAP', 'MATRICULA SAP 80', 'MATRÍCULA SAP 80',
  ).replace(/\.0+$/, '');
}

/** Tipo de contratação — busca campo direto do Sheets ou enriquecido com VIVO */
export function colabTipoContratacao(c: Colaborador): string {
  return colabField(c,
    // enriquecido pelo VIVO
    '_tipo_contratacao',
    // Nomes exatos nas abas: "TIPO DE CONTRATACAO" (sem acento) e "TIPO DE CONTRATAÇÃO"
    'TIPO DE CONTRATACAO', 'TIPO DE CONTRATAÇÃO',
    // Nome exato da aba Colaboradores v2: "TIPO DE CONTRATO"
    'TIPO DE CONTRATO',
    // Variações
    'tipo_contrato', 'tipo_contratacao',
    'TIPO CONTRATO', 'CONTRATAÇÃO', 'CONTRATACAO',
    'REGIME', 'VINCULO', 'VÍNCULO', 'CONTRATO',
    'POLÍTICA', 'POLITICA',
  );
}

/** Grau de instrução */
export function colabGrauInstrucao(c: Colaborador): string {
  return colabField(c,
    // Nomes exatos da planilha
    'GRAU DE INSTRUÇÃO', 'GRAU DE INSTRUCAO',
    // Variações
    'grau_instrucao',
    'ESCOLARIDADE', 'GRAU INSTRUCAO', 'GRAU INSTRUÇÃO',
    'INSTRUÇÃO', 'INSTRUCAO', 'FORMAÇÃO', 'FORMACAO',
    'NIVEL ESCOLAR', 'NÍVEL ESCOLAR',
  );
}

/** Sexo / Gênero */
export function colabSexo(c: Colaborador): string {
  return colabField(c, 'sexo', 'SEXO', 'GÊNERO', 'GENERO', 'GENDER', 'SEXO/GÊNERO',
    'SEXO/GENERO', 'GÊNERO/SEXO', 'GENERO/SEXO', 'SEXO\n/GÊNERO',
  );
}

/** Centro de custo */
export function colabCentroCusto(c: Colaborador): string {
  return colabField(c,
    // Nome exato da planilha Colaboradores v2
    'CENTRO DE CUSTO',
    // Variações
    'centro_custo', 'CENTRO CUSTO',
    'CC', 'COST CENTER', 'CENTRO DE CUSTOS',
    'CENTRO DE CUSTO CLOUD',
  );
}

/**
 * Situação / status do colaborador (ATIVO, INATIVO, AFASTADO, etc).
 * Lê o campo SITUAÇÃO do Excel ou equivalentes canônicos.
 */
export function colabSituacao(c: Colaborador): string {
  return colabField(
    c,
    'SITUAÇÃO',
    'SITUACAO',
    'situacao',
    'situação',
    'STATUS',
    'status',
    'Situação',
    'Situacao'
  ).toUpperCase();
}

/**
 * Retorna true quando o colaborador está ativo (situação vazia ou contém ATIVO).
 * Registros sem campo de situação são tratados como ativos.
 */
export function isAtivo(c: Colaborador): boolean {
  const sit = colabSituacao(c);
  if (!sit) return true; // sem campo → considera ativo
  return sit.includes('ATIVO') && !sit.includes('INATIVO');
}

export function filtrarColaboradores(
  todos: Colaborador[],
  emailUsuario: string,
  perfil: Perfil
): Colaborador[] {
  const emailNorm = emailUsuario.toLowerCase().trim();

  if (perfil === 'diretor') return todos;

  if (perfil === 'gerente') {
    const eu = todos.find((c) => colabEmail(c) === emailNorm);
    const meuDept = colabArea(eu as any)?.toLowerCase().trim();
    return todos.filter((c) => {
      if (colabEmail(c) === emailNorm) return true;
      const emailGer = colabField(c, 'E-MAIL GERENTE', 'EMAIL GERENTE', 'email_gerente').toLowerCase().trim();
      if (emailGer === emailNorm) return true;
      if (colabEmailCoord(c) === emailNorm) return true;
      if (meuDept && colabArea(c).toLowerCase().trim() === meuDept) return true;
      return false;
    });
  }

  return todos.filter((c) => colabEmail(c) === emailNorm);
}

export function parseSalario(raw: string | number | null | undefined): number {
  if (raw === undefined || raw === null || raw === '') return 0;
  if (typeof raw === 'string' && (raw.toUpperCase() === 'NULL' || raw.toUpperCase() === 'NONE')) return 0;
  if (typeof raw === 'number') return raw;
  // Remove R$, pontos de milhar, substitui vírgula decimal
  const clean = String(raw)
    .replace(/R\$\s*/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

export function formatSalario(valor: number | null | undefined): string {
  const n = parseSalario(valor as any);
  if (!n && n !== 0) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatData(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}
