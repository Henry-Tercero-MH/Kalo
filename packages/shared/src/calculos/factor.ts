/**
 * Factor (cajas por racimo) por semana del año.
 *
 * Puntos conocidos del prompt: semana 1 = 1,40; 13 = 1,15; 26–27 = 1,50; 39–40 = 1,50;
 * 52 = 1,40. Entre ellos se interpola linealmente. Los puntos son editables
 * (parámetro `factor_puntos_conocidos`) y cada semana puede sobrescribirse en el calendario.
 */

export interface PuntoFactor {
  semana: number;
  factor: number;
}

export const PUNTOS_FACTOR_REFERENCIA: readonly PuntoFactor[] = [
  { semana: 1, factor: 1.4 },
  { semana: 13, factor: 1.15 },
  { semana: 26, factor: 1.5 },
  { semana: 27, factor: 1.5 },
  { semana: 39, factor: 1.5 },
  { semana: 40, factor: 1.5 },
  { semana: 52, factor: 1.4 },
];

/** Interpola linealmente el factor para una semana (1–53). */
export function interpolarFactor(
  semana: number,
  puntos: readonly PuntoFactor[] = PUNTOS_FACTOR_REFERENCIA,
): number {
  if (puntos.length === 0) throw new Error('Se necesita al menos un punto conocido de factor');
  const ordenados = [...puntos].sort((a, b) => a.semana - b.semana);
  const primero = ordenados[0]!;
  const ultimo = ordenados[ordenados.length - 1]!;
  if (semana <= primero.semana) return primero.factor;
  if (semana >= ultimo.semana) return ultimo.factor;
  for (let i = 0; i < ordenados.length - 1; i++) {
    const a = ordenados[i]!;
    const b = ordenados[i + 1]!;
    if (semana >= a.semana && semana <= b.semana) {
      if (b.semana === a.semana) return b.factor;
      const t = (semana - a.semana) / (b.semana - a.semana);
      return redondear(a.factor + t * (b.factor - a.factor), 4);
    }
  }
  return ultimo.factor;
}

/** Factores para todas las semanas de un año. */
export function factoresDelAnio(
  totalSemanas = 52,
  puntos: readonly PuntoFactor[] = PUNTOS_FACTOR_REFERENCIA,
): Map<number, number> {
  const mapa = new Map<number, number>();
  for (let s = 1; s <= totalSemanas; s++) mapa.set(s, interpolarFactor(s, puntos));
  return mapa;
}

export function redondear(valor: number, decimales = 2): number {
  const f = 10 ** decimales;
  return Math.round(valor * f) / f;
}
