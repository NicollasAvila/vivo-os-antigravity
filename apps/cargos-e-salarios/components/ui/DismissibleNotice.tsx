import React, { useState } from 'react';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Tooltip from './Tooltip';
import { isNoticeDismissed, dismissNotice } from '../../lib/noticePrefs';

interface DismissibleNoticeProps {
  /** Stable id used to remember the dismissal for this person. */
  id: string;
  children: React.ReactNode;
  /** Accessible label for the close button. */
  dismissLabel: string;
  className?: string;
}

/** Informational bar the person can close for good (choice kept on this device). */
export default function DismissibleNotice({ id, children, dismissLabel, className = '' }: DismissibleNoticeProps) {
  const [visible, setVisible] = useState(() => !isNoticeDismissed(id));

  if (!visible) return null;

  const close = () => {
    dismissNotice(id);
    setVisible(false);
  };

  return (
    <div
      role="status"
      className={`flex items-center gap-2.5 rounded-lg bg-[var(--color-primary-50)] px-3 py-2.5 text-sm text-[var(--color-primary-700)] ${className}`}
    >
      <InformationCircleIcon className="w-5 h-5 shrink-0 text-[var(--color-primary-600)]" />
      <div className="min-w-0 flex-1 leading-5">{children}</div>
      <Tooltip content={dismissLabel}>
        <button
          type="button"
          onClick={close}
          aria-label={dismissLabel}
          className="shrink-0 -mr-1 inline-flex h-8 w-8 md:h-7 md:w-7 items-center justify-center rounded-lg text-[var(--color-primary-600)] hover:bg-[var(--color-primary-100)] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </Tooltip>
    </div>
  );
}
