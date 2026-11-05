import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Defaults to button. Form submission must explicitly use type="submit". */
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

const base = 'inline-flex min-h-11 sm:min-h-0 items-center justify-center font-semibold rounded-lg shadow-sm cursor-pointer transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const variants: Record<string, string> = {
  primary: 'bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] focus-visible:outline-[var(--color-primary-600)]',
  secondary: 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600',
  ghost: 'text-gray-600 shadow-none hover:bg-gray-50',
};

const sizes: Record<string, string> = {
  sm: 'px-2.5 py-1.5 text-sm gap-1.5',
  md: 'px-3 py-2 text-sm gap-1.5',
  lg: 'px-3.5 py-2.5 text-sm gap-2',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg aria-hidden="true" className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
