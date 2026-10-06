/**
 * Migraciones del esquema local.
 * Ejemplo para agregar columnas:
 *   { toVersion: 3, steps: [addColumns({ table: 'cosecha', columns: [{ name: 'x', type: 'number', isOptional: true }] })] }
 */
import { createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
import { columnasWatermelon } from './esquema';

export const migraciones = schemaMigrations({
  migrations: [
    // v2: labores que el caporal asigna a cada trabajador.
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'asignaciones_labor',
          columns: columnasWatermelon('asignaciones_labor'),
        }),
      ],
    },
  ],
});
