// Genera theme.css (tema de Tailwind v4) desde tokens.json.
// Uso: pnpm --filter @kalo/ui-tokens build
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

export function generarCss(tokens) {
  const lineas = [
    '/* ARCHIVO GENERADO por scripts/generar-css.mjs — no editar a mano. */',
    '@theme {',
    '  --radius-*: initial;',
    '  --shadow-*: initial;',
    "  --font-sans: 'Archivo', ui-sans-serif, system-ui, sans-serif;",
    "  --font-portada: 'Anton', 'Archivo', sans-serif;",
  ];
  for (const [grupo, valores] of Object.entries(tokens)) {
    for (const [nombre, valor] of Object.entries(valores)) {
      lineas.push(`  --color-${grupo}-${nombre}: ${valor};`);
    }
  }
  lineas.push('}', '');
  return lineas.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tokens = JSON.parse(readFileSync(join(raiz, 'src/tokens.json'), 'utf8'));
  writeFileSync(join(raiz, 'theme.css'), generarCss(tokens));
  console.info('theme.css generado');
}
