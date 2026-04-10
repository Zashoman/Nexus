import type { ReactNode } from 'react';
import Sidebar from '@/components/outreach/layout/Sidebar';

export const metadata = {
  title: 'Blue Tree Outreach Agent',
  description: 'AI-powered outreach management for Blue Tree Digital',
};

export default function OutreachLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bt-bg">
      <Sidebar />
      <main className="pl-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
