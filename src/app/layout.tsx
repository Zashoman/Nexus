import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import RootShell from "./RootShell";

export const metadata: Metadata = {
  title: "Command Center",
  description: "Intelligence & Operations Command Center",
};

const STANDALONE_DOMAINS = [
  'bluetreebrainapp.com',
  'www.bluetreebrainapp.com',
  'uaemarkettracker.com',
  'www.uaemarkettracker.com',
];

function isStandaloneDomain(host: string): boolean {
  const h = host.toLowerCase().split(':')[0];
  if (STANDALONE_DOMAINS.includes(h)) return true;
  if (h.startsWith('bluetreebrain')) return true;
  if (h.startsWith('blue-tree-brain')) return true;
  if (h.includes('-bluetreebrain-')) return true;
  if (process.env.DEPLOYMENT_MODE === 'outreach-only') return true;
  return false;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const skipSidebar = isStandaloneDomain(host);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex bg-[#0B0E11] text-[#E8EAED]">
        {skipSidebar ? (
          <main className="flex-1 flex flex-col min-h-screen">{children}</main>
        ) : (
          <RootShell>{children}</RootShell>
        )}
      </body>
    </html>
  );
}
