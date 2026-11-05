import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// @ts-expect-error script JS sin tipos
import { generarCss, rolesSemanticos } from '../scripts/generar-css.mjs';
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

  it('los roles exportados a theme.css coinciden con `semantico`', () => {
    expect(rolesSemanticos(colores)).toEqual(semantico);
  });

  it('textoAlerta y los estados sobre su fondo suave cumplen 4,5:1 como texto', () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const contraste = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x! + 0.05) / (y! + 0.05);
    };
    expect(contraste(semantico.textoAlerta, semantico.fondo)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(semantico.textoAlerta, semantico.alertaSuave)).toBeGreaterThanOrEqual(4.5);
    for (const e of ['exito', 'peligro', 'info'] as const)
      expect(contraste(semantico[e], semantico[`${e}Suave`])).toBeGreaterThanOrEqual(4.5);
  });
});
