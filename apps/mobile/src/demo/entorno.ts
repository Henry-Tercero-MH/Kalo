/**
 * Capacidades del entorno donde corre la app.
 *
 *  - Build de desarrollo / producción (Android): todo nativo (WatermelonDB SQLite/JSI,
 *    MapLibre, rastreo GPS en segundo plano, almacén seguro).
 *  - Expo Go: sin módulos nativos propios → base LokiJS en memoria y mapa SVG.
 *  - Web (navegador del celular): base LokiJS en IndexedDB, mapa SVG, almacén en localStorage.
 *
 * Contrato compartido por la base local, el mapa, el GPS y el modo demo.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export const esWeb = Platform.OS === 'web';
export const esExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** WatermelonDB con SQLite nativo (si no, se usa LokiJS). */
export const tieneSqliteNativo = !esWeb && !esExpoGo;
/** MapLibre nativo (si no, mapa SVG con los polígonos locales). */
export const tieneMapLibre = !esWeb && !esExpoGo;
/** Rastreo GPS con la pantalla apagada (si no, solo con la app abierta). */
export const tieneGpsSegundoPlano = !esWeb && !esExpoGo;
