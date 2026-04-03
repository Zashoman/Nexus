'use client';

import { ReactNode } from 'react';
import AuthProvider from '@/components/realestate/AuthProvider';

export default function RealEstateLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
