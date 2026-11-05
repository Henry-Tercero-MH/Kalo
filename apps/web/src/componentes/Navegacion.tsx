'use client';

import { MODULOS, type ManifiestoModulo } from '@kalo/shared';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Icono } from './Icono';

interface Seccion {
  nombre: string;
  icono: string;
  modulos: readonly string[];
}

interface Grupo {
  nombre: string;
  icono: string;
  secciones: readonly Seccion[];
}

/**
 * Orden del menú: grupos (barra negra) → secciones (MAYÚSCULAS) → módulos. Un módulo web
 * que no esté aquí no aparece; los «próximamente» se agrupan solos al final.
 */
const GRUPOS: readonly Grupo[] = [
  {
    nombre: 'Gestión operativa',
    icono: 'wrench',
    secciones: [
      {
        nombre: 'Producción',
        icono: 'factory',
        modulos: ['registros', 'validacion', 'ordenes', 'fusarium', 'mapa', 'pronostico'],
      },
      { nombre: 'Logística', icono: 'truck', modulos: ['bodega'] },
    ],
  },
  {
    nombre: 'Sistema',
    icono: 'settings',
    secciones: [
      { nombre: 'Administración', icono: 'user-cog', modulos: ['admin', 'dispositivos'] },
    ],
  },
];

const CLAVE_COMPACTO = 'kalo.menuCompacto';

const nombreModulo = (m: ManifiestoModulo) =>
  m.codigo === 'fusarium'
    ? 'Alertas de Fusarium'
    : m.codigo === 'ordenes'
      ? 'Órdenes de trabajo'
      : m.nombre;

/** Minúsculas y sin tildes, para que «logistica» encuentre «Logística». */
const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Barra lateral armada desde el registro de módulos según los permisos del usuario. */
export function Navegacion({ modulos, logo }: { modulos: string[]; logo: ReactNode }) {
  const ruta = usePathname();
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [cerrados, setCerrados] = useState<ReadonlySet<string>>(new Set());
  const [compacto, setCompacto] = useState(false);

  useEffect(() => {
    try {
      setCompacto(localStorage.getItem(CLAVE_COMPACTO) === '1');
    } catch {
      // Sin almacenamiento (ventana privada): el menú queda expandido.
    }
  }, []);
  const alternarCompacto = () => {
    setCompacto((c) => {
      try {
        localStorage.setItem(CLAVE_COMPACTO, c ? '0' : '1');
      } catch {
        // Preferencia solo de esta sesión.
      }
      return !c;
    });
  };
  const alternar = (clave: string) =>
    setCerrados((s) => {
      const n = new Set(s);
      if (n.has(clave)) n.delete(clave);
      else n.add(clave);
      return n;
    });

  const visibles = (MODULOS as readonly ManifiestoModulo[])
    .filter((m) => m.plataformas.includes('web') && m.rutaWeb && modulos.includes(m.codigo))
    .sort((a, b) => a.orden - b.orden);
  const porCodigo = new Map(visibles.map((m) => [m.codigo, m]));
  const proximos = visibles.filter((m) => m.estado === 'proximamente');
  const grupos: Grupo[] = [
    ...GRUPOS,
    {
      nombre: 'Próximamente',
      icono: 'clock',
      secciones: [{ nombre: 'Módulos', icono: 'clock', modulos: proximos.map((m) => m.codigo) }],
    },
  ];

  const filtro = normalizar(busqueda.trim());
  const armado = grupos
    .map((g) => ({
      ...g,
      secciones: g.secciones
        .map((s) => ({
          ...s,
          items: s.modulos
            .map((c) => porCodigo.get(c))
            .filter((m): m is ManifiestoModulo => !!m)
            .filter((m) => !filtro || normalizar(nombreModulo(m)).includes(filtro)),
        }))
        .filter((s) => s.items.length),
    }))
    .filter((g) => g.secciones.length);

  // Al buscar se muestra todo lo que coincide, aunque el grupo esté plegado.
  const abierto = (clave: string) => !!filtro || !cerrados.has(clave);

  const enlace = (m: ManifiestoModulo) => {
    const actual = ruta.startsWith(m.rutaWeb!);
    return (
      <li key={m.codigo}>
        <Link
          href={m.rutaWeb!}
          aria-current={actual ? 'page' : undefined}
          title={compacto ? nombreModulo(m) : undefined}
          className={`flex min-h-10 items-center gap-3 border-l-4 text-sm ${compacto ? 'justify-center' : 'py-2 pl-6 pr-3'} ${actual ? 'border-marca-verde bg-neutros-n50 font-extrabold text-neutros-n900' : 'border-transparent font-semibold text-neutros-n700 hover:border-neutros-n300 hover:bg-neutros-n50 hover:text-neutros-n900'}`}
        >
          <Icono nombre={m.icono} tamano={compacto ? 20 : 18} />
          {compacto ? <span className="sr-only">{nombreModulo(m)}</span> : nombreModulo(m)}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-neutros-n200 bg-neutros-n0 ${compacto ? 'w-[76px]' : 'w-[260px]'}`}
    >
      <div className="border-b-2 border-marca-negro px-4 pb-4 pt-2">
        <div className={`flex ${compacto ? 'justify-center' : 'justify-end'}`}>
          <button
            type="button"
            onClick={alternarCompacto}
            aria-label={compacto ? 'Expandir menú' : 'Contraer menú'}
            aria-expanded={!compacto}
            className="inline-flex h-10 w-10 items-center justify-center text-neutros-n900 hover:bg-neutros-n50"
          >
            <Icono nombre="menu" tamano={20} />
          </button>
        </div>
        {compacto ? null : logo}
      </div>

      {compacto ? null : (
        <div className="px-3 pt-4">
          <label htmlFor="buscar-modulo" className="sr-only">
            Buscar módulo
          </label>
          <div className="flex items-center gap-2 rounded-campo border border-neutros-n500 bg-neutros-n0 px-3 focus-within:border-marca-verde700 focus-within:outline-3 focus-within:outline-offset-0 focus-within:outline-marca-verde100">
            <Icono nombre="search" tamano={16} className="shrink-0 text-neutros-n500" />
            <input
              id="buscar-modulo"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar módulo…"
              // El foco se dibuja en el recuadro redondeado de afuera (focus-within), no aquí.
              className="min-h-10 w-full bg-transparent text-sm text-neutros-n900 placeholder:text-neutros-n500 focus-visible:outline-none"
            />
          </div>
        </div>
      )}

      <nav aria-label="Módulos" className="flex-1 overflow-y-auto px-3 py-4">
        {compacto ? (
          <ul className="flex flex-col gap-1">{visibles.map(enlace)}</ul>
        ) : armado.length ? (
          <ul className="flex flex-col gap-3">
            {armado.map((g) => {
              const claveG = `g:${g.nombre}`;
              const idG = `grupo-${normalizar(g.nombre).replace(/\s+/g, '-')}`;
              return (
                <li key={g.nombre}>
                  <button
                    type="button"
                    onClick={() => alternar(claveG)}
                    aria-expanded={abierto(claveG)}
                    aria-controls={idG}
                    className="flex min-h-10 w-full items-center gap-3 bg-marca-negro px-3 text-left text-sm font-extrabold uppercase tracking-wide text-neutros-n0"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center bg-marca-verde text-neutros-n900">
                      <Icono nombre={g.icono} tamano={15} />
                    </span>
                    <span className="flex-1">{g.nombre}</span>
                    <Icono
                      nombre="chevron-down"
                      tamano={16}
                      className={abierto(claveG) ? 'rotate-180' : undefined}
                    />
                  </button>
                  <ul id={idG} hidden={!abierto(claveG)} className="mt-1 flex flex-col">
                    {g.secciones.map((s) => {
                      const claveS = `s:${g.nombre}:${s.nombre}`;
                      return (
                        <li key={s.nombre}>
                          <button
                            type="button"
                            onClick={() => alternar(claveS)}
                            aria-expanded={abierto(claveS)}
                            className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-neutros-n500 hover:text-neutros-n900"
                          >
                            <Icono nombre={s.icono} tamano={15} />
                            <span className="flex-1">{s.nombre}</span>
                            <Icono
                              nombre="chevron-down"
                              tamano={16}
                              className={abierto(claveS) ? 'rotate-180' : undefined}
                            />
                          </button>
                          <ul hidden={!abierto(claveS)} className="flex flex-col pb-1">
                            {s.items.map(enlace)}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        ) : (
          <p role="status" className="px-3 text-sm text-neutros-n500">
            Ningún módulo coincide con «{busqueda.trim()}».
          </p>
        )}
      </nav>

      <div className="border-t border-neutros-n200 p-3">
        <button
          type="button"
          title={compacto ? 'Cerrar sesión' : undefined}
          className={`flex min-h-10 w-full items-center gap-2 px-3 text-sm font-semibold text-estados-peligro hover:bg-neutros-n50 ${compacto ? 'justify-center' : ''}`}
          onClick={async () => {
            await fetch('/api/sesion', { method: 'DELETE' });
            router.replace('/login');
          }}
        >
          <Icono nombre="log-out" tamano={16} />
          {compacto ? <span className="sr-only">Cerrar sesión</span> : 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  );
}
