'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function Proveedores({ children }: { children: ReactNode }) {
  const [cliente] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } } }),
  );
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}
