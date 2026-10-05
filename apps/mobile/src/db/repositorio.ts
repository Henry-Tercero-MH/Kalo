/**
 * Escritura y lectura local. Toda escritura va a WatermelonDB; nunca se espera al servidor.
 * Ningún registro se borra físicamente: el borrado es lógico (`deleted_at`).
 */
import { columnasDe, type Fila, type NombreTabla } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import { database } from './database';
import type { ModeloBase } from './modelos';

export interface ContextoEscritura {
  usuarioId: string;
  fincaId: string;
  dispositivoId: string;
}

/** Columnas comunes que se completan automáticamente al crear. */
type Automaticas = 'id' | 'created_at' | 'updated_at' | 'server_updated_at' | 'deleted_at' | 'device_id' | 'created_by' | 'finca_id';
export type DatosNuevos<T extends NombreTabla> = Omit<Fila<T>, Automaticas> & { id?: string };

export const coleccion = <T extends NombreTabla>(tabla: T) => database.get<ModeloBase<T>>(tabla);

function validarColumnas(tabla: NombreTabla, datos: Record<string, unknown>) {
  const columnas = columnasDe(tabla);
  for (const k of Object.keys(datos)) {
    if (k !== 'id' && !(k in columnas)) throw new Error(`La columna ${tabla}.${k} no existe en el registro`);
  }
}

export async function crear<T extends NombreTabla>(
  tabla: T,
  datos: DatosNuevos<T>,
  ctx: ContextoEscritura,
): Promise<Fila<T>> {
  validarColumnas(tabla, datos as Record<string, unknown>);
  const ahora = Date.now();
  const registro = await database.write(() =>
    coleccion(tabla).create((r) => {
      const { id, ...resto } = datos as Record<string, unknown>;
      if (id) r._raw.id = String(id);
      const valores: Record<string, unknown> = {
        ...resto,
        created_at: ahora,
        updated_at: ahora,
        server_updated_at: null,
        deleted_at: null,
        device_id: ctx.dispositivoId,
        created_by: ctx.usuarioId,
        finca_id: ctx.fincaId,
      };
      for (const [k, v] of Object.entries(valores)) r._setRaw(k, v as never);
    }),
  );
  return registro.fila as Fila<T>;
}

export async function actualizar<T extends NombreTabla>(
  tabla: T,
  id: string,
  cambios: Partial<Fila<T>>,
): Promise<void> {
  validarColumnas(tabla, cambios as Record<string, unknown>);
  await database.write(async () => {
    const r = await coleccion(tabla).find(id);
    await r.update((m) => {
      for (const [k, v] of Object.entries(cambios)) m._setRaw(k, v as never);
      m._setRaw('updated_at', Date.now());
    });
  });
}

export function borrarLogico(tabla: NombreTabla, id: string) {
  return actualizar(tabla, id, { deleted_at: Date.now() } as never);
}

/** Condición base: solo registros vivos. */
export const vivos = (): Clause => Q.where('deleted_at', null);

export async function consultar<T extends NombreTabla>(tabla: T, ...condiciones: Clause[]): Promise<Fila<T>[]> {
  const filas = await coleccion(tabla).query(vivos(), ...condiciones).fetch();
  return filas.map((f) => f.fila as Fila<T>);
}

export async function buscar<T extends NombreTabla>(tabla: T, id: string): Promise<Fila<T> | null> {
  try {
    return (await coleccion(tabla).find(id)).fila as Fila<T>;
  } catch {
    return null;
  }
}
