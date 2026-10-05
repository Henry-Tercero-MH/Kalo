// Copia docs/marca/kalo-logo.png a assets/ y lo activa en la app.
// Uso: pnpm --filter @kalo/mobile marca:logo
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const origen = join(app, '..', '..', 'docs', 'marca', 'kalo-logo.png');
const fuente = join(app, 'src', 'componentes', 'logo-fuente.ts');
if (!existsSync(origen)) {
  console.error('No se encontró docs/marca/kalo-logo.png');
  process.exit(1);
}
copyFileSync(origen, join(app, 'assets', 'kalo-logo.png'));
writeFileSync(
  fuente,
  "// ARCHIVO GENERADO por scripts/usar-logo.mjs.\n// eslint-disable-next-line @typescript-eslint/no-require-imports\nexport const LOGO: number | null = require('../../assets/kalo-logo.png');\n",
);
console.info('Logo activado en la app móvil.');
