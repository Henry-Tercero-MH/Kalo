'use client';

/**
 * Calculadora de la ecuación productiva por lote y pronóstico semanal de cajas
 * (racimos por color × recobro × factor de la semana).
 */
import { formatearNumero } from '@kalo/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { PuntoGrafico } from '@/componentes/GraficoPronostico';
import { Tabla, type Columna } from '@/componentes/Tabla';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Cifra,
  MuestraColor,
  Selector,
  Subtitulo,
  Tarjeta,
  Titulo,
} from '@/componentes/ui';
import { api, query } from '@/lib/api';
import { useNombres } from '@/lib/catalogos';

const GraficoPronostico = dynamic(
  () => import('@/componentes/GraficoPronostico').then((m) => m.GraficoPronostico),
  { ssr: false },
);

interface FilaEcuacion {
  id: string;
  codigo: string;
  nombre: string;
  hectareas: number;
  poblacion: number;
  retorno: number;
  recobro: number;
  recobroObservado: number | null;
  factor: number;
  cajasHaAnio: number;
  cajasLoteAnio: number;
}

interface Ecuacion {
  semanaActual: { anio: number; numero: number };
  factorSemanaActual: number;
  factorPromedioAnual: number;
  retorno: number;
  recobroReferencia: number;
  lotes: FilaEcuacion[];
}

interface Semanal {
  semanaActual: { anio: number; numero: number };
  recobroPorDefecto: number;
  distribucion: Record<string, number>;
  distribucionPendiente: boolean;
  semanas: (PuntoGrafico & {
    anio: number;
    porColor: { colorCintaId: string; racimos: number }[];
  })[];
}

export default function Pronostico() {
  const nombres = useNombres();
  const [ajustes, setAjustes] = useState({ retorno: '', recobro: '', factor: '' });
  const [loteId, setLoteId] = useState('');
  const [horizonte, setHorizonte] = useState(8);
  const qEc = query(ajustes);
  const ecuacion = useQuery({
    queryKey: ['ecuacion', qEc],
    queryFn: () => api<Ecuacion>(`/pronostico/ecuacion${qEc}`),
  });
  const qSem = query({ horizonte, lote_id: loteId });
  const semanal = useQuery({
    queryKey: ['semanal', qSem],
    queryFn: () => api<Semanal>(`/pronostico/semanal${qSem}`),
  });
  const guardar = useMutation({
    mutationFn: () =>
      api('/pronostico/guardar', {
        method: 'POST',
        body: { horizonte, ...(loteId ? { lote_id: loteId } : {}) },
      }),
  });

  const totalFinca = ecuacion.data?.lotes.reduce((s, l) => s + l.cajasLoteAnio, 0) ?? 0;
  const columnas: Columna<FilaEcuacion>[] = [
    { header: 'Lote', accessorFn: (l) => `${l.codigo} · ${l.nombre}` },
    {
      header: 'Hectáreas',
      accessorKey: 'hectareas',
      meta: { numero: true },
      cell: ({ getValue }) => formatearNumero(Number(getValue()), 2),
    },
    {
      header: 'Población (pl/ha)',
      accessorKey: 'poblacion',
      meta: { numero: true },
      cell: ({ getValue }) => formatearNumero(Number(getValue())),
    },
    {
      header: 'Retorno',
      accessorKey: 'retorno',
      meta: { numero: true },
      cell: ({ getValue }) => formatearNumero(Number(getValue()), 2),
    },
    {
      header: 'Recobro',
      accessorKey: 'recobro',
      meta: { numero: true },
      cell: ({ row }) =>
        `${formatearNumero(row.original.recobro, 3)}${row.original.recobroObservado !== null && !ajustes.recobro ? ' (obs.)' : ''}`,
    },
    {
      header: 'Factor',
      accessorKey: 'factor',
      meta: { numero: true },
      cell: ({ getValue }) => formatearNumero(Number(getValue()), 2),
    },
    {
      header: 'Cajas/ha/año',
      accessorKey: 'cajasHaAnio',
      meta: { numero: true },
      cell: ({ getValue }) => formatearNumero(Number(getValue())),
    },
    {
      header: 'Cajas/lote/año',
      accessorKey: 'cajasLoteAnio',
      meta: { numero: true },
      cell: ({ getValue }) => formatearNumero(Number(getValue())),
    },
  ];

  return (
    <>
      <Titulo>Pronóstico</Titulo>
      <Aviso tipo="alerta">
        Datos de demostración (DEMO). Las cifras no corresponden a producción real.
      </Aviso>

      <Subtitulo>Ecuación productiva por lote</Subtitulo>
      <p className="mb-3 text-sm">
        Población × Retorno × Recobro × Factor = cajas/ha/año. Deje vacío un campo para usar el
        valor de referencia o el observado.
      </p>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Campo
          etiqueta={`Retorno (ref. ${formatearNumero(ecuacion.data?.retorno ?? 0, 2)})`}
          type="number"
          step="0.01"
          value={ajustes.retorno}
          onChange={(e) => setAjustes((a) => ({ ...a, retorno: e.target.value }))}
        />
        <Campo
          etiqueta={`Recobro (ref. ${formatearNumero(ecuacion.data?.recobroReferencia ?? 0, 2)})`}
          type="number"
          step="0.01"
          min="0"
          max="1"
          value={ajustes.recobro}
          onChange={(e) => setAjustes((a) => ({ ...a, recobro: e.target.value }))}
        />
        <Campo
          etiqueta={`Factor (promedio anual ${formatearNumero(ecuacion.data?.factorPromedioAnual ?? 0, 2)})`}
          type="number"
          step="0.01"
          value={ajustes.factor}
          onChange={(e) => setAjustes((a) => ({ ...a, factor: e.target.value }))}
        />
      </div>
      {ecuacion.data ? (
        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Tarjeta>
            <Cifra etiqueta="Total finca" valor={formatearNumero(totalFinca)} unidad="cajas/año" />
          </Tarjeta>
          <Tarjeta>
            <Cifra
              etiqueta={`Factor semana ${ecuacion.data.semanaActual.numero}`}
              valor={formatearNumero(ecuacion.data.factorSemanaActual, 2)}
              unidad="cajas/racimo"
            />
          </Tarjeta>
        </div>
      ) : null}
      {ecuacion.isLoading ? (
        <Cargando />
      ) : (
        <Tabla datos={ecuacion.data?.lotes ?? []} columnas={columnas} />
      )}

      <Subtitulo>Pronóstico semanal de cajas</Subtitulo>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Selector etiqueta="Lote" value={loteId} onChange={(e) => setLoteId(e.target.value)}>
          <option value="">Toda la finca</option>
          {[...nombres.lotes.entries()].map(([id, n]) => (
            <option key={id} value={id}>
              {n}
            </option>
          ))}
        </Selector>
        <Selector
          etiqueta="Semanas"
          value={horizonte}
          onChange={(e) => setHorizonte(Number(e.target.value))}
        >
          {[4, 8, 12, 16].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Selector>
        <Boton variante="secundario" onClick={() => guardar.mutate()} disabled={guardar.isPending}>
          {guardar.isSuccess ? 'Instantánea guardada' : 'Guardar instantánea'}
        </Boton>
      </div>
      {semanal.data?.distribucionPendiente ? (
        <Aviso tipo="alerta">
          Reparto de cosecha entre 11, 12 y 13 semanas:{' '}
          {Object.entries(semanal.data.distribucion)
            .map(([k, v]) => `${k} sem. ${formatearNumero(v * 100)} %`)
            .join(' · ')}{' '}
          — PENDIENTE de confirmar con la finca (parámetro editable).
        </Aviso>
      ) : null}
      {semanal.data ? (
        <>
          <GraficoPronostico datos={semanal.data.semanas} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-marca-negro text-[11px] font-semibold uppercase tracking-[0.14em] text-neutros-n500">
                  <th className="px-3 py-2 text-left">Semana</th>
                  <th className="px-3 py-2 text-left">Racimos por color</th>
                  <th className="px-3 py-2 text-right">Racimos</th>
                  <th className="px-3 py-2 text-right">Factor</th>
                  <th className="px-3 py-2 text-right">Cajas</th>
                </tr>
              </thead>
              <tbody>
                {semanal.data.semanas.map((s) => (
                  <tr key={s.clave} className="border-b border-neutros-n200">
                    <td className="px-3 py-2 font-semibold">{s.clave}</td>
                    <td className="flex flex-wrap gap-3 px-3 py-2">
                      {s.porColor.map((c) => {
                        const color = nombres.colores.get(c.colorCintaId);
                        return (
                          <span key={c.colorCintaId} className="inline-flex items-center gap-1">
                            <MuestraColor hex={color?.hex} nombre={color?.nombre} />
                            <span className="tabular">{formatearNumero(c.racimos)}</span>
                          </span>
                        );
                      })}
                    </td>
                    <td className="tabular px-3 py-2 text-right">{formatearNumero(s.racimos)}</td>
                    <td className="tabular px-3 py-2 text-right">{formatearNumero(s.factor, 2)}</td>
                    <td className="tabular px-3 py-2 text-right font-extrabold text-neutros-n900">
                      {formatearNumero(s.cajas)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <Cargando />
      )}
    </>
  );
}
