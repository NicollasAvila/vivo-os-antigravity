
export interface DocumentField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
  instruction?: string;
  options?: string[];
  format?: 'date' | 'month';
  integer?: boolean;
  min?: number;
  max?: number;
}
export interface DocumentProfile {
  id: string;
  title: string;
  instruction: string;
  fields: DocumentField[];
  installments?: boolean;
}
export interface ProposedField {
  key: string;
  value: string | number | boolean;
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
  page?: number;
}
export interface DocumentInstallment {
  date: string;
  principal: number | null;
  interest: number | null;
  total: number | null;
  evidence: string;
}
export interface DocumentProposal {
  fields: ProposedField[];
  installments: DocumentInstallment[];
  warnings: string[];
  fileId?: string;
  filename?: string;
}

function jsonObject(raw: unknown): Record<string, any> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, any>;
  if (typeof raw !== 'string') throw new Error('A leitura não retornou campos estruturados. Tente novamente com um PDF legível.');
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const value = JSON.parse(clean);
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch { /* Show an actionable error, never apply unstructured OCR text. */ }
  throw new Error('Não foi possível organizar os campos do documento. Nenhum valor foi aplicado ao formulário.');
}

function validDate(value:string, format:'date'|'month'):boolean {
  if (format==='month') return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  if (!/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(value)) return false;
  const date=new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===value;
}

export function parseDocumentProposal(raw: unknown, profile: DocumentProfile): DocumentProposal {
  const parsed = jsonObject(raw);
  const allowed = new Map(profile.fields.map(field => [field.key, field]));
  const fields: ProposedField[] = [];
  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.filter((v: unknown) => typeof v === 'string').slice(0, 20) : [];
  const seen = new Set<string>();
  for (const candidate of Array.isArray(parsed.fields) ? parsed.fields : []) {
    const spec = allowed.get(candidate?.key);
    if (!spec || seen.has(spec.key) || candidate.value === null || candidate.value === undefined) continue;
    const value = candidate.value;
    const valid = typeof value === spec.type &&
      (spec.type !== 'number' || (Number.isFinite(value) && (spec.min === undefined || value >= spec.min) && (spec.max === undefined || value <= spec.max))) &&
      (!spec.integer || Number.isInteger(value)) &&
      (!spec.options || spec.options.includes(String(value))) &&
      (!spec.format || validDate(String(value), spec.format));
    if (!valid) { warnings.push(`${spec.label}: o valor extraído precisa de preenchimento manual.`); continue; }
    seen.add(spec.key);
    fields.push({
      key: spec.key, value: typeof value === 'string' ? value.slice(0, 4000) : value,
      confidence: ['high','medium','low'].includes(candidate.confidence) ? candidate.confidence : 'low',
      evidence: typeof candidate.evidence === 'string' ? candidate.evidence.slice(0, 800) : '',
      page: Number.isInteger(candidate.page) && candidate.page > 0 ? candidate.page : undefined,
    });
  }
  const money = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  const installments: DocumentInstallment[] = [];
  for (const row of profile.installments && Array.isArray(parsed.installments) ? parsed.installments.slice(0, 600) : []) {
    if (!row || typeof row.date !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(row.date)) continue;
    const date = new Date(`${row.date}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== row.date) continue;
    installments.push({ date:row.date, principal:money(row.principal), interest:money(row.interest), total:money(row.total), evidence:typeof row.evidence === 'string' ? row.evidence.slice(0, 800) : '' });
  }
  return { fields, installments:installments.sort((a,b)=>a.date.localeCompare(b.date)), warnings };
}

export function installmentIssues(rows: DocumentInstallment[]): string[] {
  const issues: string[] = [];
  const dates = new Set<string>();
  rows.forEach((row, i) => {
    if (!validDate(row.date,'date')) issues.push(`Parcela ${i + 1}: vencimento inválido.`);
    if (![row.principal,row.interest,row.total].every(v=>v===null || (typeof v==='number' && Number.isFinite(v) && v>=0))) issues.push(`Parcela ${i + 1}: valores inválidos.`);
    if (dates.has(row.date)) issues.push(`Parcela ${i + 1}: vencimento repetido; confira se há duplicidade.`);
    dates.add(row.date);
    if (row.principal === null || row.interest === null || row.total === null) issues.push(`Parcela ${i + 1}: faltam amortização, juros ou total.`);
    else if (Math.abs(row.principal + row.interest - row.total) > 0.02) issues.push(`Parcela ${i + 1}: amortização e juros não conferem com o total; confira encargos e tarifas.`);
  });
  return issues;
}

