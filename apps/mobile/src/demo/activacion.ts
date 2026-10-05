/**
 * Entrar y salir del modo demo (sin servidor).
 *
 *  - `configurarDemo()`: deja el dispositivo configurado con la Finca Demo y carga los datos
 *    DEMO en la base local como registros ya sincronizados.
 *  - `salirDelDemo()`: borra la base local y el almacén; la app vuelve a «Configurar».
 */
import { bytesToHex } from '@noble/ciphers/utils';
import * as Crypto from 'expo-crypto';
import { database } from '@/db/database';
import { cargarConfiguracion } from '@/permisos/contexto';
import { useSesion } from '@/permisos/sesion';
import { contarPendientes } from '@/sync/motor';
import { useEstadoSync } from '@/sync/estado';
import { almacen } from '@/utils/almacen-seguro';
import { cargarPullEnBase } from './carga';
import { ajustarFechasDemo } from './fechas';
import { DATOS_DEMO, DISPOSITIVO_DEMO_ID, esModoDemo, fijarModoDemo } from './modo';

/** Error cuando el dispositivo real tiene registros sin enviar al servidor. */
export class ErrorPendientesSinEnviar extends Error {
  constructor(public pendientes: number) {
    super(`Hay ${pendientes} registros sin enviar al servidor`);
  }
}

export async function activarModoDemo() {
  await almacen.guardarModoDemo(true);
  fijarModoDemo(true);
}

export async function desactivarModoDemo() {
  await almacen.guardarModoDemo(false);
  fijarModoDemo(false);
}

export async function configurarDemo(ahora: Date = new Date()): Promise<void> {
  // Nunca borrar registros reales que aún no llegaron al servidor.
  const existente = await almacen.configuracion();
  if (existente && !esModoDemo()) {
    const { total } = await contarPendientes();
    if (total > 0) throw new ErrorPendientesSinEnviar(total);
  }

  useSesion.getState().cerrar();
  await database.write(() => database.unsafeResetDatabase());
  await almacen.borrarTodo();
  // Datos DEMO con las fechas llevadas a esta semana, como registros ya sincronizados.
  await cargarPullEnBase(database, ajustarFechasDemo(DATOS_DEMO, ahora));

  const { finca } = DATOS_DEMO;
  await almacen.guardarConfiguracion({
    apiUrl: 'demo',
    dispositivoId: DISPOSITIVO_DEMO_ID,
    fincaId: finca.id,
    fincaNombre: finca.nombre,
    bbox: finca.bbox,
    claveRespaldo: bytesToHex(Crypto.getRandomBytes(32)),
    configuradoEn: Date.now(),
  });
  await activarModoDemo();
  useEstadoSync.getState().fijar({
    fase: 'inactivo',
    ultimoEnvio: Date.now(),
    ultimoError: null,
    rechazados: 0,
    conflictos: 0,
  });
  await cargarConfiguracion();
}

export async function salirDelDemo(): Promise<void> {
  useSesion.getState().cerrar();
  await database.write(() => database.unsafeResetDatabase());
  await almacen.borrarTodo();
  fijarModoDemo(false);
  useEstadoSync.getState().fijar({
    fase: 'inactivo',
    pendientes: 0,
    pendientesPorTabla: {},
    archivosPendientes: 0,
    ultimoEnvio: null,
    ultimoError: null,
  });
  await cargarConfiguracion();
}
