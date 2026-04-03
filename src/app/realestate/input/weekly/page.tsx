'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/realestate/AuthProvider';
import WeeklyForm from '@/components/realestate/WeeklyForm';

export default function WeeklyInputPage() {
  const { user, role, loading, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/realestate/login');
    if (!loading && user && role !== 'owner') router.push('/realestate');
  }, [user, role, loading, router]);

  if (loading || !user || role !== 'owner') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm font-mono text-[#5A6A7A]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex-shrink-0 h-12 bg-[#0D1117] border-b border-[#1E2A3A] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/realestate')} className="text-[#5A6A7A] hover:text-[#E8EAED] font-mono text-xs">
            &larr; Back
          </button>
          <h1 className="text-sm font-mono font-semibold text-[#E8EAED] tracking-wider uppercase">
            Weekly Data Input
          </h1>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <WeeklyForm token={token} />
      </div>
    </div>
  );
}
