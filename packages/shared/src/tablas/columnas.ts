import { ESTADOS_VALIDACION } from '../constantes';
import { REGISTRO_TABLAS, type NombreTabla } from './registro';
import type {
  ColumnasComunes,
  ColumnasGps,
  ColumnasValidacion,
  DefColumna,
  FilaDe,
} from './tipos';

/** Columnas que llevan todas las tablas sincronizables. */
export const COLUMNAS_COMUNES: Record<keyof Omit<ColumnasComunes, 'id'>, DefColumna> = {
  created_at: { tipo: 'numero' },
  updated_at: { tipo: 'numero' },
  server_updated_at: { tipo: 'numero', opcional: true },
  deleted_at: { tipo: 'numero', opcional: true },
  device_id: { tipo: 'texto', opcional: true },
  created_by: { tipo: 'texto', opcional: true },
  finca_id: { tipo: 'texto', opcional: true, indexado: true },
};

/** Ubicación y hora confiable del GPS. */
export const COLUMNAS_GPS: Record<keyof ColumnasGps, DefColumna> = {
  lat: { tipo: 'numero', opcional: true, min: -90, max: 90 },
  lng: { tipo: 'numero', opcional: true, min: -180, max: 180 },
  precision_gps: { tipo: 'numero', opcional: true, min: 0 },
  hora_gps: { tipo: 'numero', opcional: true },
};

/** Validación del supervisor en tablas críticas. */
export const COLUMNAS_VALIDACION: Record<keyof ColumnasValidacion, DefColumna> = {
  estado_validacion: { tipo: 'texto', valores: ESTADOS_VALIDACION, indexado: true },
  validado_por: { tipo: 'texto', opcional: true },
  validado_en: { tipo: 'numero', opcional: true },
  motivo_rechazo: { tipo: 'texto', opcional: true },
};

/** Columnas que el celular nunca puede escribir (las fija el servidor). */
export const COLUMNAS_SOLO_SERVIDOR = [
  'server_updated_at',
  'validado_por',
  'validado_en',
  'motivo_rechazo',
] as const;

type Reg = typeof REGISTRO_TABLAS;
type MetaDe<T extends NombreTabla> = Reg[T]['meta'];

/** Tipo de una fila cruda (formato WatermelonDB / sincronización). */
export type Fila<T extends NombreTabla> = FilaDe<Reg[T]> &
  (MetaDe<T> extends { conGps: true } ? ColumnasGps : unknown) &
  (MetaDe<T> extends { critica: true } ? ColumnasValidacion : unknown);

/** Devuelve todas las columnas (sin `id`) de una tabla, incluidas las implícitas. */
export function columnasDe(tabla: NombreTabla): Record<string, DefColumna> {
  const def = REGISTRO_TABLAS[tabla];
  const meta = def.meta as { conGps?: boolean; critica?: boolean };
  return {
    ...def.columnas,
    ...COLUMNAS_COMUNES,
    ...(meta.conGps ? COLUMNAS_GPS : {}),
    ...(meta.critica ? COLUMNAS_VALIDACION : {}),
  };
}

/** Nombres de columnas JSON de una tabla (viajan como string, en Postgres son jsonb). */
export function columnasJson(tabla: NombreTabla): string[] {
  return Object.entries(columnasDe(tabla))
    .filter(([, c]) => c.tipo === 'json')
    .map(([n]) => n);
}
