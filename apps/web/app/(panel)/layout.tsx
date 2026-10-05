import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Navegacion } from '@/componentes/Navegacion';
import { Logo } from '@/componentes/ui';
import { perfilActual } from '@/lib/servidor';

const ROLES: Record<string, string> = {
  administrador: 'Administrador',
  gerente: 'Gerente',
  supervisor: 'Supervisor',
};

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { perfil, vencido } = await perfilActual();
  if (!perfil) {
    const ruta = (await headers()).get('x-invoke-path') ?? '/mapa';
    redirect(vencido ? `/api/sesion/renovar?volver=${encodeURIComponent(ruta)}` : '/login');
  }
  const conLogo = existsSync(join(process.cwd(), 'public', 'kalo-logo.png'));
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="border-r border-neutros-n200">
        <div className="flex h-16 items-center border-b-2 border-marca-negro px-4">
          <Logo imagen={conLogo} />
        </div>
        <Navegacion
          modulos={perfil.modulosWeb}
          nombre={perfil.nombre}
          rol={ROLES[perfil.rol] ?? perfil.rol}
        />
      </aside>
      <main className="min-w-0 px-8 py-6">{children}</main>
    </div>
  );
}
