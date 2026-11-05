import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, actions, className = '' }: PageHeaderProps) {
  return (
    <header className={`mb-6 flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 md:text-2xl">{title}</h1>
        {subtitle !== null && subtitle !== undefined && <div className="mt-1 text-sm/6 text-gray-500">{subtitle}</div>}
      </div>
      {actions !== null && actions !== undefined && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}
