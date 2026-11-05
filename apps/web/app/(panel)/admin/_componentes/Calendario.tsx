'use client';

import { formatearFecha, formatearNumero } from '@kalo/shared';
import { useState } from 'react';
import { Aviso, claseControlCompacto, MuestraColor, Selector, Subtitulo } from '@/componentes/ui';
import { useCatalogos } from '@/lib/catalogos';
import { useGuardar } from './comun';

export function Calendario() {
  const { data } = useCatalogos();
  const guardar = useGuardar();
  const anio = new Date().getFullYear();
  const [verAnio, setVerAnio] = useState(anio);
  const semanas = data?.semanas.filter((s) => s.anio === verAnio) ?? [];
  return (
    <>
      <Subtitulo>Calendario de semanas y colores de cinta</Subtitulo>
      <Aviso tipo="alerta">
        Los colores de cinta son de EJEMPLO: los reales están pendientes de confirmar por la finca.
        El factor se interpoló desde los puntos conocidos y es editable.
      </Aviso>
      <div className="mb-3 flex flex-wrap items-end gap-4">
        <Selector
          etiqueta="Año"
          value={verAnio}
          onChange={(e) => setVerAnio(Number(e.target.value))}
        >
          {[anio - 1, anio, anio + 1].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Selector>
        <div className="flex flex-wrap gap-3">
          {data?.colores.map((c) => (
            <MuestraColor key={c.id} hex={c.hex} nombre={c.nombre} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2 xl:grid-cols-3">
        {semanas.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-2 border-b border-neutros-n200 py-2 text-sm"
          >
            <span className="w-10 font-extrabold tabular">S{s.numero}</span>
            <span className="w-24 text-xs text-neutros-n500">{formatearFecha(s.fecha_inicio)}</span>
            <select
              className={claseControlCompacto}
              value={s.color_cinta_id}
              onChange={(e) =>
                guardar.mutate({
                  ruta: `/admin/semanas/${s.id}`,
                  body: { color_cinta_id: e.target.value },
                })
              }
              aria-label={`Color de la semana ${s.numero}`}
            >
              {data?.colores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <span
              aria-hidden
              className="inline-block h-3 w-3 border border-marca-negro"
              style={{ background: data?.colores.find((c) => c.id === s.color_cinta_id)?.hex }}
            />
            <input
              className={`w-20 text-right tabular ${claseControlCompacto}`}
              type="number"
              step="0.01"
              defaultValue={s.factor}
              onBlur={(e) =>
                guardar.mutate({
                  ruta: `/admin/semanas/${s.id}`,
                  body: { factor: Number(e.target.value) },
                })
              }
              aria-label={`Factor de la semana ${s.numero}`}
              title={`Factor ${formatearNumero(s.factor, 4)}`}
            />
          </div>
        ))}
      </div>
    </>
  );
}
