/**
 * Adaptador de la base local en web: siempre LokiJS (IndexedDB).
 * En Android/iOS se usa adaptador.native.ts (SQLite con JSI, o LokiJS en Expo Go).
 * Archivo separado para que el bundle web no incluya el adaptador SQLite (usa módulos de Node).
 */
import type { DatabaseAdapter } from '@nozbe/watermelondb';
import { crearAdaptadorLoki } from './adaptador-loki';

export function crearAdaptador(alFallar: (error: Error) => void): DatabaseAdapter {
  return crearAdaptadorLoki(alFallar);
}
