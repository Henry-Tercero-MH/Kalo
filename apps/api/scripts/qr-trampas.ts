/**
 * Genera el PDF con los QR imprimibles de las trampas: apps/api/salidas/trampas-qr.pdf
 * Uso: pnpm qr:trampas
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { crearBaseDatos } from '../src/db/cliente';
import { fincas } from '../src/db/esquema';
import { generarPdfTrampas } from '../src/modulos/trampas-qr';

const { db, cliente } = crearBaseDatos(process.env.DATABASE_URL ?? 'postgres://kalo:kalo_demo@localhost:5432/kalo_campo');
try {
  const lista = await db.select({ id: fincas.id, nombre: fincas.nombre }).from(fincas);
  mkdirSync('salidas', { recursive: true });
  for (const f of lista) {
    const ruta = join('salidas', `trampas-qr-${f.nombre.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    writeFileSync(ruta, await generarPdfTrampas(db, f.id));
    console.info(`PDF generado: apps/api/${ruta}`);
  }
} finally {
  await cliente.end();
}
