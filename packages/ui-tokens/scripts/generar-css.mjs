// Genera theme.css (tema de Tailwind v4) desde tokens.json.
// Uso: pnpm --filter @kalo/ui-tokens build
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const kebab = (s) => s.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`);

/** Roles semánticos (misma definición que `semantico` en src/index.ts, sin depender de TS). */
export function rolesSemanticos(c) {
  return {
    fondo: c.neutros.n0,
    fondoSuave: c.neutros.n50,
    titulo: c.neutros.n900,
    texto: c.neutros.n700,
    textoSecundario: c.neutros.n500,
    borde: c.neutros.n200,
    bordeFuerte: c.marca.negro,
    acento: c.marca.verde,
    acentoOscuro: c.marca.verde700,
    acentoPresionado: c.marca.verde600,
    bordeControl: c.neutros.n500,
    bordeTocable: c.neutros.n500,
    seleccion: c.marca.verde100,
    superficieInvertida: c.marca.negro,
    textoSobreAcento: c.texto.sobreAcento,
    textoSobreOscuro: c.texto.sobreOscuro,
    velo: 'rgba(20, 19, 17, 0.55)',
    exito: c.estados.exito,
    alerta: c.estados.alerta,
    peligro: c.estados.peligro,
    info: c.estados.info,
    textoAlerta: c.texto.alerta,
    exitoSuave: c.estadosSuaves.exito,
    alertaSuave: c.estadosSuaves.alerta,
    peligroSuave: c.estadosSuaves.peligro,
    infoSuave: c.estadosSuaves.info,
  };
}

export function generarCss(tokens) {
  const lineas = [
    '/* ARCHIVO GENERADO por scripts/generar-css.mjs — no editar a mano. */',
    '@theme {',
    '  --radius-*: initial;',
    // Única excepción a las esquinas rectas: campos de entrada (`bordes.radioCampo`).
    '  --radius-campo: 6px;',
    '  --shadow-*: initial;',
    "  --font-sans: 'Archivo', ui-sans-serif, system-ui, sans-serif;",
    "  --font-portada: 'Anton', 'Archivo', sans-serif;",
  ];
  for (const [grupo, valores] of Object.entries(tokens)) {
    for (const [nombre, valor] of Object.entries(valores)) {
      lineas.push(`  --color-${grupo}-${nombre}: ${valor};`);
    }
  }
  // Roles semánticos: el panel usa `text-titulo`, `border-borde-control`, etc., como la app.
  for (const [rol, valor] of Object.entries(rolesSemanticos(tokens))) {
    lineas.push(`  --color-${kebab(rol)}: ${valor};`);
  }
  lineas.push('}', '');
  return lineas.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tokens = JSON.parse(readFileSync(join(raiz, 'src/tokens.json'), 'utf8'));
  writeFileSync(join(raiz, 'theme.css'), generarCss(tokens));
  console.info('theme.css generado');
}
