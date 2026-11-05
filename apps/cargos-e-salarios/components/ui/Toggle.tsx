import React from 'react';

interface ToggleProps {
  label?: string;
  description?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export default function Toggle({ label, description, checked, onChange, disabled, id, name }: ToggleProps) {
  const toggleId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="group relative inline-flex w-11 shrink-0 rounded-full bg-gray-200 p-0.5 outline-offset-2 outline-[var(--color-primary-600)] ring-1 ring-inset ring-gray-900/5 transition-colors duration-200 ease-in-out has-[:checked]:bg-[var(--color-primary-600)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed">
        <span className="size-5 rounded-full bg-white shadow-sm ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-[:checked]:translate-x-5" />
        <input
          id={toggleId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          aria-label={label || 'Toggle'}
          aria-describedby={description ? `${toggleId}-description` : undefined}
          className="absolute inset-0 size-full appearance-none focus:outline-none"
        />
      </div>
      {(label || description) && (
        <div className="text-sm">
          {label && <label id={`${toggleId}-label`} className="font-medium text-gray-900">{label}</label>}
          {description && (
            <>
              {' '}
              <span id={`${toggleId}-description`} className="text-xs/5 text-gray-500">{description}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
