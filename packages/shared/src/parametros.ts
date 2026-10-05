/**
 * Claves y valores por defecto de la tabla `parametros`.
 * Todo lo editable (umbrales, intervalos de GPS, tamaño de celda, factores) se lee de la
 * base de datos; estos valores solo se usan para sembrarla y como respaldo si falta la fila.
 * `pendiente: true` marca datos de negocio que la finca debe confirmar.
 */
import { PUNTOS_FACTOR_REFERENCIA } from './calculos/factor';
import { DISTRIBUCION_COSECHA_REFERENCIA } from './calculos/pronostico';

export interface DefParametro<T = unknown> {
  clave: string;
  valor: T;
  descripcion: string;
  pendiente: boolean;
}

const def = <T>(clave: string, valor: T, descripcion: string, pendiente = false) =>
  ({ clave, valor, descripcion, pendiente }) as DefParametro<T>;

export const PARAMETROS = {
  gps_intervalo_s: def('gps_intervalo_s', 10, 'Intervalo de rastreo GPS (segundos)'),
  gps_distancia_m: def('gps_distancia_m', 10, 'Distancia mínima entre puntos GPS (metros)'),
  gps_precision_max_m: def('gps_precision_max_m', 30, 'Precisión máxima aceptada (metros)'),
  gps_tolerancia_simplificacion_m: def(
    'gps_tolerancia_simplificacion_m',
    3,
    'Tolerancia de simplificación de ruta (metros)',
  ),
  gps_ahorro_bateria_intervalo_s: def(
    'gps_ahorro_bateria_intervalo_s',
    30,
    'Intervalo de rastreo en modo ahorro de batería (segundos)',
  ),
  cobertura_celda_m: def('cobertura_celda_m', 20, 'Tamaño de celda de cobertura (metros)'),
  cobertura_radio_m: def(
    'cobertura_radio_m',
    10,
    'Radio alrededor de la ruta que cuenta como revisado (metros)',
  ),
  sync_intervalo_min: def('sync_intervalo_min', 15, 'Sincronización automática (minutos)'),
  sync_dias_historial: def(
    'sync_dias_historial',
    60,
    'Días de registros de campo que descarga cada celular',
  ),
  foto_max_px: def('foto_max_px', 1600, 'Lado mayor máximo de las fotos (px)'),
  foto_calidad: def('foto_calidad', 0.7, 'Calidad de compresión JPEG (0–1)'),
  retorno_referencia: def('retorno_referencia', 1.85, 'Racimos por planta al año (referencia)'),
  recobro_referencia: def('recobro_referencia', 0.98, 'Recobro de referencia'),
  poblacion_referencia: def('poblacion_referencia', 1600, 'Plantas por hectárea (referencia)'),
  factor_puntos_conocidos: def(
    'factor_puntos_conocidos',
    PUNTOS_FACTOR_REFERENCIA,
    'Puntos conocidos de factor por semana (se interpolan)',
  ),
  distribucion_cosecha: def(
    'distribucion_cosecha',
    DISTRIBUCION_COSECHA_REFERENCIA,
    'Proporción de la cohorte cosechada a las 11, 12 y 13 semanas',
    true,
  ),
  unidad_area: def('unidad_area', 'ha', 'Unidad de área mostrada (ha o mz)'),
  login_intentos_max: def('login_intentos_max', 5, 'Intentos de PIN antes de bloquear 5 minutos'),
  sesion_inactividad_min: def(
    'sesion_inactividad_min',
    30,
    'Minutos sin uso antes de pedir PIN otra vez',
  ),
} as const;

export type ClaveParametro = keyof typeof PARAMETROS;
export type ValorParametro<K extends ClaveParametro> = (typeof PARAMETROS)[K]['valor'];

/** Lee un parámetro desde filas sincronizadas (valor JSON), con respaldo al valor por defecto. */
export function leerParametro<K extends ClaveParametro>(
  filas: readonly { clave: string; valor: string | unknown }[],
  clave: K,
): ValorParametro<K> {
  const fila = filas.find((f) => f.clave === clave);
  if (!fila) return PARAMETROS[clave].valor;
  try {
    return (typeof fila.valor === 'string' ? JSON.parse(fila.valor) : fila.valor) as ValorParametro<K>;
  } catch {
    return PARAMETROS[clave].valor;
  }
}
