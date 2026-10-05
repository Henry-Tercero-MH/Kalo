'use client';

/** Lotes, plagas (umbrales), tipos de labor (unidad y tarifa), calendario de semanas y colores. */
import { formatearFecha, formatearNumero } from '@kalo/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Aviso, Boton, Campo, Estado, MuestraColor, Selector, Subtitulo } from '@/componentes/ui';
import { api } from '@/lib/api';
import { useCatalogos } from '@/lib/catalogos';

function useGuardar() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (v: { ruta: string; method?: string; body: unknown }) => api(v.ruta, { method: v.method ?? 'PATCH', body: v.body }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['catalogos'] }),
  });
}

const celdaNum = 'w-24 border border-neutros-n300 px-2 py-1 text-right tabular';
const th = 'px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-neutros-n500';

export function Lotes() {
  const { data } = useCatalogos();
  const guardar = useGuardar();
  return (
    <>
      <Subtitulo>Lotes</Subtitulo>
      <table className="text-sm">
        <thead>
          <tr className="border-b-2 border-marca-negro">
            <th className={th}>Lote</th>
            <th className={th}>Hectáreas</th>
            <th className={th}>Población (pl/ha)</th>
          </tr>
        </thead>
        <tbody>
          {data?.lotes.map((l) => (
            <tr key={l.id} className="border-b border-neutros-n200">
              <td className="px-2 py-1 font-semibold">{l.codigo} · {l.nombre}</td>
              <td className="px-2 py-1">
                <input className={celdaNum} type="number" step="0.01" defaultValue={l.hectareas} onBlur={(e) => guardar.mutate({ ruta: `/admin/lotes/${l.id}`, body: { hectareas: Number(e.target.value) } })} aria-label={`Hectáreas de ${l.nombre}`} />
              </td>
              <td className="px-2 py-1">
                <input className={celdaNum} type="number" defaultValue={l.poblacion} onBlur={(e) => guardar.mutate({ ruta: `/admin/lotes/${l.id}`, body: { poblacion: Number(e.target.value) } })} aria-label={`Población de ${l.nombre}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-neutros-n500">Los polígonos de los lotes son ficticios (DEMO). Los reales están pendientes; se cargan como GeoJSON por la API (POST /v1/admin/lotes).</p>
    </>
  );
}

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
            <th className={th}>Plaga</th>
            <th className={th}>Tipo</th>
            <th className={th}>Umbral de alerta (%)</th>
            <th className={th}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {data?.plagas.map((p) => (
            <tr key={p.id} className="border-b border-neutros-n200">
              <td className="px-2 py-1">
                <span className="font-semibold">{p.nombre}</span> <i className="text-neutros-n500">{p.nombre_cientifico}</i>
              </td>
              <td className="px-2 py-1">{p.tipo}</td>
              <td className="px-2 py-1">
                <input className={celdaNum} type="number" step="0.1" defaultValue={p.umbral_alerta} onBlur={(e) => guardar.mutate({ ruta: `/admin/plagas/${p.id}`, body: { umbral_alerta: Number(e.target.value) } })} aria-label={`Umbral de ${p.nombre}`} />
              </td>
              <td className="px-2 py-1">
                <button onClick={() => guardar.mutate({ ruta: `/admin/plagas/${p.id}`, body: { activo: !p.activo } })}>
                  <Estado tipo={p.activo ? 'exito' : 'neutro'} texto={p.activo ? 'Activa' : 'Inactiva'} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-neutros-n500">Umbrales de ejemplo, editables.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Campo etiqueta="Código" value={nueva.codigo} onChange={(e) => setNueva({ ...nueva, codigo: e.target.value })} />
        <Campo etiqueta="Nombre" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} />
        <Selector etiqueta="Tipo" value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })}>
          <option value="plaga">Plaga</option>
          <option value="enfermedad">Enfermedad</option>
        </Selector>
        <Campo etiqueta="Umbral (%)" type="number" value={nueva.umbral_alerta} onChange={(e) => setNueva({ ...nueva, umbral_alerta: e.target.value })} />
        <Boton
          disabled={!nueva.codigo || !nueva.nombre || !nueva.umbral_alerta}
          onClick={() => guardar.mutate({ ruta: '/admin/plagas', method: 'POST', body: { ...nueva, umbral_alerta: Number(nueva.umbral_alerta), activo: true } })}
        >
          Agregar
        </Boton>
      </div>
    </>
  );
}

export function TiposLabor() {
  const { data } = useCatalogos();
  const guardar = useGuardar();
  return (
    <>
      <Subtitulo>Catálogo de labores</Subtitulo>
      <table className="text-sm">
        <thead>
          <tr className="border-b-2 border-marca-negro">
            <th className={th}>Labor</th>
            <th className={th}>Unidad</th>
            <th className={th}>Tarifa por unidad (Q)</th>
          </tr>
        </thead>
        <tbody>
          {data?.tiposLabor.map((t) => (
            <tr key={t.id} className="border-b border-neutros-n200">
              <td className="px-2 py-1 font-semibold">{t.nombre}</td>
              <td className="px-2 py-1">{t.unidad}</td>
              <td className="px-2 py-1">
                <input
                  className={celdaNum}
                  type="number"
                  step="0.01"
                  placeholder="Pendiente"
                  defaultValue={t.tarifa ?? ''}
                  onBlur={(e) => guardar.mutate({ ruta: `/admin/tipos-labor/${t.id}`, body: { tarifa: e.target.value === '' ? null : Number(e.target.value) } })}
                  aria-label={`Tarifa de ${t.nombre}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-neutros-n500">Las tarifas de destajo están PENDIENTES de definir por la finca.</p>
    </>
  );
}

export function Calendario() {
  const { data } = useCatalogos();
  const guardar = useGuardar();
  const anio = new Date().getFullYear();
  const [verAnio, setVerAnio] = useState(anio);
  const semanas = data?.semanas.filter((s) => s.anio === verAnio) ?? [];
  return (
    <>
      <Subtitulo>Calendario de semanas y colores de cinta</Subtitulo>
      <Aviso tipo="alerta">Los colores de cinta son de EJEMPLO: los reales están pendientes de confirmar por la finca. El factor se interpoló desde los puntos conocidos y es editable.</Aviso>
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <Selector etiqueta="Año" value={verAnio} onChange={(e) => setVerAnio(Number(e.target.value))}>
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
          <div key={s.id} className="flex items-center gap-2 border-b border-neutros-n200 py-1 text-sm">
            <span className="w-10 font-extrabold tabular">S{s.numero}</span>
            <span className="w-24 text-xs text-neutros-n500">{formatearFecha(s.fecha_inicio)}</span>
            <select
              className="border border-neutros-n300 px-1 py-0.5"
              value={s.color_cinta_id}
              onChange={(e) => guardar.mutate({ ruta: `/admin/semanas/${s.id}`, body: { color_cinta_id: e.target.value } })}
              aria-label={`Color de la semana ${s.numero}`}
            >
              {data?.colores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <span aria-hidden className="inline-block h-3 w-3 border border-marca-negro" style={{ background: data?.colores.find((c) => c.id === s.color_cinta_id)?.hex }} />
            <input
              className="w-16 border border-neutros-n300 px-1 py-0.5 text-right tabular"
              type="number"
              step="0.01"
              defaultValue={s.factor}
              onBlur={(e) => guardar.mutate({ ruta: `/admin/semanas/${s.id}`, body: { factor: Number(e.target.value) } })}
              aria-label={`Factor de la semana ${s.numero}`}
              title={`Factor ${formatearNumero(s.factor, 4)}`}
            />
          </div>
        ))}
      </div>
    </>
  );
}
