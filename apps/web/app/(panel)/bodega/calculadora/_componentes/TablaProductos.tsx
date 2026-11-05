'use client';

import { formatearNumero } from '@kalo/shared';
import { Icono } from '@/componentes/Icono';
import { claseControlCompacto, claseEncabezadoTabla, Estado } from '@/componentes/ui';
import { ETIQUETA_CAMPO, num, UNIDADES, type Calculo, type Producto } from './calculo';

/** Tabla editable de productos con lo necesario y lo que hay que pedir de cada uno. */
export function TablaProductos({
  filas,
  onCambiar,
  onQuitar,
}: {
  filas: { p: Producto; r: Calculo }[];
  onCambiar: (id: number, campo: keyof Producto, valor: string) => void;
  onQuitar: (id: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-sm">
        <thead className="border-b-2 border-marca-negro">
          <tr>
            <th className={claseEncabezadoTabla}>Producto</th>
            <th className={claseEncabezadoTabla}>Unidad</th>
            <th className={`${claseEncabezadoTabla} text-right`}>Por contenedor</th>
            <th className={`${claseEncabezadoTabla} text-right`}>En bodega</th>
            <th className={`${claseEncabezadoTabla} text-right`}>Empaque</th>
            <th className={`${claseEncabezadoTabla} text-right`}>Necesario</th>
            <th className={`${claseEncabezadoTabla} text-right`}>A pedir</th>
            <th className={claseEncabezadoTabla}>Estado</th>
            <th className={claseEncabezadoTabla}>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ p, r }) => (
            <tr key={p.id} className="border-b border-neutros-n200">
              <td className="px-3 py-2">
                <input
                  aria-label={`Nombre del producto ${p.id}`}
                  className={`${claseControlCompacto} w-full`}
                  value={p.nombre}
                  onChange={(e) => onCambiar(p.id, 'nombre', e.target.value)}
                />
              </td>
              <td className="px-3 py-2">
                <select
                  aria-label={`Unidad de ${p.nombre}`}
                  className={claseControlCompacto}
                  value={p.unidad}
                  onChange={(e) => onCambiar(p.id, 'unidad', e.target.value)}
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </td>
              {(['porContenedor', 'enBodega', 'empaque'] as const).map((campo) => (
                <td key={campo} className="px-3 py-2 text-right">
                  <input
                    aria-label={`${ETIQUETA_CAMPO[campo]} de ${p.nombre} (${p.unidad})`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    className={`${claseControlCompacto} tabular w-28 text-right`}
                    value={p[campo]}
                    onChange={(e) => onCambiar(p.id, campo, e.target.value)}
                  />
                </td>
              ))}
              <td className="tabular px-3 py-2 text-right">
                {formatearNumero(r.necesario, 2)} {p.unidad}
              </td>
              <td className="tabular px-3 py-2 text-right font-extrabold text-neutros-n900">
                {formatearNumero(r.pedido, 2)} {p.unidad}
                {r.pedido > 0 && num(p.empaque) > 1 ? (
                  <span className="block text-xs font-normal text-neutros-n500">
                    {r.empaques} empaques de {formatearNumero(num(p.empaque), 2)}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2">
                {r.pedido > 0 ? (
                  <Estado tipo="alerta" texto="Pedir" />
                ) : (
                  <Estado tipo="exito" texto="Alcanza" />
                )}
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => onQuitar(p.id)}
                  aria-label={`Quitar ${p.nombre}`}
                  className="inline-flex min-h-10 min-w-10 items-center justify-center border border-transparent hover:border-estados-peligro hover:text-estados-peligro"
                >
                  <Icono nombre="trash-2" tamano={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
