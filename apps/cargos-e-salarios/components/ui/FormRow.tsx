import React from 'react';

interface FormRowProps {
  /** Colunas em telas ≥ 640px. No celular a linha vira uma coluna só. */
  cols?: 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

const COLS: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

/**
 * UMA linha de campos de formulário.
 *
 * Os campos irmãos compartilham as três faixas — rótulo, controle e
 * instrução —, então a caixa de digitar fica alinhada com a do vizinho mesmo
 * quando um rótulo quebra em duas linhas. Isso acontece ao traduzir a tela:
 * o rótulo que cabe numa linha em português ocupa duas em espanhol, e sem o
 * alinhamento compartilhado só aquela caixa desce.
 *
 * Use uma FormRow POR LINHA. Seis campos em duas colunas são três FormRow,
 * não uma — a regra `.form-row` (styles.css) declara exatamente três faixas.
 */
export default function FormRow({ cols = 2, children, className = '' }: FormRowProps) {
  return (
    <div className={`form-row form-row--${cols} grid grid-cols-1 gap-x-4 gap-y-3 ${COLS[cols]} ${className}`}>
      {children}
    </div>
  );
}
