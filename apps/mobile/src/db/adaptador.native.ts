/**
 * Adaptador de la base local en Android/iOS: SQLite con JSI en la build nativa;
 * LokiJS en memoria en Expo Go (no trae el módulo nativo de WatermelonDB).
 */
import type { DatabaseAdapter } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { tieneSqliteNativo } from '@/demo/entorno';
import { crearAdaptadorLoki } from './adaptador-loki';
import { esquema } from './esquema';
import { migraciones } from './migraciones';

export function crearAdaptador(alFallar: (error: Error) => void): DatabaseAdapter {
  if (!tieneSqliteNativo) return crearAdaptadorLoki(alFallar);
  return new SQLiteAdapter({
    schema: esquema,
    migrations: migraciones,
    dbName: 'kalo_campo',
    jsi: true,
    onSetUpError: alFallar,
  });
}
