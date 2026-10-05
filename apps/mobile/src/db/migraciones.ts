/**
 * Migraciones del esquema local.
 * Ejemplo para la versión 2:
 *   { toVersion: 2, steps: [addColumns({ table: 'cosecha', columns: [{ name: 'x', type: 'number', isOptional: true }] })] }
 */
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migraciones = schemaMigrations({ migrations: [] });
