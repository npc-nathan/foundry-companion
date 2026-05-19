'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { sseManager } from '@/lib/sse';
import { useStore } from '@/lib/store';
import { endHeadlessSession } from '@/lib/session';
import { toast } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Wire SSE events to invalidate TanStack Query caches
  useEffect(() => {
    const unsub = sseManager.listen((event) => {
      const qc = queryClient;
      switch (event.type) {
        case 'encounter':
          qc.invalidateQueries({ queryKey: ['encounters'] });
          break;
        case 'chat':
          qc.invalidateQueries({ queryKey: ['chat-messages'] });
          qc.invalidateQueries({ queryKey: ['users'] });
          break;
        case 'scene':
          qc.invalidateQueries({ queryKey: ['structure'] });
          qc.invalidateQueries({ queryKey: ['scene'] });
          break;
        case 'rolls':
          qc.invalidateQueries({ queryKey: ['rolls'] });
          qc.invalidateQueries({ queryKey: ['encounters'] });
          break;
        case 'hook':
          qc.invalidateQueries({ queryKey: ['actor'] });
          qc.invalidateQueries({ queryKey: ['effects'] });
          qc.invalidateQueries({ queryKey: ['structure'] });
          qc.invalidateQueries({ queryKey: ['macros'] });
          qc.invalidateQueries({ queryKey: ['journals'] });
          qc.invalidateQueries({ queryKey: ['encounters'] });
          qc.invalidateQueries({ queryKey: ['canvas'] });
          break;
        case 'connected':
          toast.success('SSE reconnected');
          break;
      }
    });
    return () => {
      unsub();
    };
  }, [queryClient]);

  // Reconnect SSE on app reload when already connected
  const { status, config } = useStore();
  const sseConnected = useRef(false);
  useEffect(() => {
    if (status.connected && config.relayUrl && config.apiKey && !sseConnected.current) {
      sseConnected.current = true;
      sseManager.subscribe('encounter', config.relayUrl, config.apiKey, config.clientId);
      sseManager.subscribe('chat', config.relayUrl, config.apiKey, config.clientId);
      sseManager.subscribe('scene', config.relayUrl, config.apiKey, config.clientId);
      sseManager.subscribe('rolls', config.relayUrl, config.apiKey, config.clientId);
      sseManager.subscribe('hook', config.relayUrl, config.apiKey, config.clientId);
    }
  }, [status.connected, config.relayUrl, config.apiKey, config.clientId]);

  // End headless session on app unmount
  useEffect(() => {
    return () => {
      const { config } = useStore.getState();
      if (config.sessionId && config.apiKey) {
        endHeadlessSession(config.apiKey, config.sessionId).catch(() => {});
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
