/**
 * Puente entre el registro de tablas compartido y las tablas Drizzle,
 * y conversión entre el formato de sincronización y el de PostgreSQL.
 */
import {
  columnasDe,
  columnasJson,
  NOMBRES_TABLAS,
  type FilaCruda,
  type NombreTabla,
} from '@kalo/shared';
import type { PgTable } from 'drizzle-orm/pg-core';
import * as e from '../db/esquema';

export const TABLAS_DRIZZLE: Record<NombreTabla, PgTable> = {
  empresas: e.empresas,
  fincas: e.fincas,
  lotes: e.lotes,
  usuarios: e.usuarios,
  roles: e.roles,
  permisos: e.permisos,
  rol_permisos: e.rol_permisos,
  cuadrillas: e.cuadrillas,
  cuadrilla_miembros: e.cuadrilla_miembros,
  consentimientos: e.consentimientos,
  colores_cinta: e.colores_cinta,
  semanas: e.semanas,
  plagas: e.plagas,
  muestreos: e.muestreos,
  preaviso_sigatoka: e.preaviso_sigatoka,
  trampas: e.trampas,
  lecturas_trampa: e.lecturas_trampa,
  alertas_fusarium: e.alertas_fusarium,
  enfunde: e.enfunde,
  cosecha: e.cosecha,
  conteos_cinta: e.conteos_cinta,
  trabajadores: e.trabajadores,
  tipos_labor: e.tipos_labor,
  asistencia: e.asistencia,
  labores: e.labores,
  asignaciones_labor: e.asignaciones_labor,
  rutas: e.rutas,
  puntos_ruta: e.puntos_ruta,
  cobertura_lote: e.cobertura_lote,
  ordenes_trabajo: e.ordenes_trabajo,
  archivos: e.archivos,
  modulos: e.modulos,
  definiciones_formulario: e.definiciones_formulario,
  feature_flags: e.feature_flags,
  parametros: e.parametros,
};

const columnasSync = new Map<NombreTabla, string[]>(
  NOMBRES_TABLAS.map((t) => [t, ['id', ...Object.keys(columnasDe(t))]]),
);
const jsonPorTabla = new Map<NombreTabla, Set<string>>(
  NOMBRES_TABLAS.map((t) => [t, new Set(columnasJson(t))]),
);

/** Fila de PostgreSQL → formato de sincronización (solo columnas del registro). */
export function aCruda(tabla: NombreTabla, fila: Record<string, unknown>): FilaCruda {
  const json = jsonPorTabla.get(tabla)!;
  const salida: Record<string, string | number | boolean | null> = {};
  for (const col of columnasSync.get(tabla)!) {
    const v = fila[col];
    if (v === undefined || v === null) salida[col] = null;
    else if (json.has(col)) salida[col] = JSON.stringify(v);
    else if (typeof v === 'bigint') salida[col] = Number(v);
    else salida[col] = v as string | number | boolean;
  }
  return salida as FilaCruda;
}

/** Formato de sincronización → valores para insertar/actualizar en PostgreSQL. */
export function aBaseDatos(
  tabla: NombreTabla,
  fila: Record<string, unknown>,
  soloColumnas?: readonly string[],
): Record<string, unknown> {
  const json = jsonPorTabla.get(tabla)!;
  const permitidas = new Set(soloColumnas ?? columnasSync.get(tabla)!);
  const salida: Record<string, unknown> = {};
  for (const col of columnasSync.get(tabla)!) {
    if (!permitidas.has(col) || !(col in fila)) continue;
    const v = fila[col];
    salida[col] = json.has(col) && typeof v === 'string' ? JSON.parse(v) : (v ?? null);
  }
  return salida;
}

export function columnasDeSync(tabla: NombreTabla): string[] {
  return columnasSync.get(tabla)!;
}
