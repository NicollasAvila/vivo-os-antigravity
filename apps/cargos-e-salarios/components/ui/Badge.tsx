import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

const variants: Record<string, string> = {
  green: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
  red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10',
  yellow: 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20',
  blue: 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] ring-1 ring-inset ring-[var(--color-primary-200)]',
  gray: 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10',
};

const badgeSizes: Record<string, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-xs',
};

export default function Badge({ children, variant = 'gray', size = 'sm', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-md font-medium ${variants[variant]} ${badgeSizes[size]} ${className}`}>
      {children}
    </span>
  );
}
