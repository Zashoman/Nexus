'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/home', label: 'Home' },
  { href: '/journal', label: 'Journal' },
  { href: '/history', label: 'History' },
  { href: '/patterns', label: 'Patterns' },
  { href: '/watchlist', label: 'Watchlist' },
  { href: '/settings', label: 'Settings' },
];

export default function TabNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {TABS.map((t) => {
        const active = pathname === t.href || pathname?.startsWith(t.href + '/');
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              'mono text-[11px] uppercase tracking-[0.2em] px-3 py-1.5 rounded ' +
              (active
                ? 'text-bone-50 bg-ink-700'
                : 'text-bone-300 hover:text-bone-50 hover:bg-ink-800')
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
