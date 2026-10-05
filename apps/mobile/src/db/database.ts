import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
import { nuevoId } from '@/utils/ids';
import { esquema } from './esquema';
import { migraciones } from './migraciones';
import { MODELOS } from './modelos';

/**
 * Base local: fuente principal de datos de la app. La interfaz lee SOLO de aquí.
 * Cifrado en reposo: ver docs/decisiones.md (D-007).
 */
// IDs UUID generados en el celular (los registros nacen sin servidor).
setGenerator(nuevoId);

const adaptador = new SQLiteAdapter({
  schema: esquema,
  migrations: migraciones,
  dbName: 'kalo_campo',
  jsi: true,
  onSetUpError: (error) => {
    console.error('No se pudo abrir la base local', error);
  },
});

export const database = new Database({ adapter: adaptador, modelClasses: MODELOS });
