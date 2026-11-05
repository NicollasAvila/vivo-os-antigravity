import React, { useState, useCallback } from 'react';

interface CurrencyInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  value?: number;
  onChange?: (value: number) => void;
  symbol?: string;
  locale?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function formatDecimal(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function CurrencyInput({
  label,
  error,
  helperText,
  value = 0,
  onChange,
  symbol = 'R$',
  locale = 'pt-BR',
  placeholder = '0,00',
  disabled,
  className = '',
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(value ? formatDecimal(value, locale) : '');
  const [focused, setFocused] = useState(false);

  const inputId = label ? label.toLowerCase().replace(/\s+/g, '-') : undefined;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw) / 100;
    setDisplay(raw ? formatDecimal(num, locale) : '');
    onChange?.(num);
  }, [locale, onChange]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    if (value) setDisplay(String(value));
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (value) setDisplay(formatDecimal(value, locale));
    else setDisplay('');
  }, [value, locale]);

  return (
    <div className="field w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm/6 font-medium text-gray-900">{label}</label>
      )}
      <div className={`relative ${label ? 'mt-2' : ''}`}>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{symbol}</span>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          placeholder={placeholder}
          value={display}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`block w-full rounded-md bg-white pl-9 pr-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 ${error ? 'outline-red-300 focus:outline-red-600' : 'outline-gray-300 focus:outline-[var(--color-primary-600)]'} placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:outline-gray-200 sm:text-sm/6 ${className}`}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs/5 text-gray-500">{helperText}</p>}
    </div>
  );
}
