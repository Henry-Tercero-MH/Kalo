// Exporta la versión web de la app para publicarla en cualquier ruta (enlace compartible,
// subcarpeta de un hosting estático) sin conocer esa ruta de antemano.
//
// 1. Exporta con una ruta base marcadora (/__KALO_BASE__).
// 2. Las rutas de archivos (fuentes, imágenes, fragmentos JS) pasan a resolverse en el
//    navegador contra la carpeta real donde quedó la página (globalThis.__KALO_BASE__).
// 3. La ruta base del enrutador también se calcula en el navegador (globalThis.__KALO_RUTA__,
//    p. ej. «/Kalo» en GitHub Pages): la dirección conserva la subcarpeta al navegar.
// 4. 404.html (lo sirve el hosting al recargar una pantalla interna) vuelve a la entrada de
//    la app, que lleva al inicio de sesión o al inicio del día.
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
const rutaEnrutador = '(globalThis.__KALO_RUTA__||"")';
const carpetaJs = join(salida, 'expo', 'static', 'js', 'web');
for (const nombre of readdirSync(carpetaJs).filter((n) => n.endsWith('.js'))) {
  const ruta = join(carpetaJs, nombre);
  const original = readFileSync(ruta, 'utf8');
  const js = original
    .replaceAll(`"${MARCA}/assets/`, `${base}+"assets/`)
    .replaceAll(`"${MARCA}/_expo/`, `${base}+"expo/`)
    .replaceAll(`"${MARCA}"`, rutaEnrutador)
    .replaceAll(MARCA, '');
  if (js !== original) writeFileSync(ruta, js);
}

// Versión de esta exportación (cambia con el código). Si el navegador muestra una copia
// guardada de una versión anterior, version.json (pedido sin caché) la delata y se recarga
// con ?v=<versión>, una dirección nueva que el navegador no tiene guardada. Sin señal no hace nada.
const version = readdirSync(carpetaJs)
  .find((n) => n.startsWith('entry-'))
  .replace(/^entry-|\.js$/g, '');
const comprobarVersion = `(function () {
  var v = new URL('version.json', document.baseURI);
  v.search = 't=' + Date.now();
  fetch(v, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
    if (!d || d.id === '${version}') return;
    try { if (sessionStorage.getItem('kalo-v') === d.id) return; sessionStorage.setItem('kalo-v', d.id); } catch (e) {}
    var u = new URL('./', document.baseURI);
    u.searchParams.set('v', d.id);
    location.replace(u.href);
  }).catch(function () {});
})();`;

const html = readFileSync(join(salida, 'index.html'), 'utf8')
  .replaceAll(`${MARCA}/_expo/`, 'expo/')
  .replaceAll(`${MARCA}/`, '')
  .replace(
    '<head>',
    `<head>\n    <script>${[
      "globalThis.__KALO_BASE__ = new URL('./', document.baseURI).href;",
      // Solo en http(s): en visores incrustados (about:srcdoc, data:) el enrutador va sin base.
      "globalThis.__KALO_RUTA__ = /^https?:$/.test(location.protocol) ? new URL(globalThis.__KALO_BASE__).pathname.replace(/\\/$/, '') : '';",
      "try { localStorage.setItem('kalo-ruta', globalThis.__KALO_RUTA__); } catch (e) {}",
      comprobarVersion,
    ].join('\n')}</script>`,
  );
writeFileSync(join(salida, 'index.html'), html);
writeFileSync(join(salida, 'version.json'), JSON.stringify({ id: version }) + '\n');
// Al recargar una pantalla interna (p. ej. /Kalo/login) el hosting entrega 404.html: se vuelve
// a la entrada de la app. La carpeta se toma de la última visita o del primer tramo de la ruta.
writeFileSync(
  join(salida, '404.html'),
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Kalo Campo</title>
<script>
var ruta = '';
try { ruta = localStorage.getItem('kalo-ruta') || ''; } catch (e) {}
if (ruta && location.pathname.indexOf(ruta + '/') !== 0) ruta = '';
if (!ruta && location.hostname.slice(-10) === '.github.io') ruta = '/' + location.pathname.split('/')[1];
location.replace(location.origin + ruta + '/');
</script></head><body></body></html>
`,
);

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
