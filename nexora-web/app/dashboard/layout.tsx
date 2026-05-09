'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// S6759: Readonly props
interface DashboardLayoutProps {
  readonly children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // S7764: globalThis instead of window/localStorage
    const token = globalThis.localStorage?.getItem('nexora_token');
    if (!token) {
      router.push('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
      {children}
    </div>
  );
}