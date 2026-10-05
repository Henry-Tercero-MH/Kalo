/**
 * Motor de sincronización (independiente de la base de datos).
 *
 * La lógica vive aquí y habla con un `RepositorioSync`: en producción lo implementa Drizzle
 * (`repositorio-drizzle.ts`) y en las pruebas una versión en memoria. Así se puede probar el
 * escenario de dos celulares editando el mismo registro sin conexión.
 */
import {
  esquemaFila,
  esTablaSincronizable,
  fusionarRegistro,
  REGISTRO_TABLAS,
  TABLAS_SUBIDA,
  tienePermiso,
  type AccionBitacora,
  type AccionDispositivo,
  type Cambios,
  type FilaCruda,
  type NombreTabla,
  type ResultadoRegistroPush,
  type RespuestaPull,
  type RespuestaPush,
  type SolicitudPush,
} from '@kalo/shared';

export interface DispositivoSync {
  id: string;
  fincaId: string;
  empresaId: string;
  estado: string;
}

export interface EntradaBitacora {
  fincaId: string;
  usuarioId: string | null;
  dispositivoId: string | null;
  accion: AccionBitacora;
  tabla: string;
  registroId: string;
  datos?: unknown;
  requiereRevision?: boolean;
  creadoEn: number;
}

export interface UsuarioSync {
  id: string;
  fincaId: string | null;
  activo: boolean;
  permisos: ReadonlySet<string>;
}

export interface TxSync {
  /** Marca de tiempo del servidor, estrictamente creciente. */
  ahora(): number;
  leerCambios(
    tabla: NombreTabla,
    dispositivo: DispositivoSync,
    desde: number | null,
    historialDesde: number,
  ): Promise<FilaCruda[]>;
  obtener(tabla: NombreTabla, ids: readonly string[]): Promise<Map<string, FilaCruda>>;
  insertar(tabla: NombreTabla, fila: FilaCruda): Promise<void>;
  actualizar(tabla: NombreTabla, id: string, valores: Record<string, unknown>): Promise<void>;
  bitacora(entrada: EntradaBitacora): Promise<void>;
  usuarios(ids: readonly string[]): Promise<Map<string, UsuarioSync>>;
  /** Ejecuta `fn` en un punto de guardado: si falla, solo se deshace ese registro. */
  puntoGuardado<T>(fn: () => Promise<T>): Promise<T>;
  actualizarDispositivo(id: string, valores: Record<string, unknown>): Promise<void>;
}

export interface RepositorioSync {
  /** Lectura con bloqueo compartido por finca (no corre a la vez que un push). */
  lectura<T>(fincaId: string, fn: (tx: TxSync) => Promise<T>): Promise<T>;
  /** Escritura con bloqueo exclusivo por finca. */
  escritura<T>(fincaId: string, fn: (tx: TxSync) => Promise<T>): Promise<T>;
}

const DIA_MS = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function accionDispositivo(estado: string): AccionDispositivo {
  if (estado === 'borrado_solicitado' || estado === 'borrado') return 'borrar';
  if (estado === 'bloqueado') return 'bloquear';
  return 'ninguna';
}

// ─── Pull ──────────────────────────────────────────────────────────────────

export async function procesarPull(
  repo: RepositorioSync,
  dispositivo: DispositivoSync,
  lastPulledAt: number | null,
  diasHistorial: number,
): Promise<RespuestaPull> {
  return repo.lectura(dispositivo.fincaId, async (tx) => {
    const timestamp = tx.ahora();
    const accion = accionDispositivo(dispositivo.estado);
    const changes: Cambios = {};
    if (accion !== 'ninguna') return { changes, timestamp, dispositivo: { accion } };

    const historialDesde = timestamp - diasHistorial * DIA_MS;
    for (const tabla of Object.keys(REGISTRO_TABLAS) as NombreTabla[]) {
      const filas = await tx.leerCambios(tabla, dispositivo, lastPulledAt, historialDesde);
      if (lastPulledAt === null) {
        // Primera descarga: solo registros vivos, todos como "created".
        changes[tabla] = { created: filas.filter((f) => !f.deleted_at), updated: [], deleted: [] };
      } else {
        // Los borrados lógicos viajan como "updated" con deleted_at: el celular los oculta.
        changes[tabla] = { created: [], updated: filas, deleted: [] };
      }
    }
    return { changes, timestamp, dispositivo: { accion } };
  });
}

// ─── Push ──────────────────────────────────────────────────────────────────

export interface ResultadoPush extends RespuestaPush {
  /** Registros escritos por tabla (para tareas posteriores como la cobertura). */
  afectados: Partial<Record<NombreTabla, string[]>>;
}

class Rechazo extends Error {}

function columnasNegocio(tabla: NombreTabla): Set<string> {
  return new Set(Object.keys(REGISTRO_TABLAS[tabla].columnas));
}

export async function procesarPush(
  repo: RepositorioSync,
  dispositivo: DispositivoSync,
  solicitud: SolicitudPush,
): Promise<ResultadoPush> {
  const resultados: ResultadoRegistroPush[] = [];
  const afectados: Partial<Record<NombreTabla, string[]>> = {};

  if (accionDispositivo(dispositivo.estado) !== 'ninguna') {
    throw Object.assign(new Error('Dispositivo bloqueado o en proceso de borrado'), {
      statusCode: 423,
    });
  }

  const tablasRecibidas = Object.keys(solicitud.changes);
  for (const t of tablasRecibidas) {
    if (!esTablaSincronizable(t) || !(TABLAS_SUBIDA as string[]).includes(t)) {
      const c = solicitud.changes[t]!;
      const ids = [
        ...c.created.map((f) => String(f.id)),
        ...c.updated.map((f) => String(f.id)),
        ...c.deleted,
      ];
      for (const id of ids) {
        resultados.push({ tabla: t, id, estado: 'rechazado', error: 'Tabla de solo lectura' });
      }
    }
  }

  await repo.escritura(dispositivo.fincaId, async (tx) => {
    const ahora = tx.ahora();

    // Usuarios que crearon los registros (un celular lo comparten varios usuarios).
    const idsUsuarios = new Set<string>();
    for (const t of TABLAS_SUBIDA) {
      const c = solicitud.changes[t];
      if (!c) continue;
      for (const f of [...c.created, ...c.updated]) {
        if (typeof f.created_by === 'string') idsUsuarios.add(f.created_by);
      }
    }
    const usuarios = await tx.usuarios([...idsUsuarios]);

    const autorizar = (tabla: NombreTabla, usuarioId: unknown, nuevo: boolean) => {
      const u = typeof usuarioId === 'string' ? usuarios.get(usuarioId) : undefined;
      if (!u || !u.activo) throw new Rechazo('Usuario desconocido o inactivo');
      if (u.fincaId && u.fincaId !== dispositivo.fincaId) {
        throw new Rechazo('El usuario no pertenece a la finca del dispositivo');
      }
      const permisos = (REGISTRO_TABLAS[tabla].meta as { permisos?: { crear: string; editar?: string } })
        .permisos;
      if (!permisos) throw new Rechazo('Tabla sin permisos de escritura');
      const requerido = nuevo ? permisos.crear : (permisos.editar ?? permisos.crear);
      if (!tienePermiso(u.permisos, requerido)) throw new Rechazo(`Sin permiso ${requerido}`);
      return u;
    };

    for (const tabla of TABLAS_SUBIDA) {
      const cambios = solicitud.changes[tabla];
      if (!cambios) continue;
      const meta = REGISTRO_TABLAS[tabla].meta as { critica?: boolean };
      const negocio = columnasNegocio(tabla);
      const entrantes = [...cambios.created, ...cambios.updated] as Record<string, unknown>[];
      const existentes = await tx.obtener(
        tabla,
        [...entrantes.map((f) => String(f.id)), ...cambios.deleted].filter((id) => UUID.test(id)),
      );

      for (const crudo of entrantes) {
        const id = String(crudo.id);
        try {
          if (!UUID.test(id)) throw new Rechazo('El id debe ser un UUID');
          const parse = esquemaFila(tabla).safeParse(crudo);
          if (!parse.success) {
            throw new Rechazo(
              parse.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
            );
          }
          const fila = { ...parse.data, _changed: crudo._changed } as unknown as FilaCruda;
          if (fila.finca_id && fila.finca_id !== dispositivo.fincaId) {
            throw new Rechazo('El registro pertenece a otra finca');
          }
          const existente = existentes.get(id);

          await tx.puntoGuardado(async () => {
            if (!existente) {
              const usuario = autorizar(tabla, fila.created_by, true);
              const nueva: FilaCruda = {
                ...fila,
                finca_id: dispositivo.fincaId,
                device_id: dispositivo.id,
                server_updated_at: ahora,
              };
              delete (nueva as Record<string, unknown>)._changed;
              if (meta.critica) {
                Object.assign(nueva, {
                  estado_validacion: 'pendiente',
                  validado_por: null,
                  validado_en: null,
                  motivo_rechazo: null,
                });
              }
              await tx.insertar(tabla, nueva);
              await tx.bitacora({
                fincaId: dispositivo.fincaId,
                usuarioId: usuario.id,
                dispositivoId: dispositivo.id,
                accion: 'crear',
                tabla,
                registroId: id,
                creadoEn: ahora,
              });
              resultados.push({ tabla, id, estado: 'aceptado' });
            } else {
              const usuario = autorizar(tabla, fila.created_by ?? existente.created_by, false);
              const fusion = fusionarRegistro(existente, fila, solicitud.lastPulledAt);
              if (fusion.cambiados.length > 0) {
                const valores: Record<string, unknown> = {};
                for (const c of fusion.cambiados) valores[c] = fusion.fila[c];
                valores.updated_at = fusion.fila.updated_at;
                valores.server_updated_at = ahora;
                const tocaNegocio = fusion.cambiados.some((c) => negocio.has(c));
                if (meta.critica && tocaNegocio && existente.estado_validacion !== 'pendiente') {
                  // Un registro validado que se edita vuelve a la bandeja del supervisor.
                  Object.assign(valores, {
                    estado_validacion: 'pendiente',
                    validado_por: null,
                    validado_en: null,
                    motivo_rechazo: null,
                  });
                }
                await tx.actualizar(tabla, id, valores);
                await tx.bitacora({
                  fincaId: dispositivo.fincaId,
                  usuarioId: usuario.id,
                  dispositivoId: dispositivo.id,
                  accion: valores.deleted_at ? 'borrar' : 'editar',
                  tabla,
                  registroId: id,
                  datos: { campos: fusion.cambiados },
                  creadoEn: ahora,
                });
              }
              if (fusion.conflicto && fusion.cambiados.length === 0) {
                // Ganó el servidor: se marca para que el celular reciba la versión vigente.
                await tx.actualizar(tabla, id, { server_updated_at: ahora });
              }
              if (fusion.conflicto) {
                await tx.bitacora({
                  fincaId: dispositivo.fincaId,
                  usuarioId: usuario.id,
                  dispositivoId: dispositivo.id,
                  accion: 'conflicto',
                  tabla,
                  registroId: id,
                  datos: {
                    campos: fusion.camposEnConflicto,
                    servidor: existente,
                    cliente: crudo,
                    resultado: fusion.fila,
                  },
                  requiereRevision: meta.critica === true,
                  creadoEn: ahora,
                });
              }
              resultados.push({
                tabla,
                id,
                estado: fusion.conflicto ? 'fusionado' : 'aceptado',
                conflicto: fusion.conflicto || undefined,
              });
            }
          });
          (afectados[tabla] ??= []).push(id);
        } catch (err) {
          resultados.push({
            tabla,
            id,
            estado: 'rechazado',
            error: err instanceof Rechazo ? err.message : 'Error al guardar el registro',
          });
          if (!(err instanceof Rechazo)) console.error(`[sync] ${tabla}/${id}`, err);
        }
      }

      // WatermelonDB solo envía "deleted" si se usó markAsDeleted: se aplica borrado lógico.
      for (const id of cambios.deleted) {
        const existente = existentes.get(id);
        if (!existente) {
          resultados.push({ tabla, id, estado: 'aceptado' });
          continue;
        }
        try {
          const usuario = autorizar(tabla, existente.created_by, false);
          await tx.puntoGuardado(async () => {
            await tx.actualizar(tabla, id, {
              deleted_at: ahora,
              updated_at: ahora,
              server_updated_at: ahora,
            });
            await tx.bitacora({
              fincaId: dispositivo.fincaId,
              usuarioId: usuario.id,
              dispositivoId: dispositivo.id,
              accion: 'borrar',
              tabla,
              registroId: id,
              creadoEn: ahora,
            });
          });
          resultados.push({ tabla, id, estado: 'aceptado' });
        } catch (err) {
          resultados.push({
            tabla,
            id,
            estado: 'rechazado',
            error: err instanceof Rechazo ? err.message : 'Error al borrar',
          });
        }
      }
    }

    await tx.actualizarDispositivo(dispositivo.id, {
      ultimo_sync: ahora,
      updated_at: ahora,
      ...(solicitud.estado?.versionApp ? { version_app: solicitud.estado.versionApp } : {}),
      ...(solicitud.estado?.registrosPendientes !== undefined
        ? { registros_pendientes: solicitud.estado.registrosPendientes }
        : {}),
      ...(solicitud.estado?.archivosPendientes !== undefined
        ? { archivos_pendientes: solicitud.estado.archivosPendientes }
        : {}),
    });
  });

  const experimentalRejectedIds: Record<string, string[]> = {};
  for (const r of resultados) {
    if (r.estado === 'rechazado') (experimentalRejectedIds[r.tabla] ??= []).push(r.id);
  }
  return { resultados, experimentalRejectedIds, serverTime: Date.now(), afectados };
}
