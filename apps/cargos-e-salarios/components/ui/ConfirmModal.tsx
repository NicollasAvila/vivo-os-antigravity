import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { t } from '../../lib/i18n';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Confirmação padrão para ações destrutivas ou difíceis de desfazer.
 * REGRA: excluir/arquivar/sobrescrever NUNCA acontece direto no clique —
 * sempre passa por aqui, com um `body` que nomeia o item afetado —
 * ex.: uma chave de domínio como `meudominio.delete_confirm_body` com {{name}}.
 */
export default function ConfirmModal({ open, title, body, confirmLabel, danger = true, loading, onConfirm, onClose }: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" dismissible={!loading}>
      <div className="text-sm text-gray-600">{body}</div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>{t('action.cancel')}</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel || t('action.confirm')}
        </Button>
      </div>
    </Modal>
  );
}
