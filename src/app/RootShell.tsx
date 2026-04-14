'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Root shell: renders the personal intelligence-briefing sidebar
 * (Intel / Drones / Journal / etc.) on everything EXCEPT /outreach/*.
 *
 * The outreach module (Blue Tree Brain) is a separate product with its
 * own sidebar (see components/outreach/layout/OutreachShell.tsx), and
 * is deployed as a standalone Vercel project. We hide the intelligence
 * sidebar on those routes so Blue Tree Brain looks self-contained.
 */
export default function RootShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isOutreach = pathname?.startsWith('/outreach');

  if (isOutreach) {
    // Full-width — outreach module owns its own chrome
    return <main className="flex-1 flex flex-col min-h-screen">{children}</main>;
  }

  return (
    <>
      {/* Personal intelligence sidebar */}
      <nav className="w-14 bg-[#0D1117] border-r border-[#1E2A3A] flex flex-col items-center py-4 gap-4 flex-shrink-0">
        <Link
          href="/"
          title="Command Center"
          className="w-8 h-8 flex items-center justify-center text-[#5A6A7A] hover:text-[#E8EAED] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </Link>

        <div className="w-6 border-t border-[#1E2A3A]" />

        <Link
          href="/dashboard"
          title="Macro Dashboard"
          className="w-8 h-8 flex items-center justify-center text-[#00CC66] hover:text-[#33DD88] transition-colors rounded-sm hover:bg-[#00CC66]/10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </Link>

        <Link
          href="/intel"
          title="Intelligence"
          className="w-8 h-8 flex items-center justify-center text-[#4488FF] hover:text-[#6699FF] transition-colors rounded-sm hover:bg-[#4488FF]/10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <rect x="9" y="9" width="2" height="2" />
            <rect x="13" y="9" width="2" height="2" />
            <path d="M9 15h6" />
            <path d="M4 8h16" />
            <line x1="8" y1="2" x2="8" y2="4" />
            <line x1="16" y1="2" x2="16" y2="4" />
          </svg>
        </Link>

        <Link
          href="/drones"
          title="Drones & Autonomous"
          className="w-8 h-8 flex items-center justify-center text-[#FF8C00] hover:text-[#FFaa33] transition-colors rounded-sm hover:bg-[#FF8C00]/10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="6" height="6" rx="1" />
            <line x1="9" y1="10" x2="4" y2="5" />
            <line x1="15" y1="10" x2="20" y2="5" />
            <line x1="9" y1="14" x2="4" y2="19" />
            <line x1="15" y1="14" x2="20" y2="19" />
            <circle cx="4" cy="5" r="2.5" />
            <circle cx="20" cy="5" r="2.5" />
            <circle cx="4" cy="19" r="2.5" />
            <circle cx="20" cy="19" r="2.5" />
          </svg>
        </Link>

        <Link
          href="/youtube"
          title="YouTube Intelligence"
          className="w-8 h-8 flex items-center justify-center text-[#FF4444] hover:text-[#FF6666] transition-colors rounded-sm hover:bg-[#FF4444]/10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="4" />
            <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
          </svg>
        </Link>

        <Link
          href="/telegram"
          title="Telegram Intelligence"
          className="w-8 h-8 flex items-center justify-center text-[#29B6F6] hover:text-[#4FC3F7] transition-colors rounded-sm hover:bg-[#29B6F6]/10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </Link>

        <Link
          href="/ft"
          title="Financial Times"
          className="w-8 h-8 flex items-center justify-center text-[#FCD0B1] hover:text-[#FDDCC4] transition-colors rounded-sm hover:bg-[#FCD0B1]/10"
        >
          <span className="text-[11px] font-mono font-bold">FT</span>
        </Link>

        <Link
          href="/journal"
          title="Journal Mentor"
          className="w-8 h-8 flex items-center justify-center text-[#D4A85C] hover:text-[#E0BC78] transition-colors rounded-sm hover:bg-[#D4A85C]/10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </Link>
      </nav>

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {children}
      </main>
    </>
  );
}
