import React from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useToastHost } from '../../hooks/useToast';
import { useI18n } from '../../lib/i18n';

// Visual do Fazello (fundo branco, anel na cor primária). O que o scaffold
// acrescenta é invisível: região viva para leitor de tela e rótulo i18n no fechar.
const styles: Record<string, string> = {
  success: 'bg-white ring-1 ring-inset ring-[var(--color-primary-200)] text-gray-900',
  error: 'bg-white ring-1 ring-inset ring-red-200 text-gray-900',
  info: 'bg-white ring-1 ring-inset ring-gray-200 text-gray-900',
};

const icons: Record<string, React.ReactNode> = {
  success: <CheckCircleIcon className="w-5 h-5 text-[var(--color-primary-600)]" aria-hidden="true" />,
  error: <ExclamationCircleIcon className="w-5 h-5 text-red-600" aria-hidden="true" />,
  info: <InformationCircleIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />,
};

export default function ToastHost() {
  const { t } = useI18n();
  const { toasts, remove } = useToastHost();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
          className={`animate-slide-up flex items-start gap-2.5 rounded-lg shadow-lg px-4 py-3 ${styles[toast.type]}`}
        >
          {icons[toast.type]}
          <p className="flex-1 text-sm">{toast.message}</p>
          <button
            type="button"
            onClick={() => remove(toast.id)}
            aria-label={t('action.close')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
