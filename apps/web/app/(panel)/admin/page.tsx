'use client';

import { useState } from 'react';
import { Calendario, Lotes, Plagas, TiposLabor } from '@/componentes/admin/Catalogos';
import { Bitacora, Formularios, Modulos, Parametros } from '@/componentes/admin/Plataforma';
import { Roles } from '@/componentes/admin/Roles';
import { Usuarios } from '@/componentes/admin/Usuarios';
import { Titulo } from '@/componentes/ui';

const PESTANAS = {
  usuarios: { titulo: 'Usuarios', C: Usuarios },
  roles: { titulo: 'Roles y permisos', C: Roles },
  lotes: { titulo: 'Lotes', C: Lotes },
  plagas: { titulo: 'Plagas', C: Plagas },
  labores: { titulo: 'Labores', C: TiposLabor },
  calendario: { titulo: 'Semanas y cintas', C: Calendario },
  parametros: { titulo: 'Parámetros', C: Parametros },
  modulos: { titulo: 'Módulos', C: Modulos },
  formularios: { titulo: 'Formularios', C: Formularios },
  bitacora: { titulo: 'Bitácora', C: Bitacora },
} as const;

export default function Admin() {
  const [actual, setActual] = useState<keyof typeof PESTANAS>('usuarios');
  const { C } = PESTANAS[actual];
  return (
    <>
      <Titulo>Administración</Titulo>
      <div role="tablist" className="mb-4 flex flex-wrap gap-1 border-b border-neutros-n200">
        {Object.entries(PESTANAS).map(([k, p]) => (
          <button
            key={k}
            role="tab"
            aria-selected={actual === k}
            onClick={() => setActual(k as keyof typeof PESTANAS)}
            className={`-mb-px min-h-10 border-b-2 px-3 text-sm font-semibold uppercase ${actual === k ? 'border-marca-negro text-neutros-n900' : 'border-transparent text-neutros-n500'}`}
          >
            {p.titulo}
          </button>
        ))}
      </div>
      <C />
    </>
  );
}
