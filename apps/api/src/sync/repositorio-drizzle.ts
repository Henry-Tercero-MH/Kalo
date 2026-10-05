/**
 * RepositorioSync sobre PostgreSQL (Drizzle).
 *
 * Coherencia de `server_updated_at`: cada push toma un bloqueo exclusivo por finca
 * (`pg_advisory_xact_lock`) y cada pull uno compartido. Así un pull nunca devuelve una marca
 * de tiempo posterior a escrituras que todavía no se confirmaron (evita perder cambios).
 */
import { REGISTRO_TABLAS, type FilaCruda, type NombreTabla } from '@kalo/shared';
import { and, eq, getTableColumns, gt, gte, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { BaseDatos, Ejecutor } from '../db/cliente';
import { bitacora, dispositivos, permisos, rol_permisos, usuarios } from '../db/esquema';
import { aBaseDatos, aCruda, TABLAS_DRIZZLE } from './tablas';
import type { RepositorioSync, TxSync, UsuarioSync } from './motor';

let ultimaMarca = 0;
/** Marca de tiempo estrictamente creciente dentro del proceso. */
export function marcaServidor(): number {
  ultimaMarca = Math.max(Date.now(), ultimaMarca + 1);
  return ultimaMarca;
}

function col(tabla: NombreTabla, nombre: string): PgColumn {
  const c = (getTableColumns(TABLAS_DRIZZLE[tabla]) as Record<string, PgColumn>)[nombre];
  if (!c) throw new Error(`Columna ${tabla}.${nombre} no existe`);
  return c;
}

/** Permisos efectivos por usuario (desde la base de datos). */
export async function permisosDeUsuarios(
  db: Ejecutor,
  ids: readonly string[],
): Promise<Map<string, UsuarioSync>> {
  const resultado = new Map<string, UsuarioSync>();
  if (ids.length === 0) return resultado;
  const filas = await db
    .select({
      id: usuarios.id,
      fincaId: usuarios.finca_id,
      activo: usuarios.activo,
      borrado: usuarios.deleted_at,
      permiso: permisos.codigo,
    })
    .from(usuarios)
    .leftJoin(
      rol_permisos,
      and(eq(rol_permisos.rol_id, usuarios.rol_id), isNull(rol_permisos.deleted_at)),
    )
    .leftJoin(permisos, and(eq(permisos.id, rol_permisos.permiso_id), isNull(permisos.deleted_at)))
    .where(inArray(usuarios.id, [...ids]));
  for (const f of filas) {
    let u = resultado.get(f.id);
    if (!u) {
      u = { id: f.id, fincaId: f.fincaId, activo: f.activo && !f.borrado, permisos: new Set() };
      resultado.set(f.id, u);
    }
    if (f.permiso) (u.permisos as Set<string>).add(f.permiso);
  }
  return resultado;
}

function crearTx(tx: Ejecutor): TxSync {
  return {
    ahora: marcaServidor,

    async leerCambios(tabla, d, desde, historialDesde) {
      const t = TABLAS_DRIZZLE[tabla];
      const condiciones: SQL[] = [];
      if (desde !== null) condiciones.push(gt(col(tabla, 'server_updated_at'), desde));
      if (tabla === 'empresas') condiciones.push(eq(col(tabla, 'id'), d.empresaId));
      else if (tabla === 'fincas') condiciones.push(eq(col(tabla, 'id'), d.fincaId));
      else {
        condiciones.push(
          or(eq(col(tabla, 'finca_id'), d.fincaId), isNull(col(tabla, 'finca_id'))) as SQL,
        );
      }
      if (REGISTRO_TABLAS[tabla].meta.direccion === 'ambas' && tabla !== 'ordenes_trabajo') {
        condiciones.push(gte(col(tabla, 'created_at'), historialDesde));
      }
      const filas = await tx
        .select()
        .from(t)
        .where(and(...condiciones));
      return filas.map((f) => aCruda(tabla, f as Record<string, unknown>));
    },

    async obtener(tabla, ids) {
      const mapa = new Map<string, FilaCruda>();
      if (ids.length === 0) return mapa;
      const filas = await tx
        .select()
        .from(TABLAS_DRIZZLE[tabla])
        .where(inArray(col(tabla, 'id'), [...ids]));
      for (const f of filas) {
        const cruda = aCruda(tabla, f as Record<string, unknown>);
        mapa.set(cruda.id, cruda);
      }
      return mapa;
    },

    async insertar(tabla, fila) {
      await tx.insert(TABLAS_DRIZZLE[tabla]).values(aBaseDatos(tabla, fila) as never);
    },

    async actualizar(tabla, id, valores) {
      const datos = aBaseDatos(tabla, valores, Object.keys(valores));
      if (Object.keys(datos).length === 0) return;
      await tx
        .update(TABLAS_DRIZZLE[tabla])
        .set(datos as never)
        .where(eq(col(tabla, 'id'), id));
    },

    async bitacora(e) {
      await tx.insert(bitacora).values({
        finca_id: e.fincaId,
        usuario_id: e.usuarioId,
        dispositivo_id: e.dispositivoId,
        accion: e.accion,
        tabla: e.tabla,
        registro_id: e.registroId,
        datos: e.datos ?? null,
        requiere_revision: e.requiereRevision ?? false,
        created_at: e.creadoEn,
      });
    },

    usuarios: (ids) => permisosDeUsuarios(tx, ids),

    async puntoGuardado(fn) {
      // Transacción anidada = SAVEPOINT en la misma conexión.
      return (tx as BaseDatos).transaction(async () => fn());
    },

    async actualizarDispositivo(id, valores) {
      await tx
        .update(dispositivos)
        .set(valores as never)
        .where(eq(dispositivos.id, id));
    },
  };
}

export function crearRepositorioSync(db: BaseDatos): RepositorioSync {
  return {
    lectura: (fincaId, fn) =>
      db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock_shared(hashtext(${`sync:${fincaId}`}))`);
        return fn(crearTx(tx));
      }),
    escritura: (fincaId, fn) =>
      db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`sync:${fincaId}`}))`);
        return fn(crearTx(tx));
      }),
  };
}

/** Ejecuta una escritura del panel con el mismo bloqueo que la sincronización. */
export function escrituraSincronizada<T>(
  db: BaseDatos,
  fincaId: string,
  fn: (tx: Ejecutor, ahora: number) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`sync:${fincaId}`}))`);
    return fn(tx, marcaServidor());
  });
}
