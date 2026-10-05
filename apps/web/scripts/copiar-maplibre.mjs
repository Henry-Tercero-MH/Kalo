// Copia el worker de MapLibre GL a public/ (Turbopack no empaqueta workers de módulo externos).
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const origen = join(dirname(require.resolve('maplibre-gl/package.json')), 'dist');
const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'maplibre');
mkdirSync(destino, { recursive: true });
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) copyFileSync(join(origen, f), join(destino, f));
