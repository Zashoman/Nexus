import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  breadcrumb?: string;
}

export default function PageHeader({ title, subtitle, action, breadcrumb }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {breadcrumb && (
          <p className="text-xs text-bt-text-tertiary mb-1 uppercase tracking-wider font-medium">
            {breadcrumb}
          </p>
        )}
        <h1 className="text-xl font-bold text-bt-text">{title}</h1>
        {subtitle && (
          <p className="text-sm text-bt-text-secondary mt-1">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
