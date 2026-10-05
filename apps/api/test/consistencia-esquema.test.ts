/**
 * Verifica que el esquema Drizzle (servidor) y el registro compartido (celular) coincidan.
 */
import { columnasDe, NOMBRES_TABLAS } from '@kalo/shared';
import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { TABLAS_DRIZZLE } from '../src/sync/tablas';

const TIPOS: Record<string, string[]> = {
  texto: ['PgText', 'PgUUID', 'PgDateString'],
  numero: ['PgDoublePrecision', 'PgInteger', 'PgBigInt53'],
  booleano: ['PgBoolean'],
  json: ['PgJsonb'],
};

describe('consistencia entre el registro de tablas y Drizzle', () => {
  for (const tabla of NOMBRES_TABLAS) {
    it(`${tabla}: mismas columnas, tipos y nulabilidad`, () => {
      const drizzle = getTableColumns(TABLAS_DRIZZLE[tabla]) as Record<
        string,
        { columnType: string; notNull: boolean; name: string }
      >;
      for (const [nombre, def] of Object.entries(columnasDe(tabla))) {
        const c = drizzle[nombre];
        expect(c, `${tabla}.${nombre} falta en Drizzle`).toBeDefined();
        expect(c!.name).toBe(nombre);
        expect(TIPOS[def.tipo], `${tabla}.${nombre}: ${c!.columnType}`).toContain(c!.columnType);
        if (!def.opcional && nombre !== 'server_updated_at') {
          expect(c!.notNull, `${tabla}.${nombre} debería ser NOT NULL`).toBe(true);
        }
      }
    });
  }
});
