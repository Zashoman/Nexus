'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/outreach/AuthProvider';
import Sidebar from './Sidebar';

export default function OutreachShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === '/outreach/login';

  // Login page gets its own full-screen layout (no sidebar)
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-bt-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-bt-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-bt-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, AuthProvider handles redirect — show nothing
  if (!user) {
    return null;
  }

  // Authenticated: show sidebar + content
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
