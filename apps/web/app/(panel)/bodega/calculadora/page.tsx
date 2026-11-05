'use client';

/**
 * Calculadora de pedido por contenedor (MAQUETA). La fórmula provisional está en
 * `_componentes/calculo.ts`. No guarda nada: los productos son de ejemplo (DEMO) y se
 * reinician al recargar.
 */
import { formatearNumero } from '@kalo/shared';
import { useState } from 'react';
import { Icono } from '@/componentes/Icono';
import { Aviso, Boton, Campo, Cifra, Subtitulo, Tarjeta, Titulo } from '@/componentes/ui';
import { calcular, EJEMPLO, num, type Producto } from './_componentes/calculo';
import { TablaProductos } from './_componentes/TablaProductos';

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
      <TablaProductos filas={filas} onCambiar={cambiar} onQuitar={quitar} />
      <div className="mt-4">
        <Boton variante="secundario" onClick={agregar}>
          <Icono nombre="plus" tamano={16} /> Agregar producto
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
