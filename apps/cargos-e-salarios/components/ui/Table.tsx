import React from 'react';
import { useI18n } from '../../lib/i18n';

// Contrato e visual do Fazello. O que o scaffold acrescenta, de propósito:
// a linha clicável é alcançável e acionável pelo teclado (Tab + Enter/Espaço),
// o menu de contexto abre com Shift+F10/ContextMenu, um controle interno da
// linha (botão, link, checkbox) não dispara o clique da linha, e a mensagem
// de vazio vem do i18n.
interface Column<T> {
  key: string;
  /** Plain text or an interactive node (e.g. a sortable header button). */
  label: React.ReactNode;
  render?: (value: any, row: T) => React.ReactNode;
  /** Vale no cabeçalho E na célula: visibilidade (`hidden md:table-cell`), largura, alinhamento. */
  className?: string;
  /** Só no cabeçalho. */
  headerClassName?: string;
  /**
   * Só na célula. Cor e tamanho de texto entram AQUI, não em `className`: a
   * célula já tem `text-sm text-gray-500`, e duas utilities da mesma
   * propriedade disputam pela ordem do CSS gerado, não pela ordem do atributo.
   */
  cellClassName?: string;
  /** Coluna de número: alinha à direita e usa `tabular-nums`, nos dois lugares. */
  numeric?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  /** Right-click on a row — used by the quick actions menu. */
  onRowContextMenu?: (row: T, event: React.MouseEvent) => void;
  emptyMessage?: string;
}

const interactiveSelector = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="checkbox"]',
  '[role="switch"]',
].join(',');

function cameFromInteractiveChild(event: React.SyntheticEvent<HTMLTableRowElement>): boolean {
  const target = event.target;
  if (!(target instanceof Element) || target === event.currentTarget) return false;
  if (!event.currentTarget.contains(target)) return true;
  const interactive = target.closest(interactiveSelector);
  return Boolean(interactive && interactive !== event.currentTarget && event.currentTarget.contains(interactive));
}

function openContextMenuFromKeyboard(event: React.KeyboardEvent<HTMLTableRowElement>): void {
  const row = event.currentTarget;
  const bounds = row.getBoundingClientRect();
  row.dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: bounds.left + Math.min(24, bounds.width / 2),
    clientY: bounds.top + bounds.height / 2,
  }));
}

/**
 * O alinhamento da coluna, para cabeçalho e célula usarem o mesmo.
 * `numeric` é o atalho declarativo: número alinha à direita, sempre.
 *
 * Só um `text-*` SEM prefixo de breakpoint conta: `md:text-right` é
 * responsivo e continua valendo pelo `className` — extraí-lo aqui o tornaria
 * incondicional em todos os tamanhos.
 */
function alinhamentoDe(col: { className?: string; numeric?: boolean }): string {
  const m = /(^|\s)text-(right|center|left)(?=\s|$)/.exec(col.className || '');
  if (m) return `text-${m[2]}`;
  return col.numeric ? 'text-right' : 'text-left';
}

/** `tabular-nums` mantém a coluna de números com dígitos alinhados. */
function classesNumericas(col: { numeric?: boolean }): string {
  return col.numeric ? 'tabular-nums' : '';
}

export default function Table<T extends Record<string, any>>({ columns, data, onRowClick, onRowContextMenu, emptyMessage }: TableProps<T>) {
  const { t } = useI18n();

  if (data.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-gray-500">{emptyMessage ?? t('common.no_data')}</div>
    );
  }

  const focusable = Boolean(onRowClick || onRowContextMenu);

  const handleKeyDown = (row: T) => (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (cameFromInteractiveChild(event)) return;
    const activates = event.key === 'Enter' || event.key === ' ';
    const opensMenu = event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10');

    if (activates && onRowClick) {
      event.preventDefault();
      onRowClick(row);
    } else if ((opensMenu || (activates && !onRowClick)) && onRowContextMenu) {
      event.preventDefault();
      openContextMenuFromKeyboard(event);
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg outline outline-1 -outline-offset-1 outline-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            {columns.map((col) => (
              // O alinhamento sai do `className` da coluna: deixar `text-left`
              // fixo aqui e concatenar `text-right` depois punha duas classes
              // de mesma especificidade brigando, e quem vencia dependia da
              // ordem do CSS gerado — o cabeçalho saía de um lado e o dado do
              // outro, sem nada no código dizendo por quê.
              <th key={col.key} scope="col" className={`px-3 py-3.5 ${alinhamentoDe(col)} ${classesNumericas(col)} text-sm font-semibold text-gray-900 ${col.className || ''} ${col.headerClassName || ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, i) => (
            <tr
              key={(row as any).id || i}
              tabIndex={focusable ? 0 : undefined}
              aria-haspopup={!onRowClick && onRowContextMenu ? 'menu' : undefined}
              onClick={onRowClick ? (event) => {
                if (!cameFromInteractiveChild(event)) onRowClick(row);
              } : undefined}
              onContextMenu={onRowContextMenu ? (event) => {
                if (!cameFromInteractiveChild(event)) onRowContextMenu(row, event);
              } : undefined}
              onKeyDown={focusable ? handleKeyDown(row) : undefined}
              className={`transition-colors duration-75 hover:bg-gray-50 ${onRowClick
                ? 'cursor-pointer focus-visible:bg-gray-50'
                : onRowContextMenu
                  ? 'cursor-context-menu focus-visible:bg-gray-50'
                  : ''}`}
            >
              {columns.map((col) => (
                // A célula PRECISA receber o `className` da coluna: sem isto,
                // `className: 'text-right'` alinhava só o cabeçalho e o número
                // ficava à esquerda — a coluna inteira desencontrada.
                <td key={col.key} className={`px-3 py-4 text-sm text-gray-500 whitespace-nowrap ${alinhamentoDe(col)} ${classesNumericas(col)} ${col.className || ''} ${col.cellClassName || ''}`}>
                  {col.render ? col.render((row as any)[col.key], row) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
