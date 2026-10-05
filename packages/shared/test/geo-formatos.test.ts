import { describe, expect, it } from 'vitest';
import {
  areaHectareas,
  convertirArea,
  distanciaMetros,
  esquemaFila,
  filtrarPorPrecision,
  formatearConUnidad,
  formatearNumero,
  hashPinOffline,
  loteEnPosicion,
  puntoEnPoligono,
  simplificarRuta,
  verificarPinOffline,
  type PoligonoGeoJson,
} from '../src';

const cuadro: PoligonoGeoJson = {
  type: 'Polygon',
  coordinates: [
    [
      [-90.0, 14.0],
      [-89.99, 14.0],
      [-89.99, 14.01],
      [-90.0, 14.01],
      [-90.0, 14.0],
    ],
  ],
};

describe('geo', () => {
  it('detecta punto dentro de polígono', () => {
    expect(puntoEnPoligono([-89.995, 14.005], cuadro)).toBe(true);
    expect(puntoEnPoligono([-89.98, 14.005], cuadro)).toBe(false);
    expect(loteEnPosicion([-89.995, 14.005], [{ id: 'L1', poligono: cuadro }])?.id).toBe('L1');
  });

  it('calcula área y distancia razonables', () => {
    // ~1.079 km × 1.106 km ≈ 119 ha
    expect(areaHectareas(cuadro)).toBeGreaterThan(115);
    expect(areaHectareas(cuadro)).toBeLessThan(123);
    expect(distanciaMetros([-90, 14], [-90, 14.001])).toBeCloseTo(111.2, 0);
  });

  it('descarta puntos con precisión peor a 30 m', () => {
    expect(
      filtrarPorPrecision([{ precision: 5 }, { precision: 31 }, { precision: 30 }]),
    ).toHaveLength(2);
  });

  it('simplifica rutas rectas a sus extremos', () => {
    const recta = Array.from({ length: 20 }, (_, i) => ({ lat: 14 + i * 0.0001, lng: -90 }));
    expect(simplificarRuta(recta, 2)).toHaveLength(2);
    const conVuelta = [...recta, { lat: 14.0019, lng: -89.999 }];
    expect(simplificarRuta(conVuelta, 2).length).toBeGreaterThanOrEqual(3);
  });

  it('convierte hectáreas a manzanas', () => {
    expect(convertirArea(0.698737, 'mz')).toBeCloseTo(1, 5);
  });
});

describe('formatos de la guía', () => {
  it('usa punto para miles y coma para decimales', () => {
    expect(formatearNumero(3974)).toBe('3.974');
    expect(formatearNumero(1234567.891, 2)).toBe('1.234.567,89');
    expect(formatearNumero(-1.5, 1)).toBe('-1,5');
    expect(formatearConUnidad(3974, 'cajas/ha/año')).toBe('3.974 cajas/ha/año');
  });
});

describe('PIN offline', () => {
  it('verifica el PIN con sal', () => {
    const h = hashPinOffline('1234', 'abcd');
    expect(verificarPinOffline('1234', 'abcd', h)).toBe(true);
    expect(verificarPinOffline('4321', 'abcd', h)).toBe(false);
  });
});

describe('esquemas desde el registro', () => {
  it('valida una fila de cosecha', () => {
    const e = esquemaFila('cosecha');
    const fila = {
      id: 'a',
      lote_id: 'l',
      fecha: '2026-10-05',
      anio: 2026,
      semana: 41,
      color_cinta_id: 'c',
      racimos_cosechados: 10,
      racimos_perdidos: 0,
      created_at: 1,
      updated_at: 1,
      estado_validacion: 'pendiente',
      _status: 'created',
    };
    const r = e.parse(fila);
    expect(r).not.toHaveProperty('_status');
    expect(() => e.parse({ ...fila, racimos_cosechados: -1 })).toThrow();
    expect(() => e.parse({ ...fila, estado_validacion: 'otro' })).toThrow();
  });
});
