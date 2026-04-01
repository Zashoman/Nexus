import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Command Center",
  description: "Intelligence & Operations Command Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex bg-[#0B0E11] text-[#E8EAED]">
        {/* Sidebar Navigation */}
        <nav className="w-14 bg-[#0D1117] border-r border-[#1E2A3A] flex flex-col items-center py-4 gap-4 flex-shrink-0">
          <a
            href="/"
            title="Command Center"
            className="w-8 h-8 flex items-center justify-center text-[#5A6A7A] hover:text-[#E8EAED] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </a>

          <div className="w-6 border-t border-[#1E2A3A]" />

          <a
            href="/intel"
            title="Intelligence"
            className="w-8 h-8 flex items-center justify-center text-[#4488FF] hover:text-[#6699FF] transition-colors rounded-sm hover:bg-[#4488FF]/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </a>
        </nav>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
