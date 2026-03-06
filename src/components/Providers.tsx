'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import { LoggerInitializer } from '@/components/LoggerInitializer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <RealtimeProvider>
          <LoggerInitializer />
          {children}
        </RealtimeProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
