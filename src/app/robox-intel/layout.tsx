import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RoboX Intel',
  description: 'Market Intelligence Platform for Robotics Training Data',
};

export default function RoboXIntelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#09090B] text-[#FAFAFA]">
      {children}
    </div>
  );
}
