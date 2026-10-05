/**
 * Motor de sincronización del celular.
 *
 *  1. pull + push con `synchronize()` de WatermelonDB contra /v1/sync.
 *  2. Si el push escribió registros, un segundo ciclo descarga la versión del servidor
 *     (así cada registro conoce su versión base para detectar conflictos).
 *  3. Cola de archivos: fotos y notas de voz suben DESPUÉS de los datos.
 * Reintentos con espera exponencial. Ver docs/sincronizacion.md.
 */
import {
  TABLAS_SUBIDA,
  type RespuestaPull,
  type RespuestaPush,
} from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';
import NetInfo from '@react-native-community/netinfo';
import { CONFIG } from '@/config';
import { database } from '@/db/database';
import { coleccion } from '@/db/repositorio';
import { almacen } from '@/utils/almacen-seguro';
import { apiDispositivo, ErrorApi } from './api';
import { procesarColaArchivos, contarArchivosPendientes } from './cola-archivos';
import { useEstadoSync } from './estado';

let enCurso: Promise<void> | null = null;
let reintento: ReturnType<typeof setTimeout> | null = null;
let fallosSeguidos = 0;
type Oyente = () => void;
const oyentesBorrado = new Set<Oyente>();

/** La app se suscribe para volver a la pantalla de configuración tras un borrado remoto. */
export function alBorrarDispositivo(fn: Oyente) {
  oyentesBorrado.add(fn);
  return () => oyentesBorrado.delete(fn);
}

export async function contarPendientes(): Promise<{ total: number; porTabla: Record<string, number> }> {
  const porTabla: Record<string, number> = {};
  let total = 0;
  for (const tabla of TABLAS_SUBIDA) {
    const n = await coleccion(tabla).query(Q.where('_status', Q.oneOf(['created', 'updated']))).fetchCount();
    if (n > 0) porTabla[tabla] = n;
    total += n;
  }
  return { total, porTabla };
}

export async function refrescarContadores() {
  const [{ total, porTabla }, archivos] = await Promise.all([contarPendientes(), contarArchivosPendientes()]);
  useEstadoSync.getState().fijar({ pendientes: total, pendientesPorTabla: porTabla, archivosPendientes: archivos });
}

/** Borra todos los datos locales (borrado remoto ordenado desde el panel). */
export async function borrarDatosLocales(confirmarAlServidor: boolean) {
  if (confirmarAlServidor) {
    try {
      await apiDispositivo('/v1/sync/borrado-confirmado', { method: 'POST', body: {} });
    } catch {
      // Si no se puede confirmar, igual se borran los datos: es la orden recibida.
    }
  }
  await database.write(() => database.unsafeResetDatabase());
  await almacen.borrarTodo();
  oyentesBorrado.forEach((fn) => fn());
}

async function ciclo(): Promise<{ escribio: boolean; borrar: boolean }> {
  let borrar = false;
  let escribio = false;
  const estado = useEstadoSync.getState();
  await synchronize({
    database,
    migrationsEnabledAtVersion: 1,
    pullChanges: async ({ lastPulledAt }) => {
      const r = await apiDispositivo<RespuestaPull>(`/v1/sync/pull?last_pulled_at=${lastPulledAt ?? 'null'}`, { tiempo: 120_000 });
      if (r.dispositivo.accion === 'borrar') borrar = true;
      return { changes: r.changes, timestamp: r.timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      if (borrar) return;
      const { total } = await contarPendientes();
      const r = await apiDispositivo<RespuestaPush>('/v1/sync/push', {
        method: 'POST',
        tiempo: 120_000,
        body: {
          changes,
          lastPulledAt,
          estado: {
            versionApp: CONFIG.versionApp,
            registrosPendientes: total,
            archivosPendientes: await contarArchivosPendientes(),
          },
        },
      });
      escribio = r.resultados.some((x) => x.estado !== 'rechazado');
      estado.fijar({
        rechazados: r.resultados.filter((x) => x.estado === 'rechazado').length,
        conflictos: r.resultados.filter((x) => x.conflicto).length,
      });
      return { experimentalRejectedIds: r.experimentalRejectedIds };
    },
    // Toma la versión remota, conserva los campos editados localmente y la versión base
    // (server_updated_at local) para que el servidor detecte el conflicto. Ver @kalo/shared.
    conflictResolver: (_tabla, local, _remoto, resuelto) => {
      resuelto.server_updated_at = local.server_updated_at;
      return resuelto;
    },
  });
  return { escribio, borrar };
}

function programarReintento() {
  if (reintento) clearTimeout(reintento);
  // 30 s, 60 s, 2 min, 4 min… hasta 15 min.
  const espera = Math.min(15 * 60_000, 30_000 * 2 ** Math.min(fallosSeguidos - 1, 5));
  reintento = setTimeout(() => void sincronizar('reintento'), espera);
}

export type MotivoSync = 'inicio' | 'red' | 'intervalo' | 'manual' | 'reintento' | 'fondo' | 'registro';

/** Sincroniza si hay red. Varias llamadas simultáneas comparten la misma ejecución. */
export function sincronizar(motivo: MotivoSync = 'manual'): Promise<void> {
  enCurso ??= (async () => {
    const estado = useEstadoSync.getState();
    const config = await almacen.configuracion();
    if (!config) return;
    const red = await NetInfo.fetch();
    estado.fijar({ conectado: Boolean(red.isConnected), wifi: red.type === 'wifi' });
    if (!red.isConnected) {
      await refrescarContadores();
      return;
    }
    estado.fijar({ fase: 'sincronizando', ultimoError: null });
    try {
      let r = await ciclo();
      if (r.borrar) return borrarDatosLocales(true);
      if (r.escribio) {
        r = await ciclo();
        if (r.borrar) return borrarDatosLocales(true);
      }
      await procesarColaArchivos();
      fallosSeguidos = 0;
      estado.fijar({ fase: 'inactivo', ultimoEnvio: Date.now() });
    } catch (e) {
      fallosSeguidos++;
      const mensaje = e instanceof ErrorApi ? e.message : String(e);
      estado.fijar({ fase: 'error', ultimoError: mensaje });
      if (e instanceof ErrorApi && e.estado === 423) return; // dispositivo bloqueado
      if (motivo !== 'fondo') programarReintento();
    } finally {
      await refrescarContadores();
    }
  })().finally(() => {
    enCurso = null;
  });
  return enCurso;
}
