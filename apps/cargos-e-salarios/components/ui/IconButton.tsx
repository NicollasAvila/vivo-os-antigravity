import React from 'react';
import Tooltip, { type TooltipPlacement } from './Tooltip';

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: React.ReactNode;
  /** Nome da ação: vira `aria-label` E o tooltip. Obrigatório — ícone sozinho não se explica. */
  label: string;
  variant?: 'ghost' | 'secondary' | 'primary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Mantém o estado "pressionado" (menu aberto, filtro aplicado). */
  active?: boolean;
  /** Desliga o tooltip quando o contexto já explica a ação (ex.: dentro de um Menu aberto). */
  tooltip?: boolean;
  placement?: TooltipPlacement;
}

// Padrão do Fazello: ícone discreto que só ganha contraste no hover.
const variants: Record<NonNullable<IconButtonProps['variant']>, { rest: string; active: string }> = {
  ghost: {
    rest: 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
    active: 'bg-gray-100 text-gray-700',
  },
  secondary: {
    rest: 'bg-white text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:text-gray-700',
    active: 'bg-gray-50 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300',
  },
  primary: {
    rest: 'text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-700)]',
    active: 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]',
  },
  danger: {
    rest: 'text-gray-400 hover:text-red-600 hover:bg-red-50',
    active: 'bg-red-50 text-red-600',
  },
};

const sizes: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 p-1 [&>svg]:size-4',
  md: 'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 p-1.5 [&>svg]:size-5',
  lg: 'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 p-2 [&>svg]:size-5',
};

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'ghost', size = 'md', active = false, tooltip = true, placement = 'top', className = '', type = 'button', disabled, ...props },
  ref,
) {
  const tone = variants[variant];
  const button = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={active || undefined}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center rounded-md cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${sizes[size]} ${active ? tone.active : tone.rest} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );

  // Keep the button node mounted when a menu toggles its tooltip; otherwise
  // restoring focus targets a DOM node that React immediately replaces.
  return <Tooltip content={label} placement={placement} disabled={!tooltip || disabled}>{button}</Tooltip>;
});

export default IconButton;
