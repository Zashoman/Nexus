import type { Metadata } from "next";
import "./globals.css";
import RootShell from "./RootShell";

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
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
