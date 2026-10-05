/**
 * Exporta los datos DEMO de la base al formato de pull de la app móvil, para el modo demo
 * sin servidor (Expo Go / navegador). Uso: pnpm --filter @kalo/api demo:movil
 * Salida: apps/mobile/src/demo/datos-demo.json
 */
import '../src/lib/zona-horaria';
import { writeFileSync } from 'node:fs';
import { fechaIso } from '@kalo/shared';
import { join } from 'node:path';
import { crearBaseDatos } from '../src/db/cliente';
import { fincas } from '../src/db/esquema';
import { procesarPull } from '../src/sync/motor';
import { crearRepositorioSync } from '../src/sync/repositorio-drizzle';

const { db, cliente } = crearBaseDatos(process.env.DATABASE_URL ?? 'postgres://kalo:kalo_demo@localhost:5432/kalo_campo');
try {
  const [finca] = await db.select().from(fincas);
  if (!finca) throw new Error('No hay datos: ejecute pnpm seed');
  const r = await procesarPull(
    crearRepositorioSync(db),
    { id: 'demo', fincaId: finca.id, empresaId: finca.empresa_id, estado: 'activo' },
    null,
    21,
  );
  // Sin datos que el celular no necesita para el demo; el pull ya filtra por finca.
  const salida = {
    generado: new Date().toISOString(),
    // Fecha en la zona horaria de la finca (el celular puede estar en otra).
    fechaReferencia: fechaIso(new Date()),
    finca: { id: finca.id, nombre: finca.nombre, bbox: finca.bbox },
    timestamp: r.timestamp,
    changes: r.changes,
  };
  const ruta = join(import.meta.dirname, '..', '..', 'mobile', 'src', 'demo', 'datos-demo.json');
  writeFileSync(ruta, JSON.stringify(salida));
  const n = Object.values(r.changes).reduce((s, c) => s + c.created.length, 0);
  console.info(`Exportados ${n} registros DEMO → ${ruta}`);
} finally {
  await cliente.end();
}
