'use client';

import { ReactNode, useEffect } from 'react';
import AuthProvider from '@/components/realestate/AuthProvider';

export default function RealEstateLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Hide the Nexus sidebar nav — this module is standalone
    const nav = document.querySelector('body > nav');
    const main = document.querySelector('body > main');
    if (nav) (nav as HTMLElement).style.display = 'none';
    if (main) (main as HTMLElement).style.flex = 'none';
    if (main) (main as HTMLElement).style.width = '100%';
    return () => {
      if (nav) (nav as HTMLElement).style.display = '';
      if (main) {
        (main as HTMLElement).style.flex = '';
        (main as HTMLElement).style.width = '';
      }
    };
  }, []);

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
