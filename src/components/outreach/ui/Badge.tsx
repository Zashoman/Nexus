import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'teal';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-bt-bg-alt text-bt-text-secondary',
  primary: 'bg-bt-primary-bg text-bt-primary',
  success: 'bg-bt-green-bg text-bt-green',
  warning: 'bg-bt-amber-bg text-bt-amber',
  danger: 'bg-bt-red-bg text-bt-red',
  info: 'bg-bt-blue-bg text-bt-blue',
  teal: 'bg-bt-teal-bg text-bt-teal',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-bt-text-tertiary',
  primary: 'bg-bt-primary',
  success: 'bg-bt-green',
  warning: 'bg-bt-amber',
  danger: 'bg-bt-red',
  info: 'bg-bt-blue',
  teal: 'bg-bt-teal',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}
