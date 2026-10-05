import { Database } from '@nozbe/watermelondb';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
import { nuevoId } from '@/utils/ids';
import { crearAdaptador } from './adaptador';
import { MODELOS } from './modelos';

/**
 * Base local: fuente principal de datos de la app. La interfaz lee SOLO de aquí.
 * Cifrado en reposo: ver docs/decisiones.md (D-007).
 *
 *  - Build nativa: SQLite con JSI.
 *  - Expo Go / web: LokiJS (en web persiste en IndexedDB; en Expo Go queda en memoria).
 *  Ver adaptador.ts (web) y adaptador.native.ts (Android/iOS).
 */
// IDs UUID generados en el celular (los registros nacen sin servidor).
setGenerator(nuevoId);

export const database = new Database({
  adapter: crearAdaptador((error) => {
    console.error('No se pudo abrir la base local', error);
  }),
  modelClasses: MODELOS,
});
