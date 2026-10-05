/**
 * Ajuste de fechas de los datos DEMO (función pura, sin dependencias de React Native).
 *
 * Los datos se generaron un día concreto (`generado`). Para que «esta semana», la cobertura
 * de la semana y las órdenes de hoy tengan sentido al abrir el demo otro día, se desplazan
 * todas las fechas un múltiplo de 7 días: la semana ISO actual pasa a ser la semana en que
 * se generaron los datos (así el día de la semana de cada registro se conserva).
 *
 * Excepciones:
 *  - `semanas` (calendario de 3 años con su color de cinta) no se toca.
 *  - `ordenes_trabajo`: se mueven por días para que las órdenes del día del demo queden HOY.
 */
import { fechaIso, inicioSemanaIso, semanaIso, sumarSemanas } from '@kalo/shared';

export interface PullDemo {
  generado: string;
  /** Fecha (AAAA-MM-DD) de la finca al exportar; evita depender de la zona horaria del celular. */
  fechaReferencia?: string;
  timestamp: number;
  changes: Record<
    string,
    { created: Record<string, unknown>[]; updated: unknown[]; deleted: string[] }
  >;
}

const DIA_MS = 86_400_000;

/** Campos con milisegundos desde 1970. */
const CAMPOS_HORA = [
  'created_at',
  'updated_at',
  'server_updated_at',
  'hora_gps',
  'inicio',
  'fin',
  'hora_entrada',
  'validado_en',
] as const;

/** Tablas con columnas `anio` + `semana` (semana ISO del registro). */
const TABLAS_CON_SEMANA = new Set(['enfunde', 'cosecha', 'preaviso_sigatoka', 'cobertura_lote']);

/** Tablas que no se desplazan. */
const TABLAS_FIJAS = new Set(['semanas']);

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Suma días a una fecha AAAA-MM-DD (aritmética en UTC: sin problemas de horario de verano). */
export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number) as [number, number, number];
  const r = new Date(Date.UTC(a, m - 1, d + dias));
  return r.toISOString().slice(0, 10);
}

function diasEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split('-').map(Number) as [number, number, number];
  const [a2, m2, d2] = hasta.split('-').map(Number) as [number, number, number];
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / DIA_MS);
}

/** Semanas (múltiplo de 7 días) entre la semana de `generado` y la de `ahora` (hora local). */
export function semanasDeDesplazamiento(generado: Date, ahora: Date): number {
  const sg = semanaIso(generado);
  const sa = semanaIso(ahora);
  const lunesG = inicioSemanaIso(sg.anio, sg.numero).getTime();
  const lunesA = inicioSemanaIso(sa.anio, sa.numero).getTime();
  return Math.round((lunesA - lunesG) / (7 * DIA_MS));
}

function desplazarFila(
  tabla: string,
  fila: Record<string, unknown>,
  semanas: number,
  diasFecha: number,
): Record<string, unknown> {
  const r: Record<string, unknown> = { ...fila };
  const ms = semanas * 7 * DIA_MS;
  for (const campo of CAMPOS_HORA) {
    const v = r[campo];
    if (typeof v === 'number') r[campo] = v + ms;
  }
  if (typeof r.fecha === 'string' && ES_FECHA.test(r.fecha)) {
    r.fecha = sumarDias(r.fecha, diasFecha);
  }
  if (
    semanas !== 0 &&
    TABLAS_CON_SEMANA.has(tabla) &&
    typeof r.anio === 'number' &&
    typeof r.semana === 'number'
  ) {
    const s = sumarSemanas({ anio: r.anio, numero: r.semana }, semanas);
    r.anio = s.anio;
    r.semana = s.numero;
  }
  return r;
}

/**
 * Devuelve una copia de los datos DEMO con las fechas desplazadas a la semana de `ahora`.
 * No modifica el objeto recibido.
 */
export function ajustarFechasDemo<T extends PullDemo>(datos: T, ahora: Date = new Date()): T {
  const referencia = datos.fechaReferencia
    ? new Date(`${datos.fechaReferencia}T12:00:00`)
    : new Date(datos.generado);
  const semanas = semanasDeDesplazamiento(referencia, ahora);

  // Órdenes de trabajo: las del último día con órdenes pasan a ser las de hoy.
  const ordenes = datos.changes.ordenes_trabajo?.created ?? [];
  const fechasOrdenes = ordenes
    .map((o) => o.fecha)
    .filter((f): f is string => typeof f === 'string' && ES_FECHA.test(f))
    .sort();
  const ultimaOrden = fechasOrdenes[fechasOrdenes.length - 1];
  const diasOrdenes = ultimaOrden ? diasEntre(ultimaOrden, fechaIso(ahora)) : semanas * 7;

  if (semanas === 0 && diasOrdenes === 0) return datos;

  const changes: PullDemo['changes'] = {};
  for (const [tabla, c] of Object.entries(datos.changes)) {
    if (TABLAS_FIJAS.has(tabla)) {
      changes[tabla] = c;
      continue;
    }
    const diasFecha = tabla === 'ordenes_trabajo' ? diasOrdenes : semanas * 7;
    changes[tabla] = {
      ...c,
      created: c.created.map((f) => desplazarFila(tabla, f, semanas, diasFecha)),
      updated: c.updated.map((f) =>
        f && typeof f === 'object'
          ? desplazarFila(tabla, f as Record<string, unknown>, semanas, diasFecha)
          : f,
      ),
    };
  }
  const timestamp = Math.min(datos.timestamp + semanas * 7 * DIA_MS, ahora.getTime());
  return { ...datos, timestamp, changes };
}
