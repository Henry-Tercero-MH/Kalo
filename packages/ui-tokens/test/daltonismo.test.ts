import { describe, expect, it } from 'vitest';
import { colores } from '../src/index';

/**
 * Los estados y las series de gráficas deben distinguirse también con daltonismo.
 * Simulación de Machado, Oliveira y Fernandes (2009) con severidad completa; distancia en
 * CIELAB (ΔE 1976). Con ΔE < 20 dos colores se confunden a simple vista.
 */
const MATRICES = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
} as const;
const DELTA_MINIMO = 20;

type Rgb = [number, number, number];

const lineal = (hex: string): Rgb =>
  [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as Rgb;

const simular = (rgb: Rgb, m?: readonly (readonly number[])[]): Rgb =>
  m
    ? (m.map((f) =>
        Math.min(1, Math.max(0, f[0]! * rgb[0] + f[1]! * rgb[1] + f[2]! * rgb[2])),
      ) as Rgb)
    : rgb;

function lab([r, g, b]: Rgb): Rgb {
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const luminancia = (hex: string) => {
  const [r, g, b] = lineal(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

function paresConfundibles(paleta: Record<string, string>): string[] {
  const nombres = Object.keys(paleta);
  const fallas: string[] = [];
  for (const [vision, m] of [['normal', undefined], ...Object.entries(MATRICES)] as const) {
    const puntos = nombres.map((n) => lab(simular(lineal(paleta[n]!), m)));
    for (let i = 0; i < nombres.length; i++)
      for (let j = i + 1; j < nombres.length; j++) {
        const d = Math.hypot(...puntos[i]!.map((v, k) => v - puntos[j]![k]!));
        if (d < DELTA_MINIMO)
          fallas.push(`${vision}: ${nombres[i]}/${nombres[j]} ΔE ${d.toFixed(1)}`);
      }
  }
  return fallas;
}

describe('paleta apta para daltonismo', () => {
  it('los cuatro estados se distinguen con protanopia, deuteranopia y tritanopia', () => {
    expect(paresConfundibles(colores.estados)).toEqual([]);
  });

  it('las cuatro series de gráficas se distinguen entre sí', () => {
    const { serie1, serie2, serie3, serie4 } = colores.graficas;
    expect(paresConfundibles({ serie1, serie2, serie3, serie4 })).toEqual([]);
  });

  it('éxito, peligro e info se leen como texto sobre blanco (4,5:1) y alerta como ícono (3:1)', () => {
    for (const c of [colores.estados.exito, colores.estados.peligro, colores.estados.info])
      expect(contraste(c, colores.neutros.n0)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(colores.estados.alerta, colores.neutros.n0)).toBeGreaterThanOrEqual(3);
  });
});
