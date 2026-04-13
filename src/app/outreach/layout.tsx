import type { ReactNode } from 'react';
import AuthProvider from '@/components/outreach/AuthProvider';
import ErrorBoundary from '@/components/outreach/ErrorBoundary';
import OutreachShell from '@/components/outreach/layout/OutreachShell';

export const metadata = {
  title: 'Blue Tree Brain — Outreach Agent',
  description: 'AI-powered outreach management for Blue Tree Digital',
};

export default function OutreachLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <OutreachShell>{children}</OutreachShell>
      </ErrorBoundary>
    </AuthProvider>
  );
}
