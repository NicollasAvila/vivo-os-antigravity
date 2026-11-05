import React, { useId } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function Textarea({ label, error, helperText, id, className = '', rows = 3, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id || generatedId;
  const descriptionId = `${textareaId}-description`;

  return (
    <div className="field w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-sm/6 font-medium text-gray-900">{label}</label>
      )}
      <div className={label ? 'mt-2' : ''}>
        <textarea
          id={textareaId}
          rows={rows}
          className={`block w-full rounded-lg bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 ${error ? 'outline-red-300 focus:outline-red-600' : 'outline-gray-300 focus:outline-[var(--color-primary-600)]'} placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 sm:text-sm/6 ${className}`}
          {...props}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={[props['aria-describedby'], (error || helperText) ? descriptionId : undefined].filter(Boolean).join(' ') || undefined}
        />
      </div>
      {error && <p id={descriptionId} className="mt-2 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p id={descriptionId} className="mt-1.5 text-xs/5 text-gray-500">{helperText}</p>}
    </div>
  );
}
