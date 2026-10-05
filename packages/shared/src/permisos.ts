/**
 * Permisos con forma `modulo:accion`. Las asignaciones rol → permiso viven en la base
 * de datos (tabla `rol_permisos`) y se editan desde el panel; aquí solo hay utilidades.
 */
import { z } from 'zod';

export const esquemaCodigoPermiso = z
  .string()
  .regex(/^[a-z_]+:[a-z_]+$/, 'El permiso debe tener la forma modulo:accion');

export type ConjuntoPermisos = ReadonlySet<string>;

/** `modulo:*` concede todas las acciones del módulo y `*:*` concede todo. */
export function tienePermiso(permisos: ConjuntoPermisos, requerido: string): boolean {
  if (permisos.has(requerido) || permisos.has('*:*')) return true;
  const [modulo] = requerido.split(':');
  return permisos.has(`${modulo}:*`);
}

export function tieneAlguno(permisos: ConjuntoPermisos, requeridos: readonly string[]): boolean {
  return requeridos.some((r) => tienePermiso(permisos, r));
}

/**
 * Resuelve los códigos de permiso de un rol a partir de las tablas sincronizadas.
 */
export function permisosDeRol(
  rolId: string,
  rolPermisos: readonly { rol_id: string; permiso_id: string; deleted_at?: number | null }[],
  permisos: readonly { id: string; codigo: string; deleted_at?: number | null }[],
): Set<string> {
  const porId = new Map(permisos.filter((p) => !p.deleted_at).map((p) => [p.id, p.codigo]));
  const resultado = new Set<string>();
  for (const rp of rolPermisos) {
    if (rp.rol_id !== rolId || rp.deleted_at) continue;
    const codigo = porId.get(rp.permiso_id);
    if (codigo) resultado.add(codigo);
  }
  return resultado;
}
