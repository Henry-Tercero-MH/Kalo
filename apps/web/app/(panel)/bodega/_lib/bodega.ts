import type { OpcionMenu } from '@/componentes/MenuModulo';

/** Opciones del módulo Bodega de materiales (íconos del «Menú Bodega»). */
export const OPCIONES_BODEGA: readonly OpcionMenu[] = [
  {
    ruta: '/bodega/calculadora',
    nombre: 'Calculadora de pedido',
    icono: 'calculator',
    listo: true,
  },
  {
    ruta: '/bodega/existencias',
    nombre: 'Existencias',
    icono: 'boxes',
    listo: false,
  },
  {
    ruta: '/bodega/movimientos',
    nombre: 'Entradas y salidas',
    icono: 'arrow-left-right',
    listo: false,
  },
];
