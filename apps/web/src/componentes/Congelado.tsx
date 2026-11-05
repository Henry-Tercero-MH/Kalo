import { moduloCongelado } from '@kalo/shared';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

/** Layout de una ruta cuyo módulo puede estar congelado en la etapa actual (ver ETAPA). */
export function layoutCongelable(codigo: string) {
  return function Layout({ children }: { children: ReactNode }) {
    if (moduloCongelado(codigo)) redirect('/');
    return children;
  };
}
