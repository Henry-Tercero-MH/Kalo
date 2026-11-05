'use client';

import { useState, type KeyboardEvent } from 'react';
import { Calendario, Lotes, Plagas, TiposLabor } from '@/componentes/admin/Catalogos';
import { PersonalPorCaporal } from '@/componentes/admin/Personal';
import { Bitacora, Formularios, Modulos, Parametros } from '@/componentes/admin/Plataforma';
import { Roles } from '@/componentes/admin/Roles';
import { Usuarios } from '@/componentes/admin/Usuarios';
import { Titulo } from '@/componentes/ui';

const PESTANAS = {
  usuarios: { titulo: 'Usuarios', C: Usuarios },
  personal: { titulo: 'Personal por caporal', C: PersonalPorCaporal },
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

type Clave = keyof typeof PESTANAS;
const CLAVES = Object.keys(PESTANAS) as Clave[];

export default function Admin() {
  const [actual, setActual] = useState<Clave>('usuarios');
  const { C } = PESTANAS[actual];
  // Pestañas con teclado (patrón WAI-ARIA): flechas, Inicio y Fin mueven el foco y la selección.
  const teclado = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = CLAVES.indexOf(actual);
    const destino =
      e.key === 'ArrowRight'
        ? CLAVES[(i + 1) % CLAVES.length]
        : e.key === 'ArrowLeft'
          ? CLAVES[(i - 1 + CLAVES.length) % CLAVES.length]
          : e.key === 'Home'
            ? CLAVES[0]
            : e.key === 'End'
              ? CLAVES[CLAVES.length - 1]
              : undefined;
    if (!destino) return;
    e.preventDefault();
    setActual(destino);
    document.getElementById(`pestana-${destino}`)?.focus();
  };
  return (
    <>
      <Titulo>Administración</Titulo>
      <div
        role="tablist"
        aria-label="Secciones de administración"
        onKeyDown={teclado}
        className="mb-4 flex flex-wrap gap-1 border-b border-neutros-n200"
      >
        {Object.entries(PESTANAS).map(([k, p]) => (
          <button
            key={k}
            id={`pestana-${k}`}
            type="button"
            role="tab"
            aria-selected={actual === k}
            aria-controls="panel-admin"
            tabIndex={actual === k ? 0 : -1}
            onClick={() => setActual(k as Clave)}
            className={`-mb-px min-h-10 border-b-2 px-3 text-sm font-semibold uppercase ${actual === k ? 'border-marca-negro text-neutros-n900' : 'border-transparent text-neutros-n500 hover:border-neutros-n300 hover:text-neutros-n900'}`}
          >
            {p.titulo}
          </button>
        ))}
      </div>
      <div id="panel-admin" role="tabpanel" aria-labelledby={`pestana-${actual}`}>
        <C />
      </div>
    </>
  );
}
