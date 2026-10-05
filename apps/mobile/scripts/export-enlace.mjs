// Exporta la versión web de la app para publicarla en cualquier ruta (enlace compartible,
// subcarpeta de un hosting estático) sin conocer esa ruta de antemano.
//
// 1. Exporta con una ruta base marcadora (/__KALO_BASE__).
// 2. Las rutas de archivos (fuentes, imágenes, fragmentos JS) pasan a resolverse en el
//    navegador contra la carpeta real donde quedó la página (globalThis.__KALO_BASE__).
// 3. La ruta base del enrutador queda vacía; las rutas desconocidas vuelven al inicio
//    (app/+not-found.tsx).
//
// Uso: pnpm --filter @kalo/mobile export:enlace   → apps/mobile/dist-enlace/
//      … export:enlace -- --un-archivo            → además dist-enlace/kalo-campo.html con
//      todo incrustado (JS, CSS y fuentes), para visores que solo aceptan una página.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const MARCA = '/__KALO_BASE__';
const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const salida = join(app, 'dist-enlace');

rmSync(salida, { recursive: true, force: true });
execSync(`npx expo export --platform web --output-dir ${JSON.stringify(salida)}`, {
  cwd: app,
  stdio: 'inherit',
  env: { ...process.env, KALO_WEB_BASE_URL: MARCA, EXPO_OFFLINE: '1', CI: '1' },
});

// Algunos hostings reservan los nombres que empiezan con «_»: la carpeta _expo pasa a expo.
renameSync(join(salida, '_expo'), join(salida, 'expo'));

const base = '(globalThis.__KALO_BASE__||"/")';
const carpetaJs = join(salida, 'expo', 'static', 'js', 'web');
for (const nombre of readdirSync(carpetaJs).filter((n) => n.endsWith('.js'))) {
  const ruta = join(carpetaJs, nombre);
  const original = readFileSync(ruta, 'utf8');
  const js = original
    .replaceAll(`"${MARCA}/assets/`, `${base}+"assets/`)
    .replaceAll(`"${MARCA}/_expo/`, `${base}+"expo/`)
    .replaceAll(MARCA, '');
  if (js !== original) writeFileSync(ruta, js);
}

const html = readFileSync(join(salida, 'index.html'), 'utf8')
  .replaceAll(`${MARCA}/_expo/`, 'expo/')
  .replaceAll(`${MARCA}/`, '')
  .replace(
    '<head>',
    `<head>\n    <script>globalThis.__KALO_BASE__ = new URL('./', document.baseURI).href;</script>`,
  );
writeFileSync(join(salida, 'index.html'), html);
writeFileSync(join(salida, '404.html'), html);

const restantes = readdirSync(carpetaJs).some((n) =>
  readFileSync(join(carpetaJs, n), 'utf8').includes(MARCA),
);
if (restantes || html.includes(MARCA)) throw new Error('Quedaron rutas sin convertir');
console.info(`Listo: ${salida}`);

if (process.argv.includes('--un-archivo')) {
  // Fuentes de la app como data URI (en algunos visores no se pueden pedir archivos aparte).
  const carpetaJsFinal = join(salida, 'expo', 'static', 'js', 'web');
  const entrada = readdirSync(carpetaJsFinal).find((n) => n.startsWith('entry-'));
  let js = readFileSync(join(carpetaJsFinal, entrada), 'utf8');
  js = js.replace(/\(globalThis\.__KALO_BASE__\|\|"\/"\)\+"(assets\/[^"]+\.ttf)"/g, (_c, ruta) => {
    const datos = readFileSync(join(salida, ruta)).toString('base64');
    return JSON.stringify(`data:font/ttf;base64,${datos}`);
  });
  const carpetaCss = join(salida, 'expo', 'static', 'css');
  let css = '';
  try {
    for (const n of readdirSync(carpetaCss))
      css += readFileSync(join(carpetaCss, n), 'utf8') + '\n';
  } catch {
    // sin CSS
  }
  const paginaBase = readFileSync(join(salida, 'index.html'), 'utf8')
    .replace(/<link[^>]*expo\/static\/css[^>]*>\s*/g, '')
    .replace(/<script src="expo\/static\/js\/web\/entry-[^"]+"[^>]*><\/script>/, '<!--APP-->');
  const seguro = (t) => t.replace(/<\/(script|style)/gi, '<\\/$1');
  const pagina = paginaBase
    .replace('</head>', `<style>${seguro(css)}</style>\n</head>`)
    .replace('<!--APP-->', () => `<script>${seguro(js)}</script>`);
  const destino = join(salida, 'kalo-campo.html');
  writeFileSync(destino, pagina);
  console.info(
    `Página única: ${relative(app, destino)} (${(pagina.length / 1048576).toFixed(1)} MB)`,
  );
}
