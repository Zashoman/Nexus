import type { Metadata } from 'next';
import { JetBrains_Mono, Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import TabNav from './components/TabNav';

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Chair',
  description: 'Trading discipline journal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-ink-950 text-bone-100">
        <header className="border-b border-ink-700 bg-ink-900/60 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <Link href="/home" className="flex items-center gap-3">
              <span className="mono text-[11px] uppercase tracking-[0.25em] text-bone-300">
                The Chair
              </span>
              <span className="mono text-[10px] text-bone-400">session ∞/300</span>
            </Link>
            <TabNav />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
        <footer className="border-t border-ink-700 bg-ink-900/40">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
            <span className="mono text-[10px] uppercase tracking-[0.2em] text-bone-400">
              local · sqlite · phase 1
            </span>
            <span className="mono text-[10px] text-bone-400">last backup —</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
