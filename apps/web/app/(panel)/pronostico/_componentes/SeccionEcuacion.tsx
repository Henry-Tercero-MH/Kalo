'use client';

import { formatearNumero } from '@kalo/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Tabla, type Columna } from '@/componentes/Tabla';
import { Campo, Cargando, Cifra, Subtitulo, Tarjeta } from '@/componentes/ui';
import { api, query } from '@/lib/api';
import type { Ecuacion, FilaEcuacion } from './tipos';

const numero = (decimales = 0): Partial<Columna<FilaEcuacion>> => ({
  meta: { numero: true },
  cell: ({ getValue }) => formatearNumero(Number(getValue()), decimales),
});

/** Ecuación productiva por lote, con retorno, recobro y factor ajustables. */
export function SeccionEcuacion() {
  const [ajustes, setAjustes] = useState({ retorno: '', recobro: '', factor: '' });
  const qEc = query(ajustes);
  const ecuacion = useQuery({
    queryKey: ['ecuacion', qEc],
    queryFn: () => api<Ecuacion>(`/pronostico/ecuacion${qEc}`),
  });

  const totalFinca = ecuacion.data?.lotes.reduce((s, l) => s + l.cajasLoteAnio, 0) ?? 0;
  const columnas = [
    { header: 'Lote', accessorFn: (l) => `${l.codigo} · ${l.nombre}` },
    { header: 'Hectáreas', accessorKey: 'hectareas', ...numero(2) },
    { header: 'Población (pl/ha)', accessorKey: 'poblacion', ...numero() },
    { header: 'Retorno', accessorKey: 'retorno', ...numero(2) },
    {
      header: 'Recobro',
      accessorKey: 'recobro',
      meta: { numero: true },
      cell: ({ row }) =>
        `${formatearNumero(row.original.recobro, 3)}${row.original.recobroObservado !== null && !ajustes.recobro ? ' (obs.)' : ''}`,
    },
    { header: 'Factor', accessorKey: 'factor', ...numero(2) },
    { header: 'Cajas/ha/año', accessorKey: 'cajasHaAnio', ...numero() },
    { header: 'Cajas/lote/año', accessorKey: 'cajasLoteAnio', ...numero() },
  ] as Columna<FilaEcuacion>[];

  return (
    <>
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
    </>
  );
}
