import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { VolverMenu } from '@/componentes/VolverMenu';
import { perfilActual } from '@/lib/servidor';

/** Bodega aún no tiene API que valide el permiso: se revisa aquí con el perfil. */
export default async function LayoutBodega({ children }: { children: ReactNode }) {
  const { perfil } = await perfilActual();
  if (!perfil?.modulosWeb.includes('bodega')) redirect('/');
  return (
    <>
      <VolverMenu ruta="/bodega" texto="Menú Bodega" />
      {children}
    </>
  );
}
