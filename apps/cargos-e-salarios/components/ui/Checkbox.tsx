import React from 'react';

interface CheckboxProps {
  label?: string;
  description?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export default function Checkbox({ label, description, checked, onChange, disabled, id, name }: CheckboxProps) {
  const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex gap-3">
      <div className="flex h-6 shrink-0 items-center">
        <div className="group grid size-4 grid-cols-1">
          <input
            id={checkboxId}
            name={name}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
            aria-describedby={description ? `${checkboxId}-description` : undefined}
            className="col-start-1 row-start-1 appearance-none rounded border border-gray-300 bg-white checked:border-[var(--color-primary-600)] checked:bg-[var(--color-primary-600)] indeterminate:border-[var(--color-primary-600)] indeterminate:bg-[var(--color-primary-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-600)] disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
          />
          <svg
            fill="none"
            viewBox="0 0 14 14"
            className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-gray-950/25"
          >
            <path
              d="M3 8L6 11L11 3.5"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-0 group-has-[:checked]:opacity-100"
            />
            <path
              d="M3 7H11"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-0 group-has-[:indeterminate]:opacity-100"
            />
          </svg>
        </div>
      </div>
      {(label || description) && (
        <div className="text-sm/6">
          {label && <label htmlFor={checkboxId} className="font-medium text-gray-900">{label}</label>}
          {description && <p id={`${checkboxId}-description`} className="mt-0.5 text-xs/5 text-gray-500">{description}</p>}
        </div>
      )}
    </div>
  );
}
