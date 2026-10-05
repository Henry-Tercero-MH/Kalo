/**
 * Esquema local de WatermelonDB generado desde el registro compartido (@kalo/shared).
 * Una sola definición para celular y servidor: ver packages/shared/src/tablas/registro.ts.
 */
import { columnasDe, NOMBRES_TABLAS, type NombreTabla } from '@kalo/shared';
import { appSchema, tableSchema, type ColumnSchema } from '@nozbe/watermelondb';

/** Súbala cuando cambie el registro y agregue el paso en migraciones.ts. */
export const VERSION_ESQUEMA = 1;

export function columnasWatermelon(tabla: NombreTabla): ColumnSchema[] {
  return Object.entries(columnasDe(tabla)).map(([name, c]) => ({
    name,
    type: c.tipo === 'numero' ? 'number' : c.tipo === 'booleano' ? 'boolean' : 'string',
    isOptional: c.opcional ?? false,
    isIndexed: c.indexado ?? false,
  }));
}

export const esquema = appSchema({
  version: VERSION_ESQUEMA,
  tables: NOMBRES_TABLAS.map((name) => tableSchema({ name, columns: columnasWatermelon(name) })),
});
