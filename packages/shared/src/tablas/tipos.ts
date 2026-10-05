/**
 * Tipos del registro declarativo de tablas sincronizables.
 *
 * Una sola definición alimenta:
 *  - el esquema de WatermelonDB en el celular,
 *  - los esquemas Zod que la API usa para validar `push`,
 *  - las pruebas de consistencia contra el esquema Drizzle del servidor.
 */

export type TipoColumna = 'texto' | 'numero' | 'booleano' | 'json';

export interface DefColumna {
  tipo: TipoColumna;
  /** Admite null. */
  opcional?: boolean;
  /** Crea índice local en WatermelonDB. */
  indexado?: boolean;
  /** Valores permitidos (solo `texto`). */
  valores?: readonly string[];
  /** Límites (solo `numero`). */
  min?: number;
  max?: number;
  /** Solo enteros (solo `numero`). */
  entero?: boolean;
}

export type DireccionSync =
  /** Catálogo: el servidor lo envía; el celular no lo modifica. */
  | 'bajada'
  /** Registro de campo: se crea en el celular y viaja en ambos sentidos. */
  | 'ambas';

export interface MetaTabla {
  direccion: DireccionSync;
  /** Agrega columnas lat, lng, precision_gps, hora_gps. */
  conGps?: boolean;
  /** Agrega estado_validacion y campos del supervisor (tablas críticas). */
  critica?: boolean;
  /** Permisos `modulo:accion` necesarios para crear/editar desde el celular. */
  permisos?: { crear: string; editar?: string };
  /** Si el registro pertenece a una finca (casi todas). */
  porFinca?: boolean;
  /** Etiqueta legible para tablas y bitácora. */
  etiqueta: string;
}

export interface DefTabla {
  meta: MetaTabla;
  columnas: Record<string, DefColumna>;
}

type ValorDe<C extends DefColumna> = C['tipo'] extends 'numero'
  ? number
  : C['tipo'] extends 'booleano'
    ? boolean
    : C['tipo'] extends 'json'
      ? string
      : C['valores'] extends readonly (infer V)[]
        ? V
        : string;

type Nullable<C extends DefColumna, V> = C['opcional'] extends true ? V | null : V;

/** Fila tipada (formato "crudo" de sincronización: JSON viaja como string). */
export type FilaDe<T extends DefTabla> = {
  [K in keyof T['columnas']]: Nullable<T['columnas'][K], ValorDe<T['columnas'][K]>>;
} & ColumnasComunes;

export interface ColumnasComunes {
  id: string;
  created_at: number;
  updated_at: number;
  server_updated_at: number | null;
  deleted_at: number | null;
  device_id: string | null;
  created_by: string | null;
  finca_id: string | null;
}

export interface ColumnasGps {
  lat: number | null;
  lng: number | null;
  precision_gps: number | null;
  hora_gps: number | null;
}

export interface ColumnasValidacion {
  estado_validacion: 'pendiente' | 'validado' | 'rechazado';
  validado_por: string | null;
  validado_en: number | null;
  motivo_rechazo: string | null;
}
