import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="p-4 rounded-2xl bg-bt-bg-alt text-bt-text-tertiary mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-bt-text mb-1">{title}</h3>
      <p className="text-sm text-bt-text-secondary text-center max-w-sm mb-6">
        {description}
      </p>
      {action}
    </div>
  );
}
