'use client';

import { MODULOS, type ManifiestoModulo } from '@kalo/shared';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icono } from './Icono';

/** Menú armado desde el registro de módulos según los permisos del usuario. */
export function Navegacion({ modulos, nombre, rol }: { modulos: string[]; nombre: string; rol: string }) {
  const ruta = usePathname();
  const router = useRouter();
  const visibles = (MODULOS as readonly ManifiestoModulo[])
    .filter((m) => m.plataformas.includes('web') && m.rutaWeb && modulos.includes(m.codigo))
    .sort((a, b) => a.orden - b.orden);
  // Además de los módulos web, se listan los módulos de campo con tabla de registros.
  const activos = visibles.filter((m) => m.estado === 'activo' && ['mapa', 'registros', 'pronostico', 'validacion', 'fusarium', 'ordenes', 'admin', 'dispositivos'].includes(m.codigo));
  const proximos = visibles.filter((m) => m.estado === 'proximamente');
  const enlace = (m: ManifiestoModulo) => {
    const activo = ruta.startsWith(m.rutaWeb!);
    return (
      <Link
        key={m.codigo}
        href={m.rutaWeb!}
        className={`flex min-h-10 items-center gap-3 border-l-4 px-3 text-sm font-semibold ${activo ? 'border-marca-verde bg-neutros-n50 text-neutros-n900' : 'border-transparent text-neutros-n700 hover:bg-neutros-n50'}`}
      >
        <Icono nombre={m.icono} />
        {m.codigo === 'fusarium' ? 'Alertas de Fusarium' : m.codigo === 'ordenes' ? 'Órdenes de trabajo' : m.nombre}
      </Link>
    );
  };
  return (
    <nav className="flex h-full flex-col gap-1 py-4" aria-label="Módulos">
      {activos.map(enlace)}
      {proximos.length ? <p className="mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutros-n500">Próximamente</p> : null}
      {proximos.map(enlace)}
      <div className="mt-auto border-t border-neutros-n200 px-3 pt-4">
        <p className="text-sm font-semibold text-neutros-n900">{nombre}</p>
        <p className="text-xs uppercase tracking-wider text-neutros-n500">{rol}</p>
        <button
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold underline"
          onClick={async () => {
            await fetch('/api/sesion', { method: 'DELETE' });
            router.replace('/login');
          }}
        >
          <LogOut size={16} aria-hidden /> Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
