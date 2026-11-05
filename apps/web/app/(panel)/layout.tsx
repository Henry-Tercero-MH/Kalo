import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { House, UserRound } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Navegacion } from '@/componentes/Navegacion';
import { IndicadorDemo, Logo } from '@/componentes/ui';
import { perfilActual } from '@/lib/servidor';
import { modoMock } from '@/mock/modo';

const ROLES: Record<string, string> = {
  administrador: 'Administrador',
  gerente: 'Gerente',
  supervisor: 'Supervisor',
  bodega_materiales: 'Bodega de materiales',
};

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { perfil, vencido } = await perfilActual();
  if (!perfil) {
    const ruta = (await headers()).get('x-invoke-path') ?? '/';
    redirect(vencido ? `/api/sesion/renovar?volver=${encodeURIComponent(ruta)}` : '/login');
  }
  const conLogo = existsSync(join(process.cwd(), 'public', 'kalo-logo.png'));
  return (
    <div className="flex min-h-screen">
      {/* Enlace para saltar el menú con teclado: aparece al recibir foco. */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-10 focus:border-2 focus:border-marca-negro focus:bg-neutros-n0 focus:px-4 focus:py-2 focus:text-sm focus:font-extrabold focus:uppercase focus:text-neutros-n900"
      >
        Saltar al contenido
      </a>
      <Navegacion
        modulos={perfil.modulosWeb}
        logo={
          <div className="flex flex-col items-start gap-1">
            <Logo imagen={conLogo} />
            {modoMock() ? <IndicadorDemo /> : null}
          </div>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-end gap-5 border-b border-neutros-n200 bg-neutros-n50 px-8">
          <p className="flex items-center gap-2 text-sm text-neutros-n700">
            <UserRound size={18} className="text-neutros-n900" aria-hidden />
            <span>
              Usuario: <strong className="text-neutros-n900">{perfil.usuario.toUpperCase()}</strong>
              <span className="ml-2 text-neutros-n500">· {ROLES[perfil.rol] ?? perfil.rol}</span>
            </span>
          </p>
          <Link
            href="/"
            aria-label="Ir al inicio"
            title="Inicio"
            className="inline-flex h-10 w-10 items-center justify-center border border-transparent text-neutros-n900 hover:border-marca-negro hover:bg-neutros-n0"
          >
            <House size={22} aria-hidden />
          </Link>
        </header>
        <main id="contenido" tabIndex={-1} className="min-w-0 flex-1 px-8 py-6 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
