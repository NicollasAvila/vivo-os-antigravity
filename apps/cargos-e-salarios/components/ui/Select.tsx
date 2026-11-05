import React, { useId, useMemo, useState } from 'react';
import Dropdown, { type DropdownOption, type DropdownSize } from './Dropdown';

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  color?: string;
  disabled?: boolean;
}

interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'defaultValue' | 'children' | 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  children?: React.ReactNode;
  value?: string | number;
  defaultValue?: string | number;
  /** Entrega o VALOR selecionado direto (string) — igual ao Dropdown.
   *  Use `onChange={(v) => setCampo(v)}`. NUNCA `e.target.value` aqui.
   *
   *  ÚNICA divergência deliberada em relação ao Fazello, que mantém o shape
   *  de evento (`{ target: { value } }`) por causa das telas legadas dele.
   *  No scaffold o shape de evento já causou incidente: o objeto inteiro foi
   *  persistido como dado (dropdown vazio, registro sumido da tela). */
  onChange?: (value: string) => void;
  /** Highlights the control to signal an applied value (used by filter bars). */
  active?: boolean;
  placeholder?: string;
  controlSize?: DropdownSize;
  /** Search box appears when the list has AT LEAST this many options. */
  searchThreshold?: number;
  /** Options visible at once before the list scrolls internally. */
  maxVisible?: number;
}

/** Reads legacy `<option>` / `<optgroup>` children into the option list. */
function optionsFromChildren(children: React.ReactNode): SelectOption[] {
  const out: SelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as any;
    if (child.type === 'optgroup') {
      out.push(...optionsFromChildren(props?.children));
      return;
    }
    if (child.type !== 'option') return;
    const raw = props?.children;
    const label = typeof raw === 'string' || typeof raw === 'number'
      ? String(raw)
      : Array.isArray(raw)
        ? raw.filter((part) => typeof part === 'string' || typeof part === 'number').join('')
        : String(props?.value ?? '');
    out.push({ value: String(props?.value ?? ''), label, disabled: !!props?.disabled });
  });
  return out;
}

/**
 * Form select. Renders the app's own HTML listbox (no native browser popup),
 * with internal search for long lists — the public props stay the same.
 */
export default function Select({
  label,
  error,
  helperText,
  options,
  children,
  active = false,
  placeholder,
  controlSize = 'md',
  searchThreshold,
  maxVisible,
  value,
  defaultValue,
  onChange,
  disabled,
  id,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: SelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const descriptionId = `${selectId}-description`;
  const [internal, setInternal] = useState<string>(String(defaultValue ?? ''));
  const controlled = value !== undefined;
  const current = controlled ? String(value ?? '') : internal;

  const list: DropdownOption[] = useMemo(
    () => (options && options.length > 0 ? options : optionsFromChildren(children)),
    [options, children],
  );

  const handleChange = (next: string) => {
    if (!controlled) setInternal(next);
    onChange?.(next);
  };

  return (
    <div className="field w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm/6 font-medium text-gray-900">{label}</label>
      )}
      <div className={label ? 'mt-2' : ''}>
        <Dropdown
          id={selectId}
          value={current}
          options={list}
          onChange={handleChange}
          disabled={disabled}
          active={active}
          invalid={!!error}
          size={controlSize}
          placeholder={placeholder}
          ariaLabel={ariaLabel || label}
          ariaDescribedBy={[ariaDescribedBy, (error || helperText) ? descriptionId : undefined].filter(Boolean).join(' ') || undefined}
          searchThreshold={searchThreshold}
          maxVisible={maxVisible}
          className={className}
        />
      </div>
      {error && <p id={descriptionId} className="mt-2 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p id={descriptionId} className="mt-1.5 text-xs/5 text-gray-500">{helperText}</p>}
    </div>
  );
}
