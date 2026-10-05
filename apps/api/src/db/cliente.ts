import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as esquema from './esquema';

export type BaseDatos = PostgresJsDatabase<typeof esquema>;
/** Transacción o base de datos (ambas exponen la misma API). */
export type Ejecutor = BaseDatos | Parameters<Parameters<BaseDatos['transaction']>[0]>[0];

export function crearBaseDatos(url: string) {
  const cliente = postgres(url, {
    max: 10,
    onnotice: () => {},
  });
  const db = drizzle(cliente, { schema: esquema, casing: 'snake_case' });
  return { db, cliente };
}

export { esquema };
