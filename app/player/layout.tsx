'use client';

import { useStore } from '@/lib/store';
import { ConnectionGate } from '@/components/connection-gate';
import { AppShell } from '@/components/app-shell';
import { Sidebar } from '@/components/sidebar';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  const connected = useStore((s) => s.status.connected);

  if (!connected) {
    return <ConnectionGate />;
  }

  return <AppShell sidebar={<Sidebar />}>{children}</AppShell>;
}
