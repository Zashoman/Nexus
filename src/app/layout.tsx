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
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="2" height="2" />
              <rect x="13" y="9" width="2" height="2" />
              <path d="M9 15h6" />
              <path d="M4 8h16" />
              <line x1="8" y1="2" x2="8" y2="4" />
              <line x1="16" y1="2" x2="16" y2="4" />
            </svg>
          </a>

          <a
            href="/drones"
            title="Drones & Autonomous"
            className="w-8 h-8 flex items-center justify-center text-[#FF8C00] hover:text-[#FFaa33] transition-colors rounded-sm hover:bg-[#FF8C00]/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Center body */}
              <rect x="9" y="9" width="6" height="6" rx="1" />
              {/* Arms */}
              <line x1="9" y1="10" x2="4" y2="5" />
              <line x1="15" y1="10" x2="20" y2="5" />
              <line x1="9" y1="14" x2="4" y2="19" />
              <line x1="15" y1="14" x2="20" y2="19" />
              {/* Propellers */}
              <circle cx="4" cy="5" r="2.5" />
              <circle cx="20" cy="5" r="2.5" />
              <circle cx="4" cy="19" r="2.5" />
              <circle cx="20" cy="19" r="2.5" />
            </svg>
          </a>
          <a
            href="/youtube"
            title="YouTube Intelligence"
            className="w-8 h-8 flex items-center justify-center text-[#FF4444] hover:text-[#FF6666] transition-colors rounded-sm hover:bg-[#FF4444]/10"
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
              <rect x="2" y="4" width="20" height="16" rx="4" />
              <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
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
