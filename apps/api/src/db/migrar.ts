/**
 * Aplica las migraciones de Drizzle (carpeta ./drizzle).
 * Uso: pnpm db:migrate
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { crearBaseDatos } from './cliente';

/** Busca apps/api/drizzle subiendo desde este archivo (funciona en src/ y en dist/). */
function carpetaMigraciones(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, 'drizzle', 'meta'))) return join(dir, 'drizzle');
    dir = dirname(dir);
  }
  throw new Error('No se encontró la carpeta de migraciones (drizzle/)');
}

export async function migrar(url: string) {
  const { db, cliente } = crearBaseDatos(url);
  await migrate(db, { migrationsFolder: carpetaMigraciones() });
  await cliente.end();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = process.env.DATABASE_URL ?? 'postgres://kalo:kalo_demo@localhost:5432/kalo_campo';
  migrar(url)
    .then(() => console.info('Migraciones aplicadas'))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
