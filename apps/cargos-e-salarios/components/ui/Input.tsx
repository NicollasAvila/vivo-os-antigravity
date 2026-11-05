import React, { useId } from 'react';
import { applyInputMask, type InputFormat } from '../../lib/masks';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Highlights the field to signal an applied value (used by filter bars). */
  active?: boolean;
  /**
   * Máscara dinâmica: formata ENQUANTO a pessoa digita, define o placeholder
   * com o formato esperado e abre o teclado numérico no celular. O `onChange`
   * recebe o valor JÁ mascarado — normalize com `digitsOnly` antes de persistir.
   */
  mask?: InputFormat;
}

/** Placeholder que mostra o formato esperado — nunca repete o label. */
const MASK_PLACEHOLDER: Partial<Record<InputFormat, string>> = {
  cpf: '000.000.000-00',
  cnpj: '00.000.000/0000-00',
  phone: '(00) 00000-0000',
  cep: '00000-000',
  date: 'dd/mm/aaaa',
  creditCard: '0000 0000 0000 0000',
  percentage: '0,00%',
};

const MASK_INPUT_MODE: Partial<Record<InputFormat, React.HTMLAttributes<HTMLInputElement>['inputMode']>> = {
  cpf: 'numeric',
  cnpj: 'numeric',
  phone: 'tel',
  cep: 'numeric',
  date: 'numeric',
  digits: 'numeric',
  creditCard: 'numeric',
  percentage: 'decimal',
};

export default function Input({
  label,
  error,
  helperText,
  active = false,
  mask,
  placeholder,
  inputMode,
  onChange,
  id,
  className = '',
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const descriptionId = `${inputId}-description`;
  const surface = active
    ? 'bg-[var(--color-primary-50)] outline-2 -outline-offset-2 outline-[var(--color-primary-500)]'
    : 'bg-white outline-1 -outline-offset-1 outline-gray-300';

  const handleChange = mask
    ? (event: React.ChangeEvent<HTMLInputElement>) => {
        event.target.value = applyInputMask(event.target.value, mask);
        onChange?.(event);
      }
    : onChange;

  const shared = {
    id: inputId,
    placeholder: placeholder ?? (mask ? MASK_PLACEHOLDER[mask] : undefined),
    inputMode: inputMode ?? (mask ? MASK_INPUT_MODE[mask] : undefined),
    onChange: handleChange,
    ...props,
    'aria-invalid': error ? true : props['aria-invalid'],
    'aria-describedby': [props['aria-describedby'], (error || helperText) ? descriptionId : undefined].filter(Boolean).join(' ') || undefined,
  };

  return (
    <div className="field w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm/6 font-medium text-gray-900">{label}</label>
      )}
      <div className={label ? 'mt-2' : ''}>
        {error ? (
          <div className="grid grid-cols-1">
            <input
              aria-invalid="true"
              className={`col-start-1 row-start-1 block w-full rounded-lg bg-white py-1.5 pl-3 pr-10 text-base text-red-900 outline outline-1 -outline-offset-1 outline-red-300 placeholder:text-red-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-red-600 sm:text-sm/6 ${className}`}
              {...shared}
            />
            <svg className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-red-500 sm:size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5" />
              <path d="M12 16h.01" />
            </svg>
          </div>
        ) : (
          <input
            className={`block w-full rounded-lg px-3 py-1.5 text-base text-gray-900 outline ${surface} placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-[var(--color-primary-600)] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:outline-gray-200 sm:text-sm/6 ${className}`}
            {...shared}
          />
        )}
      </div>
      {error && <p id={descriptionId} className="mt-2 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p id={descriptionId} className="mt-1.5 text-xs/5 text-gray-500">{helperText}</p>}
    </div>
  );
}
