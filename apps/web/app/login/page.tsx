import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Etiqueta, IndicadorDemo, Logo } from '@/componentes/ui';
import { PINES_DEMO } from '@/mock/almacen';
import { modoMock } from '@/mock/modo';
import { Formulario } from './Formulario';

export const metadata: Metadata = { title: 'Iniciar sesión — Kalo Campo' };

/** Usuarios DEMO con acceso al panel (los roles de campo entran por la app móvil). */
const USUARIOS_DEMO = [
  { usuario: 'admin', rol: 'Administrador' },
  { usuario: 'gerente', rol: 'Gerente' },
  { usuario: 'supervisor', rol: 'Supervisor' },
];

export default function Login() {
  const demo = modoMock();
  const conLogo = existsSync(join(process.cwd(), 'public', 'kalo-logo.png'));
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Logo imagen={conLogo} />
          {demo ? <IndicadorDemo /> : null}
        </div>
        <h1 className="mt-8 border-b-2 border-marca-negro pb-2 text-2xl">Panel de campo</h1>
        <p className="mb-6 mt-3 text-sm text-neutros-n500">
          Revise y valide las labores y la asistencia que llegan de la finca. Ingrese con su usuario
          y PIN.
        </p>
        <Suspense>
          <Formulario />
        </Suspense>
        {demo ? (
          <section
            aria-label="Usuarios de demostración"
            className="mt-8 border-t border-neutros-n200 pt-4"
          >
            <Etiqueta>Usuarios demo</Etiqueta>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {USUARIOS_DEMO.map((u) => (
                <li key={u.usuario} className="flex flex-wrap gap-x-2">
                  <span className="font-semibold text-neutros-n900">{u.usuario}</span>
                  <span className="tabular">PIN {PINES_DEMO[u.usuario]}</span>
                  <span className="text-neutros-n500">· {u.rol}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
