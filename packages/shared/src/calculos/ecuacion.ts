/**
 * Ecuación productiva por lote:
 *   Población × Retorno × Recobro × Factor = cajas/ha/año
 * Ejemplo de referencia: 1.600 × 1,85 × 0,98 × 1,37 = 3.974 cajas/ha/año.
 */
import { redondear } from './factor';

export interface EntradaEcuacion {
  /** Plantas productivas por hectárea. */
  poblacion: number;
  /** Racimos por planta al año. */
  retorno: number;
  /** Proporción de racimos enfundados que se cosechan (0–1). */
  recobro: number;
  /** Cajas por racimo. */
  factor: number;
}

export interface ResultadoEcuacion extends EntradaEcuacion {
  racimosHaAnio: number;
  cajasHaAnio: number;
}

export function ecuacionProductiva(e: EntradaEcuacion): ResultadoEcuacion {
  for (const [k, v] of Object.entries(e)) {
    if (!Number.isFinite(v) || v < 0) throw new Error(`Valor inválido para ${k}: ${v}`);
  }
  if (e.recobro > 1) throw new Error('El recobro es una proporción entre 0 y 1');
  const racimosHaAnio = e.poblacion * e.retorno * e.recobro;
  return {
    ...e,
    racimosHaAnio: redondear(racimosHaAnio, 2),
    cajasHaAnio: redondear(racimosHaAnio * e.factor, 2),
  };
}

/** Cajas al año de un lote completo. */
export function cajasLoteAnio(e: EntradaEcuacion, hectareas: number): number {
  return redondear(ecuacionProductiva(e).cajasHaAnio * hectareas, 2);
}

/**
 * Valores observados de un lote para alimentar la ecuación (cuando hay datos):
 * recobro = cosechados / (cosechados + perdidos) de las cintas ya cerradas.
 */
export function recobroObservado(cosechados: number, perdidos: number): number | null {
  const total = cosechados + perdidos;
  if (total <= 0) return null;
  return redondear(cosechados / total, 4);
}
