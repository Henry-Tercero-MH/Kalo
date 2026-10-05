import type { DatabaseAdapter } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { esquema } from './esquema';
import { migraciones } from './migraciones';

/**
 * LokiJS: en el navegador persiste en IndexedDB; en Expo Go (sin IndexedDB) queda en memoria.
 */
export function crearAdaptadorLoki(alFallar: (error: Error) => void): DatabaseAdapter {
  return new LokiJSAdapter({
    schema: esquema,
    migrations: migraciones,
    dbName: 'kalo_campo',
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    onSetUpError: alFallar,
  });
}
