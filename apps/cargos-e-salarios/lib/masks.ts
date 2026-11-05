/**
 * Presentation masks used by the form primitives.
 *
 * Masks format what the user sees; they do not validate CPF, CNPJ, dates, or
 * card numbers. Apply `applyInputMask(value, format)` in the field's own
 * `onChange` — the `Input` primitive is a thin wrapper and carries no `format`
 * prop. When an API or storage layer needs a canonical numeric string,
 * normalize it explicitly with `digitsOnly(event.target.value)`.
 */

export type InputFormat =
  | 'cpf'
  | 'cnpj'
  | 'phone'
  | 'cep'
  | 'date'
  | 'digits'
  | 'creditCard'
  | 'percentage';

type MaskValue = string | number | null | undefined;

export function digitsOnly(value: MaskValue): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function maskCPF(value: MaskValue): string {
  return digitsOnly(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(value: MaskValue): string {
  return digitsOnly(value)
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/** Formats both ten-digit landlines and eleven-digit Brazilian mobile phones. */
export function maskPhone(value: MaskValue): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;

  const areaCode = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  const prefixLength = subscriber.length > 8 ? 5 : 4;
  const prefix = subscriber.slice(0, prefixLength);
  const suffix = subscriber.slice(prefixLength);
  return `(${areaCode}) ${prefix}${suffix ? `-${suffix}` : ''}`;
}

export const maskPhoneBR = maskPhone;

export function maskCEP(value: MaskValue): string {
  return digitsOnly(value).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskDate(value: MaskValue): string {
  return digitsOnly(value)
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2');
}

export function maskDigits(value: MaskValue): string {
  return digitsOnly(value);
}

export function maskCreditCard(value: MaskValue): string {
  return digitsOnly(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** BR percentage input with an optional comma and at most two decimal places. */
export function maskPercentage(value: MaskValue): string {
  const source = String(value ?? '').replace(/\./g, ',').replace(/[^\d,]/g, '');
  if (!source) return '';

  const separator = source.indexOf(',');
  const integer = digitsOnly(separator >= 0 ? source.slice(0, separator) : source) || '0';
  if (separator < 0) return `${integer}%`;

  const decimal = digitsOnly(source.slice(separator + 1)).slice(0, 2);
  return `${integer},${decimal}%`;
}

/** Cents-based decimal formatter used by CurrencyInput. */
export function maskCurrency(value: MaskValue, locale = 'pt-BR'): string {
  const digits = digitsOnly(value);
  if (!digits) return '';
  return formatCurrency(Number(digits) / 100, locale);
}

export function formatNumber(
  value: number,
  locale = 'pt-BR',
  options: Intl.NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat(locale, options).format(value);
}

/** Formats only the decimal amount; currency symbols belong outside the input. */
export function formatCurrency(value: number, locale = 'pt-BR'): string {
  return formatNumber(value, locale, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a civil/date-only value. Business timestamps must use
 * `seiva.format.date*`, which applies the workspace timezone.
 */
export function formatDate(
  value: Date | string | number,
  locale = 'pt-BR',
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  let date: Date;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = value instanceof Date ? value : new Date(value);
  }
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export const inputMasks: Record<InputFormat, (value: MaskValue) => string> = {
  cpf: maskCPF,
  cnpj: maskCNPJ,
  phone: maskPhone,
  cep: maskCEP,
  date: maskDate,
  digits: maskDigits,
  creditCard: maskCreditCard,
  percentage: maskPercentage,
};

export function applyInputMask(value: MaskValue, format?: InputFormat): string {
  return format ? inputMasks[format](value) : String(value ?? '');
}
