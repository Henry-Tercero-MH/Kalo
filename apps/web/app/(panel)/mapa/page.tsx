'use client';

import { formatearFecha, formatearNumero } from '@kalo/shared';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Cargando, Estado, Etiqueta, Tarjeta, Titulo, type TipoEstado } from '@/componentes/ui';
import { api } from '@/lib/api';
import { useCatalogos } from '@/lib/catalogos';

const MapaFinca = dynamic(() => import('@/componentes/MapaFinca').then((m) => m.MapaFinca), { ssr: false, loading: () => <Cargando /> });

const TIPO: Record<string, TipoEstado> = { ALERTA: 'peligro', VIGILANCIA: 'alerta', NORMAL: 'exito', 'SIN DATOS': 'neutro' };

interface PropsLote {
  id: string;
  codigo: string;
  nombre: string;
  hectareas: number;
  estado: string;
  ultima_fecha: string | null;
  plagas: { plaga: string; incidencia: number; umbral: number; fecha: string }[];
  fusarium_abiertas: number;
  cobertura: number | null;
}

export default function Mapa() {
  const { data: cat } = useCatalogos();
  const [visibles, setVisibles] = useState({ rutas: true, cobertura: true, registros: true });
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const lotes = useQuery({ queryKey: ['mapa', 'lotes'], queryFn: () => api<GeoJSON.FeatureCollection>('/mapa/lotes'), refetchInterval: 60_000 });
  const rutas = useQuery({ queryKey: ['mapa', 'rutas'], queryFn: () => api<GeoJSON.FeatureCollection>('/mapa/rutas') });
  const cobertura = useQuery({ queryKey: ['mapa', 'cobertura'], queryFn: () => api<GeoJSON.FeatureCollection>('/mapa/cobertura') });
  const registros = useQuery({ queryKey: ['mapa', 'registros'], queryFn: () => api<GeoJSON.FeatureCollection>('/mapa/registros'), refetchInterval: 60_000 });

  const props = (lotes.data?.features ?? []).map((f) => f.properties as PropsLote);
  const elegido = props.find((p) => p.id === seleccion);

  return (
    <>
      <Titulo>Mapa de la finca</Titulo>
      <div className="mb-3 flex flex-wrap items-center gap-6">
        <div className="flex flex-wrap items-center gap-4" aria-label="Leyenda">
          <Etiqueta>Estado de plagas (últimos 14 días)</Etiqueta>
          {Object.keys(TIPO).map((e) => (
            <Estado key={e} tipo={TIPO[e]!} texto={e} />
          ))}
        </div>
        {(['rutas', 'cobertura', 'registros'] as const).map((c) => (
          <label key={c} className="inline-flex items-center gap-2 text-sm font-semibold uppercase">
            <input type="checkbox" checked={visibles[c]} onChange={(e) => setVisibles((v) => ({ ...v, [c]: e.target.checked }))} className="h-4 w-4 accent-black" />
            {c === 'rutas' ? 'Rutas (7 días)' : c === 'cobertura' ? 'Cobertura de la semana' : 'Registros'}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <MapaFinca
          capas={{ lotes: lotes.data, rutas: rutas.data, cobertura: cobertura.data, registros: registros.data }}
          visibles={visibles}
          bbox={cat?.finca?.bbox}
          alSeleccionarLote={setSeleccion}
        />
        <div className="flex flex-col gap-3">
          {elegido ? (
            <Tarjeta className="border-2 border-marca-negro">
              <h2 className="text-base">{elegido.nombre}</h2>
              <p className="tabular text-sm text-neutros-n500">{formatearNumero(elegido.hectareas, 2)} ha · última lectura {formatearFecha(elegido.ultima_fecha)}</p>
              <div className="my-2">
                <Estado tipo={TIPO[elegido.estado] ?? 'neutro'} texto={elegido.estado} />
              </div>
              <ul className="text-sm">
                {elegido.plagas.map((p) => (
                  <li key={p.plaga} className="flex justify-between border-b border-neutros-n200 py-1">
                    <span>{p.plaga}</span>
                    <span className="tabular">
                      {formatearNumero(p.incidencia, 1)} % / umbral {formatearNumero(p.umbral, 1)} %
                    </span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          ) : null}
          {props.map((p) => (
            <button key={p.id} onClick={() => setSeleccion(p.id)} className={`border p-3 text-left ${seleccion === p.id ? 'border-2 border-marca-negro' : 'border-neutros-n200'}`}>
              <div className="flex items-center justify-between">
                <span className="font-extrabold uppercase text-neutros-n900">{p.codigo} · {p.nombre}</span>
                <Estado tipo={TIPO[p.estado] ?? 'neutro'} texto={p.estado} />
              </div>
              <div className="tabular mt-1 flex justify-between text-sm text-neutros-n500">
                <span>Cobertura semana: {p.cobertura === null ? '—' : `${formatearNumero(p.cobertura, 1)} %`}</span>
                {p.fusarium_abiertas > 0 ? <Estado tipo="peligro" texto={`${p.fusarium_abiertas} Fusarium`} /> : null}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
