/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Una clave de i18n que no está en es.json se muestra cruda en pantalla («CAPORAL.VACIO…»).
 * Este test exige que toda clave `t('grupo.clave')` exista, salvo que traiga texto de respaldo
 * como segundo argumento (`t('clave', 'texto')`).
 */
const raiz = join(__dirname, '..');
const es = JSON.parse(readFileSync(join(raiz, 'src/i18n/locales/es.json'), 'utf8')) as object;

function existe(clave: string): boolean {
  let nodo: unknown = es;
  for (const parte of clave.split('.')) {
    if (typeof nodo !== 'object' || nodo === null || !(parte in nodo)) return false;
    nodo = (nodo as Record<string, unknown>)[parte];
  }
  return true;
}

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.tsx?$/.test(n) ? [ruta] : [];
  });
}

describe('textos', () => {
  it('toda clave usada con t() existe en es.json o trae texto de respaldo', () => {
    const faltan: string[] = [];
    for (const archivo of [...archivos(join(raiz, 'app')), ...archivos(join(raiz, 'src'))]) {
      const texto = readFileSync(archivo, 'utf8');
      for (const m of texto.matchAll(/\bt\(\s*'([\w]+\.[\w.]+)'\s*([,)])/g)) {
        const [, clave, separador] = m;
        const siguiente = texto.slice(m.index + m[0].length, m.index + m[0].length + 200);
        const conRespaldo = separador === ',' && /^\s*['`]/.test(siguiente);
        if (clave && !conRespaldo && !existe(clave) && !existe(`${clave}_one`))
          faltan.push(`${archivo.slice(raiz.length + 1)}: ${clave}`);
      }
    }
    expect(faltan).toEqual([]);
  });
});
