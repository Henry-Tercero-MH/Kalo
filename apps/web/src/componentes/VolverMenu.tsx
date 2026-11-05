'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icono } from './Icono';

/** Enlace de regreso a la portada del módulo; no se muestra en la portada misma. */
export function VolverMenu({ ruta, texto }: { ruta: string; texto: string }) {
  if (usePathname() === ruta) return null;
  return (
    <Link
      href={ruta}
      className="mb-4 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-neutros-n900 underline-offset-2 hover:underline"
    >
      <Icono nombre="chevron-left" tamano={16} /> {texto}
    </Link>
  );
}
