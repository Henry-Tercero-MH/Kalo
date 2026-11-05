'use client';

import { formatearFecha, formatearFechaHora, formatearNumero } from '@kalo/shared';
import { MuestraColor } from '@/componentes/ui';
import { useNombres } from '@/lib/catalogos';
import type { Fila } from './tipos';

/** Resumen de un registro pendiente: lote y fecha, datos clave según la tabla y quién lo hizo. */
export function Resumen({ tabla, f }: { tabla: string; f: Fila }) {
  const n = useNombres();
  const color = n.colores.get(String(f.color_cinta_id));
  return (
    <div className="text-sm">
      <p className="font-extrabold uppercase text-neutros-n900">
        {n.lotes.get(String(f.lote_id)) ?? 'Sin lote'} · {formatearFecha(String(f.fecha))}
      </p>
      {tabla === 'cosecha' ? (
        <p className="tabular flex items-center gap-3">
          <MuestraColor hex={color?.hex} nombre={color?.nombre} />{' '}
          {formatearNumero(Number(f.racimos_cosechados))} cosechados ·{' '}
          {formatearNumero(Number(f.racimos_perdidos))} perdidos
        </p>
      ) : null}
      {tabla === 'labores' ? (
        <p className="tabular">
          {n.tipos.get(String(f.tipo_labor_id))} ·{' '}
          {n.trabajadores.get(String(f.trabajador_id)) ?? '—'} ·{' '}
          {formatearNumero(Number(f.cantidad), 1)}
        </p>
      ) : null}
      {tabla === 'alertas_fusarium' ? <p>Fusarium: {String(f.estado).toUpperCase()}</p> : null}
      <p className="text-neutros-n500">
        {n.usuarios.get(String(f.created_by)) ?? '—'} · {formatearFechaHora(Number(f.created_at))}
      </p>
    </div>
  );
}
