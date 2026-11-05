import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  footer?: React.ReactNode;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  bodyClassName?: string;
  onClick?: () => void;
}

const paddings: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({ children, title, footer, hoverable, padding = 'md', className = '', bodyClassName = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-gray-200 ${hoverable ? 'hover:outline-gray-300 transition-all duration-150 cursor-pointer' : ''} ${className}`}
    >
      {title && (
        <div className="px-6 py-4 border-b border-gray-900/5 bg-gray-50">
          <h3 className="text-sm/6 font-medium text-gray-900">{title}</h3>
        </div>
      )}
      <div className={`${paddings[padding]} ${bodyClassName}`}>{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-900/5 bg-gray-50 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  );
}
