'use client';

import { Subtitulo } from '@/componentes/ui';
import { useCatalogos } from '@/lib/catalogos';
import { th, celdaNum, useGuardar } from './comun';

export function TiposLabor() {
  const { data } = useCatalogos();
  const guardar = useGuardar();
  return (
    <>
      <Subtitulo>Catálogo de labores</Subtitulo>
      <table className="text-sm">
        <thead>
          <tr className="border-b-2 border-marca-negro">
            <th scope="col" className={th}>
              Labor
            </th>
            <th scope="col" className={th}>
              Unidad
            </th>
            <th scope="col" className={th}>
              Tarifa por unidad (Q)
            </th>
          </tr>
        </thead>
        <tbody>
          {data?.tiposLabor.map((t) => (
            <tr key={t.id} className="border-b border-neutros-n200">
              <td className="px-3 py-1 font-semibold">{t.nombre}</td>
              <td className="px-3 py-1">{t.unidad}</td>
              <td className="px-3 py-1">
                <input
                  className={celdaNum}
                  type="number"
                  step="0.01"
                  placeholder="Pendiente"
                  defaultValue={t.tarifa ?? ''}
                  onBlur={(e) =>
                    guardar.mutate({
                      ruta: `/admin/tipos-labor/${t.id}`,
                      body: { tarifa: e.target.value === '' ? null : Number(e.target.value) },
                    })
                  }
                  aria-label={`Tarifa de ${t.nombre}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-neutros-n500">
        Las tarifas de destajo están PENDIENTES de definir por la finca.
      </p>
    </>
  );
}
