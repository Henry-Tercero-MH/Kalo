'use client';

import { Subtitulo } from '@/componentes/ui';
import { useCatalogos } from '@/lib/catalogos';
import { th, celdaNum, useGuardar } from './comun';

export function Lotes() {
  const { data } = useCatalogos();
  const guardar = useGuardar();
  return (
    <>
      <Subtitulo>Lotes</Subtitulo>
      <table className="text-sm">
        <thead>
          <tr className="border-b-2 border-marca-negro">
            <th scope="col" className={th}>
              Lote
            </th>
            <th scope="col" className={th}>
              Hectáreas
            </th>
            <th scope="col" className={th}>
              Población (pl/ha)
            </th>
          </tr>
        </thead>
        <tbody>
          {data?.lotes.map((l) => (
            <tr key={l.id} className="border-b border-neutros-n200">
              <td className="px-3 py-1 font-semibold">
                {l.codigo} · {l.nombre}
              </td>
              <td className="px-3 py-1">
                <input
                  className={celdaNum}
                  type="number"
                  step="0.01"
                  defaultValue={l.hectareas}
                  onBlur={(e) =>
                    guardar.mutate({
                      ruta: `/admin/lotes/${l.id}`,
                      body: { hectareas: Number(e.target.value) },
                    })
                  }
                  aria-label={`Hectáreas de ${l.nombre}`}
                />
              </td>
              <td className="px-3 py-1">
                <input
                  className={celdaNum}
                  type="number"
                  defaultValue={l.poblacion}
                  onBlur={(e) =>
                    guardar.mutate({
                      ruta: `/admin/lotes/${l.id}`,
                      body: { poblacion: Number(e.target.value) },
                    })
                  }
                  aria-label={`Población de ${l.nombre}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-neutros-n500">
        Los polígonos de los lotes son ficticios (DEMO). Los reales están pendientes; se cargan como
        GeoJSON por la API (POST /v1/admin/lotes).
      </p>
    </>
  );
}
