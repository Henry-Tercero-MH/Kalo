import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// @ts-expect-error script JS sin tipos
import { generarCss } from '../scripts/generar-css.mjs';
import { colores, semantico } from '../src/index';

describe('tokens de marca', () => {
  it('todos los colores son hexadecimales válidos de 6 dígitos', () => {
    for (const grupo of Object.values(colores)) {
      for (const valor of Object.values(grupo)) {
        expect(valor).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('respeta las reglas de la guía (títulos, texto y secundario)', () => {
    expect(semantico.titulo).toBe('#141311');
    expect(semantico.texto).toBe('#3a3733');
    expect(semantico.textoSecundario).toBe('#6f6a62');
  });

  it('theme.css está sincronizado con tokens.json', () => {
    const actual = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'theme.css'),
      'utf8',
    );
    expect(actual).toBe(generarCss(colores));
  });
});
