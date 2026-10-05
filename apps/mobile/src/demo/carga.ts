/**
 * Carga de un pull completo en la base local como registros ya sincronizados
 * (`_status: 'synced'`), usando el mismo `synchronize()` de WatermelonDB que el motor.
 */
import type { Database } from '@nozbe/watermelondb';
import { synchronize, type SyncDatabaseChangeSet } from '@nozbe/watermelondb/sync';
import type { PullDemo } from './fechas';

export async function cargarPullEnBase(database: Database, datos: PullDemo): Promise<void> {
  await synchronize({
    database,
    migrationsEnabledAtVersion: 1,
    pullChanges: async () => ({
      changes: datos.changes as unknown as SyncDatabaseChangeSet,
      timestamp: datos.timestamp,
    }),
  });
}

/**
 * Sincronización simulada: sin cambios remotos y con un push que «acepta» todo.
 * WatermelonDB marca así como sincronizados los registros locales creados o editados.
 */
export async function marcarTodoSincronizado(database: Database): Promise<void> {
  await synchronize({
    database,
    migrationsEnabledAtVersion: 1,
    pullChanges: async () => ({ changes: {}, timestamp: Date.now() }),
    pushChanges: async () => {},
  });
}
