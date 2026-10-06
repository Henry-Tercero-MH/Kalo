/**
 * Reglas puras para detectar registros repetidos (sin base de datos; se prueban aparte).
 */
import type { NombreTabla } from '@kalo/shared';

/** Columnas que definen «el mismo registro» en cada tabla. */
export const REGLAS_DUPLICADOS: Partial<Record<NombreTabla, readonly string[]>> = {
  asistencia: ['trabajador_id', 'fecha'],
  asignaciones_labor: ['trabajador_id', 'tipo_labor_id', 'lote_id', 'fecha'],
  labores: ['trabajador_id', 'cuadrilla_id', 'tipo_labor_id', 'lote_id', 'fecha', 'cantidad'],
};

export interface Duplicado {
  tabla: NombreTabla;
  /** Registro nuevo que no se enviará. */
  id: string;
  /** Registro que se conserva (enviado antes o primero en la cola). */
  originalId: string;
  fila: Record<string, unknown>;
}

export type Crudo = Record<string, unknown> & { id: string; _status: string; created_at: number };

const clave = (fila: Record<string, unknown>, columnas: readonly string[]) =>
  columnas.map((c) => String(fila[c] ?? '')).join('|');

/**
 * Agrupa por clave y marca como duplicados los nuevos que repiten a otro. Se conserva el ya
 * enviado si existe; si no, el primero que se guardó.
 */
export function marcarDuplicados(
  tabla: NombreTabla,
  filas: Crudo[],
  columnas: readonly string[],
): Duplicado[] {
  const grupos = new Map<string, Crudo[]>();
  for (const f of filas) {
    // Un registro anulado (p. ej. una asignación quitada) no cuenta como original.
    if (f.estado === 'cancelada') continue;
    const k = clave(f, columnas);
    grupos.set(k, [...(grupos.get(k) ?? []), f]);
  }
  const duplicados: Duplicado[] = [];
  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;
    const orden = [...grupo].sort(
      (a, b) =>
        Number(a._status === 'created') - Number(b._status === 'created') ||
        a.created_at - b.created_at,
    );
    const [original, ...resto] = orden;
    for (const f of resto) {
      if (f._status !== 'created') continue;
      duplicados.push({ tabla, id: f.id, originalId: original!.id, fila: f });
    }
  }
  return duplicados;
}
