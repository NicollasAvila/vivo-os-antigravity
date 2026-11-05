import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Dropdown from './Dropdown';
import { t } from '../../lib/i18n';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

/**
 * Compact pager shared by list-style screens.
 * Always shows the "X–Y of Z" counter so partial lists are explicit.
 */
export default function Pagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [25, 50, 100],
  onPageChange,
  onPageSizeChange,
  className = '',
}: PaginationProps) {
  const safeTotal = Math.max(0, total || 0);
  const pages = Math.max(1, Math.ceil(safeTotal / Math.max(1, pageSize)));
  const current = Math.min(Math.max(1, page), pages);
  const from = safeTotal === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(safeTotal, current * pageSize);

  const btn =
    'inline-flex items-center justify-center gap-1 h-11 md:h-9 px-3 rounded-md text-sm font-medium text-gray-700 bg-white ring-1 ring-inset ring-gray-300 cursor-pointer transition-all duration-150 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>{t('pagination.range', { from, to, total: safeTotal })}</span>
        {onPageSizeChange && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-gray-500">{t('pagination.per_page')}</span>
            <div className="w-[92px]">
              <Dropdown
                size="sm"
                ariaLabel={t('pagination.per_page')}
                value={String(pageSize)}
                onChange={(next) => onPageSizeChange(Number(next))}
                options={pageSizeOptions.map((opt) => ({ value: String(opt), label: String(opt) }))}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-sm text-gray-500">
          {t('pagination.page_of', { page: current, pages })}
        </span>
        <button
          type="button"
          aria-label={t('pagination.previous')}
          className={btn}
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{t('pagination.previous')}</span>
        </button>
        <button
          type="button"
          aria-label={t('pagination.next')}
          className={btn}
          disabled={current >= pages}
          onClick={() => onPageChange(current + 1)}
        >
          <span className="hidden sm:inline">{t('pagination.next')}</span>
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
