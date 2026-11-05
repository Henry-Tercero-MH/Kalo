/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Un nombre de ícono que no está en el mapa de Icono.tsx se dibuja como un cuadro vacío, sin
 * error. Este test lee los nombres escritos en el código y exige que todos existan en el mapa.
 */
const raiz = join(__dirname, '..');

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.tsx?$/.test(n) ? [ruta] : [];
  });
}

const fuenteIcono = readFileSync(join(raiz, 'src/componentes/Icono.tsx'), 'utf8');
const mapa = fuenteIcono.slice(fuenteIcono.indexOf('const ICONOS'), fuenteIcono.indexOf('};'));
const disponibles = new Set([...mapa.matchAll(/^\s+'?([\w-]+)'?:\s*\w+,/gm)].map((m) => m[1]));

const USOS = [/<Icono[^>]*?\snombre="([^"]+)"/g, /\sicono="([^"]+)"/g, /\bicono: '([^']+)'/g];

describe('íconos', () => {
  it('el mapa de Icono.tsx se pudo leer', () => {
    expect(disponibles.size).toBeGreaterThan(40);
    expect(disponibles.has('sincronizar')).toBe(true);
  });

  it('todo nombre de ícono escrito en la app existe en el mapa', () => {
    const faltan: string[] = [];
    for (const archivo of [...archivos(join(raiz, 'app')), ...archivos(join(raiz, 'src'))]) {
      const texto = readFileSync(archivo, 'utf8');
      for (const patron of USOS)
        for (const [, nombre] of texto.matchAll(patron))
          if (nombre && !disponibles.has(nombre))
            faltan.push(`${archivo.slice(raiz.length + 1)}: ${nombre}`);
    }
    expect(faltan).toEqual([]);
  });
});
