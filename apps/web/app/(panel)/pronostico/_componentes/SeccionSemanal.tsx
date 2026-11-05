'use client';

import { formatearNumero } from '@kalo/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Aviso, Boton, Cargando, MuestraColor, Selector, Subtitulo } from '@/componentes/ui';
import { api, query } from '@/lib/api';
import { useNombres } from '@/lib/catalogos';
import type { Semanal } from './tipos';

const GraficoPronostico = dynamic(
  () => import('./GraficoPronostico').then((m) => m.GraficoPronostico),
  { ssr: false },
);

/** Pronóstico semanal de cajas por lote o finca, con gráfica, tabla e instantánea. */
export function SeccionSemanal() {
  const nombres = useNombres();
  const [loteId, setLoteId] = useState('');
  const [horizonte, setHorizonte] = useState(8);
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

  return (
    <>
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
          <TablaSemanal semanas={semanal.data.semanas} />
        </>
      ) : (
        <Cargando />
      )}
    </>
  );
}

function TablaSemanal({ semanas }: { semanas: Semanal['semanas'] }) {
  const nombres = useNombres();
  return (
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
          {semanas.map((s) => (
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
  );
}
