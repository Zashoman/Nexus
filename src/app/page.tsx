'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/intel');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-[#0B0E11]">
      <div className="text-center">
        <h1 className="text-xl font-mono text-[#E8EAED] mb-2">Command Center</h1>
        <p className="text-sm font-mono text-[#5A6A7A]">Redirecting to Intelligence...</p>
      </div>
    </div>
  );
}
