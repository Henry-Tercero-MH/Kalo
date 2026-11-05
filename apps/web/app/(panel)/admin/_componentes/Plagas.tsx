'use client';

import { useState } from 'react';
import { Boton, BotonEstado, Campo, Selector, Subtitulo } from '@/componentes/ui';
import { useCatalogos } from '@/lib/catalogos';
import { th, celdaNum, useGuardar } from './comun';

export function Plagas() {
  const { data } = useCatalogos();
  const guardar = useGuardar();
  const [nueva, setNueva] = useState({ codigo: '', nombre: '', tipo: 'plaga', umbral_alerta: '' });
  return (
    <>
      <Subtitulo>Catálogo de plagas</Subtitulo>
      <table className="text-sm">
        <thead>
          <tr className="border-b-2 border-marca-negro">
            <th scope="col" className={th}>
              Plaga
            </th>
            <th scope="col" className={th}>
              Tipo
            </th>
            <th scope="col" className={th}>
              Umbral de alerta (%)
            </th>
            <th scope="col" className={th}>
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {data?.plagas.map((p) => (
            <tr key={p.id} className="border-b border-neutros-n200">
              <td className="px-3 py-1">
                <span className="font-semibold">{p.nombre}</span>{' '}
                <i className="text-neutros-n500">{p.nombre_cientifico}</i>
              </td>
              <td className="px-3 py-1">{p.tipo}</td>
              <td className="px-3 py-1">
                <input
                  className={celdaNum}
                  type="number"
                  step="0.1"
                  defaultValue={p.umbral_alerta}
                  onBlur={(e) =>
                    guardar.mutate({
                      ruta: `/admin/plagas/${p.id}`,
                      body: { umbral_alerta: Number(e.target.value) },
                    })
                  }
                  aria-label={`Umbral de ${p.nombre}`}
                />
              </td>
              <td className="px-3 py-1">
                <BotonEstado
                  tipo={p.activo ? 'exito' : 'neutro'}
                  texto={p.activo ? 'Activa' : 'Inactiva'}
                  aria-label={`${p.nombre}: ${p.activo ? 'activa' : 'inactiva'}. Pulse para ${p.activo ? 'desactivar' : 'activar'}`}
                  onClick={() =>
                    guardar.mutate({ ruta: `/admin/plagas/${p.id}`, body: { activo: !p.activo } })
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-neutros-n500">Umbrales de ejemplo, editables.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Campo
          etiqueta="Código"
          value={nueva.codigo}
          onChange={(e) => setNueva({ ...nueva, codigo: e.target.value })}
        />
        <Campo
          etiqueta="Nombre"
          value={nueva.nombre}
          onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
        />
        <Selector
          etiqueta="Tipo"
          value={nueva.tipo}
          onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })}
        >
          <option value="plaga">Plaga</option>
          <option value="enfermedad">Enfermedad</option>
        </Selector>
        <Campo
          etiqueta="Umbral (%)"
          type="number"
          inputMode="decimal"
          className="w-28 text-right tabular"
          value={nueva.umbral_alerta}
          onChange={(e) => setNueva({ ...nueva, umbral_alerta: e.target.value })}
        />
        <Boton
          disabled={!nueva.codigo || !nueva.nombre || !nueva.umbral_alerta}
          onClick={() =>
            guardar.mutate({
              ruta: '/admin/plagas',
              method: 'POST',
              body: { ...nueva, umbral_alerta: Number(nueva.umbral_alerta), activo: true },
            })
          }
        >
          Agregar
        </Boton>
      </div>
    </>
  );
}
