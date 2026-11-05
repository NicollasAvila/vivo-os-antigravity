import React from 'react';
import Card from './Card';

interface SectionCardProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Card with a richer header (icon + title + description + optional action) used across the dashboard. */
export default function SectionCard({
  icon, title, description, action, children, className = '', bodyClassName = 'p-4 md:p-5',
}: SectionCardProps) {
  return (
    <Card padding="none" className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span className="w-9 h-9 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
            {description && <p className="text-xs text-gray-500 truncate">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </Card>
  );
}
