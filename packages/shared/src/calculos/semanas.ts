/**
 * Semanas del año (ISO-8601: la semana empieza el lunes y la semana 1 contiene el 4 de enero).
 */

export interface SemanaAnio {
  anio: number;
  numero: number;
}

function utc(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
}

/** Semana ISO de una fecha local. */
export function semanaIso(fecha: Date): SemanaAnio {
  const d = utc(fecha);
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const inicioAnio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const numero = Math.ceil(((d.getTime() - inicioAnio.getTime()) / 86_400_000 + 1) / 7);
  return { anio: d.getUTCFullYear(), numero };
}

/** Lunes (UTC) de la semana ISO indicada. */
export function inicioSemanaIso(anio: number, numero: number): Date {
  const cuatroEnero = new Date(Date.UTC(anio, 0, 4));
  const dia = cuatroEnero.getUTCDay() || 7;
  const lunesSemana1 = new Date(cuatroEnero);
  lunesSemana1.setUTCDate(cuatroEnero.getUTCDate() - dia + 1);
  const resultado = new Date(lunesSemana1);
  resultado.setUTCDate(lunesSemana1.getUTCDate() + (numero - 1) * 7);
  return resultado;
}

/** Cantidad de semanas ISO del año (52 o 53). */
export function semanasEnAnio(anio: number): number {
  return semanaIso(new Date(anio, 11, 28)).numero;
}

/** Fecha en formato AAAA-MM-DD (hora local). */
export function fechaIso(fecha: Date = new Date()): string {
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${m}-${d}`;
}

/** Suma (o resta) semanas a una semana ISO. */
export function sumarSemanas(s: SemanaAnio, delta: number): SemanaAnio {
  const lunes = inicioSemanaIso(s.anio, s.numero);
  lunes.setUTCDate(lunes.getUTCDate() + delta * 7 + 3);
  return semanaIso(new Date(lunes.getUTCFullYear(), lunes.getUTCMonth(), lunes.getUTCDate()));
}

export function claveSemana(s: SemanaAnio): string {
  return `${s.anio}-S${String(s.numero).padStart(2, '0')}`;
}
