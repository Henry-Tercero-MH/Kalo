'use client';

/**
 * Calculadora de pedido por contenedor (MAQUETA). Fórmula provisional, a confirmar con los
 * datos reales de la bodega:
 *   necesario = cantidad por contenedor × contenedores a producir
 *   faltante  = necesario − en bodega (mínimo 0)
 *   pedido    = faltante redondeado hacia arriba a empaques completos
 * No guarda nada: los productos son de ejemplo (DEMO) y se reinician al recargar.
 */
import { formatearNumero } from '@kalo/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  Aviso,
  Boton,
  Campo,
  Cifra,
  claseControlCompacto,
  claseEncabezadoTabla,
  Estado,
  Subtitulo,
  Tarjeta,
  Titulo,
} from '@/componentes/ui';

const UNIDADES = ['kg', 'L', 'unidad', 'saco', 'galón'] as const;

interface Producto {
  id: number;
  nombre: string;
  unidad: string;
  porContenedor: string;
  enBodega: string;
  empaque: string;
}

const EJEMPLO: Producto[] = [
  {
    id: 1,
    nombre: 'Producto 1 (DEMO)',
    unidad: 'kg',
    porContenedor: '120',
    enBodega: '80',
    empaque: '25',
  },
  {
    id: 2,
    nombre: 'Producto 2 (DEMO)',
    unidad: 'L',
    porContenedor: '60',
    enBodega: '75',
    empaque: '20',
  },
  {
    id: 3,
    nombre: 'Producto 3 (DEMO)',
    unidad: 'saco',
    porContenedor: '40',
    enBodega: '12',
    empaque: '1',
  },
  {
    id: 4,
    nombre: 'Producto 4 (DEMO)',
    unidad: 'unidad',
    porContenedor: '500',
    enBodega: '150',
    empaque: '100',
  },
];

/** Texto del campo a número; vacío o inválido cuenta como 0. */
const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function calcular(p: Producto, contenedores: number) {
  const necesario = num(p.porContenedor) * contenedores;
  const faltante = Math.max(0, necesario - num(p.enBodega));
  const empaque = num(p.empaque) || 1;
  const empaques = Math.ceil(faltante / empaque);
  return { necesario, faltante, empaques, pedido: empaques * empaque };
}

export default function Calculadora() {
  const [contenedores, setContenedores] = useState('1');
  const [productos, setProductos] = useState<Producto[]>(EJEMPLO);
  const [siguienteId, setSiguienteId] = useState(EJEMPLO.length + 1);

  const cambiar = (id: number, campo: keyof Producto, valor: string) =>
    setProductos((ps) => ps.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  const agregar = () => {
    setProductos((ps) => [
      ...ps,
      {
        id: siguienteId,
        nombre: `Producto ${siguienteId}`,
        unidad: 'kg',
        porContenedor: '',
        enBodega: '',
        empaque: '1',
      },
    ]);
    setSiguienteId((n) => n + 1);
  };
  const quitar = (id: number) => setProductos((ps) => ps.filter((p) => p.id !== id));

  const nContenedores = num(contenedores);
  const filas = productos.map((p) => ({ p, r: calcular(p, nContenedores) }));
  const aPedir = filas.filter(({ r }) => r.pedido > 0);

  return (
    <>
      <Titulo>Calculadora de pedido</Titulo>
      <Aviso tipo="alerta">
        Maqueta con productos de ejemplo (DEMO). La fórmula es provisional y no se guarda nada; se
        ajustará con los datos reales de la bodega.
      </Aviso>

      <div className="mt-6 flex flex-wrap items-end gap-8">
        <div className="w-56">
          <Campo
            etiqueta="Contenedores a producir"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={contenedores}
            onChange={(e) => setContenedores(e.target.value)}
            ayuda="Puede usar fracciones, p. ej. 0.5"
          />
        </div>
        <Cifra etiqueta="Productos" valor={productos.length} />
        <Cifra etiqueta="Productos a pedir" valor={aPedir.length} />
      </div>

      <Subtitulo>Productos por contenedor</Subtitulo>
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
                    onChange={(e) => cambiar(p.id, 'nombre', e.target.value)}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    aria-label={`Unidad de ${p.nombre}`}
                    className={claseControlCompacto}
                    value={p.unidad}
                    onChange={(e) => cambiar(p.id, 'unidad', e.target.value)}
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
                      onChange={(e) => cambiar(p.id, campo, e.target.value)}
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
                    onClick={() => quitar(p.id)}
                    aria-label={`Quitar ${p.nombre}`}
                    className="inline-flex min-h-10 min-w-10 items-center justify-center border border-transparent hover:border-estados-peligro hover:text-estados-peligro"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <Boton variante="secundario" onClick={agregar}>
          <Plus size={16} aria-hidden /> Agregar producto
        </Boton>
      </div>

      <Subtitulo>Pedido sugerido</Subtitulo>
      {aPedir.length ? (
        <Tarjeta>
          <ul className="flex flex-col gap-2">
            {aPedir.map(({ p, r }) => (
              <li key={p.id} className="flex justify-between gap-4 text-sm">
                <span className="font-semibold text-neutros-n900">{p.nombre}</span>
                <span className="tabular font-extrabold text-neutros-n900">
                  {formatearNumero(r.pedido, 2)} {p.unidad}
                </span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      ) : (
        <Aviso tipo="exito">
          Con lo que hay en bodega alcanza para {formatearNumero(nContenedores, 2)} contenedor(es).
        </Aviso>
      )}
    </>
  );
}

const ETIQUETA_CAMPO = {
  porContenedor: 'Cantidad por contenedor',
  enBodega: 'Cantidad en bodega',
  empaque: 'Cantidad por empaque',
} as const;
