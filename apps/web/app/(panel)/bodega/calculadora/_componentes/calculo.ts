/**
 * Fórmula provisional del pedido por contenedor, a confirmar con los datos reales de la bodega:
 *   necesario = cantidad por contenedor × contenedores a producir
 *   faltante  = necesario − en bodega (mínimo 0)
 *   pedido    = faltante redondeado hacia arriba a empaques completos
 */
export const UNIDADES = ['kg', 'L', 'unidad', 'saco', 'galón'] as const;

export interface Producto {
  id: number;
  nombre: string;
  unidad: string;
  porContenedor: string;
  enBodega: string;
  empaque: string;
}

export const ETIQUETA_CAMPO = {
  porContenedor: 'Cantidad por contenedor',
  enBodega: 'Cantidad en bodega',
  empaque: 'Cantidad por empaque',
} as const;

const demo = (
  id: number,
  unidad: string,
  porContenedor: string,
  enBodega: string,
  empaque: string,
) =>
  ({
    id,
    nombre: `Producto ${id} (DEMO)`,
    unidad,
    porContenedor,
    enBodega,
    empaque,
  }) satisfies Producto;

export const EJEMPLO: Producto[] = [
  demo(1, 'kg', '120', '80', '25'),
  demo(2, 'L', '60', '75', '20'),
  demo(3, 'saco', '40', '12', '1'),
  demo(4, 'unidad', '500', '150', '100'),
];

/** Texto del campo a número; vacío o inválido cuenta como 0. */
export const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function calcular(p: Producto, contenedores: number) {
  const necesario = num(p.porContenedor) * contenedores;
  const faltante = Math.max(0, necesario - num(p.enBodega));
  const empaque = num(p.empaque) || 1;
  const empaques = Math.ceil(faltante / empaque);
  return { necesario, faltante, empaques, pedido: empaques * empaque };
}

export type Calculo = ReturnType<typeof calcular>;
