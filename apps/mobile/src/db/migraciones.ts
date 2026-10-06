/**
 * Migraciones del esquema local.
 * Ejemplo para agregar columnas:
 *   { toVersion: 3, steps: [addColumns({ table: 'cosecha', columns: [{ name: 'x', type: 'number', isOptional: true }] })] }
 */
import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
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
    // v3: centro de costo del trabajador y justificación de ausencias.
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'trabajadores',
          columns: [{ name: 'centro_costo', type: 'string', isOptional: true }],
        }),
        addColumns({
          table: 'asistencia',
          columns: [
            { name: 'centro_costo', type: 'string', isOptional: true },
            { name: 'motivo_ausencia', type: 'string', isOptional: true },
            { name: 'nota_ausencia', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
