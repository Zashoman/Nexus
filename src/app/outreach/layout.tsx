import type { ReactNode } from 'react';
import AuthProvider from '@/components/outreach/AuthProvider';
import OutreachShell from '@/components/outreach/layout/OutreachShell';

export const metadata = {
  title: 'Blue Tree Outreach Agent',
  description: 'AI-powered outreach management for Blue Tree Digital',
};

export default function OutreachLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <OutreachShell>{children}</OutreachShell>
    </AuthProvider>
  );
}
