import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import RootShell from "./RootShell";

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

interface Brand {
  title: string;
  description: string;
  icon: string;
}

function getBrand(host: string): Brand {
  const h = host.toLowerCase().split(':')[0];
  if (h === 'bluetreebrainapp.com' || h === 'www.bluetreebrainapp.com' || h.startsWith('bluetreebrain') || h.startsWith('blue-tree-brain')) {
    return {
      title: 'Blue Tree Brain',
      description: 'AI-powered outreach for Blue Tree Digital',
      icon: '/favicon-bluetree.svg',
    };
  }
  if (h === 'uaemarkettracker.com' || h === 'www.uaemarkettracker.com') {
    return {
      title: 'Dubai RE Monitor',
      description: 'Dubai real estate market tracker',
      icon: '/favicon-re.svg',
    };
  }
  if (h === 'intelapp.dev' || h === 'www.intelapp.dev') {
    return {
      title: 'Intel App',
      description: 'Personal intelligence briefing',
      icon: '/favicon-intel.svg',
    };
  }
  // default for nexus-xi-ivory.vercel.app and others
  return {
    title: 'Command Center',
    description: 'Intelligence & Operations Command Center',
    icon: '/favicon-intel.svg',
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const brand = getBrand(host);
  return {
    title: brand.title,
    description: brand.description,
    icons: {
      icon: [{ url: brand.icon, type: 'image/svg+xml' }],
    },
  };
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
