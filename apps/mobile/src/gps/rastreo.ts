/**
 * Rastreo GPS por tarea: la ruta se graba SOLO mientras hay una tarea o recorrido activo.
 *
 * - Build nativa (tieneGpsSegundoPlano): también con la pantalla apagada (servicio en primer
 *   plano con notificación visible, expo-task-manager).
 * - Expo Go y web: solo con la app abierta (Location.watchPositionAsync). Los puntos se
 *   guardan igual y con la misma lógica de precisión y simplificación.
 *
 * - Intervalo configurable (parámetros gps_intervalo_s / gps_distancia_m) y modo ahorro.
 * - Se descartan puntos con precisión peor a gps_precision_max_m (30 m).
 * - Al finalizar, la ruta se simplifica (Douglas-Peucker) antes de sincronizar.
 */
import { filtrarPorPrecision, leerParametro, longitudRuta, simplificarRuta } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { database } from '@/db/database';
import { coleccion, consultar, crear, actualizar, type ContextoEscritura } from '@/db/repositorio';
import { esWeb, tieneGpsSegundoPlano } from '@/demo/entorno';
import i18n from '@/i18n';
import { almacen } from '@/utils/almacen-seguro';
import { guardarValor, leerValor } from './almacen-ruta';
import { observarPosicion, type Observador } from './observar';

export const TAREA_RASTREO = 'kalo-rastreo-gps';
const CLAVE_RUTA_ACTIVA = 'kalo.ruta_activa';

/** true cuando el recorrido solo se graba con la app abierta (Expo Go / web). */
export const rastreoSoloPrimerPlano = !tieneGpsSegundoPlano;

interface RutaActiva extends ContextoEscritura {
  rutaId: string;
  secuencia: number;
  precisionMax: number;
}

async function leerRutaActiva(): Promise<RutaActiva | null> {
  const v = await leerValor(CLAVE_RUTA_ACTIVA);
  if (!v) return null;
  try {
    return JSON.parse(v) as RutaActiva;
  } catch {
    return null;
  }
}
const guardarRutaActiva = (r: RutaActiva | null) =>
  guardarValor(CLAVE_RUTA_ACTIVA, r ? JSON.stringify(r) : null);

// Escrituras en serie: evita secuencias repetidas si llegan dos lotes de puntos seguidos.
let colaEscritura: Promise<void> = Promise.resolve();

/** Guarda las posiciones recibidas (de la tarea en segundo plano o del observador). */
function registrarPosiciones(posiciones: Location.LocationObject[]): Promise<void> {
  colaEscritura = colaEscritura
    .then(() => escribirPosiciones(posiciones))
    .catch((e) => console.warn('No se pudieron guardar los puntos GPS', e));
  return colaEscritura;
}

async function escribirPosiciones(posiciones: Location.LocationObject[]): Promise<void> {
  const ruta = await leerRutaActiva();
  if (!ruta) return;
  const puntos = filtrarPorPrecision(
    posiciones.map((l) => ({
      lat: l.coords.latitude,
      lng: l.coords.longitude,
      precision: l.coords.accuracy ?? 999,
      hora: l.timestamp,
    })),
    ruta.precisionMax,
  );
  if (puntos.length === 0) return;
  let secuencia = ruta.secuencia;
  await database.write(async () => {
    const lote = puntos.map((p) =>
      coleccion('puntos_ruta').prepareCreate((r) => {
        const valores = {
          ruta_id: ruta.rutaId,
          lat: p.lat,
          lng: p.lng,
          precision_gps: Math.round(p.precision * 10) / 10,
          hora_gps: p.hora,
          secuencia: secuencia++,
          created_at: Date.now(),
          updated_at: Date.now(),
          server_updated_at: null,
          deleted_at: null,
          device_id: ruta.dispositivoId,
          created_by: ruta.usuarioId,
          finca_id: ruta.fincaId,
        };
        for (const [k, v] of Object.entries(valores)) r._setRaw(k, v as never);
      }),
    );
    await database.batch(lote);
  });
  await guardarRutaActiva({ ...ruta, secuencia });
}

// La tarea se define al cargar el módulo (requisito de expo-task-manager).
// En web no hay tareas en segundo plano; en Expo Go se define pero no se usa.
if (!esWeb) {
  try {
    TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
      TAREA_RASTREO,
      async ({ data, error }) => {
        if (error || !data) return;
        await registrarPosiciones(data.locations);
      },
    );
  } catch (e) {
    console.warn('No se pudo definir la tarea de rastreo GPS', e);
  }
}

/** Observador en primer plano (Expo Go / web). */
let observador: Observador | null = null;

async function rastreoEnCurso(): Promise<boolean> {
  if (rastreoSoloPrimerPlano) return observador !== null;
  return Location.hasStartedLocationUpdatesAsync(TAREA_RASTREO).catch(() => false);
}

export async function rutaActiva(): Promise<RutaActiva | null> {
  const r = await leerRutaActiva();
  if (r && !(await rastreoEnCurso())) {
    // La app se cerró (o se recargó la página): se reanuda el rastreo.
    try {
      await arrancarActualizaciones();
    } catch (e) {
      console.warn('No se pudo reanudar el rastreo GPS', e);
    }
  }
  return r;
}

async function arrancarActualizaciones() {
  const params = await consultar('parametros');
  const prefs = await almacen.preferencias();
  const intervalo = Number(
    leerParametro(
      params,
      prefs.ahorroBateria ? 'gps_ahorro_bateria_intervalo_s' : 'gps_intervalo_s',
    ),
  );
  const accuracy = prefs.ahorroBateria ? Location.Accuracy.Balanced : Location.Accuracy.High;
  const distanceInterval = Number(leerParametro(params, 'gps_distancia_m'));

  if (rastreoSoloPrimerPlano) {
    if (observador) return;
    const nuevo = await observarPosicion(
      { accuracy, timeInterval: intervalo * 1000, distanceInterval },
      (p) => void registrarPosiciones([p]),
    );
    // Si otra llamada ya arrancó un observador mientras se esperaba, se suelta este.
    if (observador) nuevo.remove();
    else observador = nuevo;
    return;
  }

  await Location.startLocationUpdatesAsync(TAREA_RASTREO, {
    accuracy,
    timeInterval: intervalo * 1000,
    distanceInterval,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: i18n.t('rutas.notificacionTitulo'),
      notificationBody: i18n.t('rutas.notificacionTexto'),
      notificationColor: '#a0d33e',
      killServiceOnDestroy: false,
    },
  });
}

async function detenerActualizaciones() {
  if (observador) {
    observador.remove();
    observador = null;
  }
  if (!rastreoSoloPrimerPlano && (await rastreoEnCurso())) {
    await Location.stopLocationUpdatesAsync(TAREA_RASTREO);
  }
}

export type ResultadoPermisos = 'ok' | 'sin_primer_plano' | 'sin_segundo_plano';

export async function pedirPermisosRastreo(): Promise<ResultadoPermisos> {
  try {
    const primer = await Location.requestForegroundPermissionsAsync();
    if (primer.status !== 'granted') return 'sin_primer_plano';
  } catch {
    return 'sin_primer_plano';
  }
  // Sin segundo plano en este entorno: basta el permiso con la app abierta.
  if (rastreoSoloPrimerPlano) return 'ok';
  try {
    const fondo = await Location.requestBackgroundPermissionsAsync();
    return fondo.status === 'granted' ? 'ok' : 'sin_segundo_plano';
  } catch {
    return 'sin_segundo_plano';
  }
}

export async function iniciarRuta(
  datos: { tarea: string; loteId: string | null; ordenTrabajoId?: string | null },
  ctx: ContextoEscritura,
): Promise<string> {
  const actual = await leerRutaActiva();
  if (actual) return actual.rutaId;
  const params = await consultar('parametros');
  const ruta = await crear(
    'rutas',
    {
      usuario_id: ctx.usuarioId,
      orden_trabajo_id: datos.ordenTrabajoId ?? null,
      lote_id: datos.loteId,
      tarea: datos.tarea,
      inicio: Date.now(),
      fin: null,
      estado: 'activa',
      distancia_m: 0,
      puntos: 0,
    },
    ctx,
  );
  await guardarRutaActiva({
    ...ctx,
    rutaId: ruta.id,
    secuencia: 0,
    precisionMax: Number(leerParametro(params, 'gps_precision_max_m')),
  });
  await arrancarActualizaciones();
  return ruta.id;
}

export async function finalizarRuta(): Promise<{ puntos: number; distancia: number } | null> {
  const ruta = await leerRutaActiva();
  await detenerActualizaciones();
  // Espera a que terminen de guardarse los últimos puntos recibidos.
  await colaEscritura;
  if (!ruta) return null;
  await guardarRutaActiva(null);

  const params = await consultar('parametros');
  const registros = await coleccion('puntos_ruta')
    .query(
      Q.where('ruta_id', ruta.rutaId),
      Q.where('deleted_at', null),
      Q.sortBy('secuencia', Q.asc),
    )
    .fetch();
  const puntos = registros.map((r) => ({
    id: r.id,
    lat: r.fila.lat,
    lng: r.fila.lng,
    registro: r,
  }));
  const conservados = simplificarRuta(
    puntos,
    Number(leerParametro(params, 'gps_tolerancia_simplificacion_m')),
  );
  const conservar = new Set(conservados.map((p) => p.id));
  // Los puntos descartados nunca se enviaron: son muestras crudas del sensor, no registros.
  const descartar = puntos.filter(
    (p) => !conservar.has(p.id) && p.registro._raw._status === 'created',
  );
  if (descartar.length) {
    await database.write(() =>
      database.batch(descartar.map((p) => p.registro.prepareDestroyPermanently())),
    );
  }
  const distancia = Math.round(longitudRuta(conservados));
  await actualizar('rutas', ruta.rutaId, {
    fin: Date.now(),
    estado: 'finalizada',
    distancia_m: distancia,
    puntos: conservados.length,
  });
  return { puntos: conservados.length, distancia };
}
