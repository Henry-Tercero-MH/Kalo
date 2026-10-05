import { describe, expect, it } from 'vitest';
import {
  cajasLoteAnio,
  ecuacionProductiva,
  factoresDelAnio,
  interpolarFactor,
  pronosticoSemanal,
  recobroObservado,
  semanaIso,
  sumarSemanas,
  inicioSemanaIso,
  semanasEnAnio,
} from '../src';

describe('ecuación productiva', () => {
  it('reproduce el ejemplo de referencia: 1.600 × 1,85 × 0,98 × 1,37 ≈ 3.974 cajas/ha/año', () => {
    const r = ecuacionProductiva({ poblacion: 1600, retorno: 1.85, recobro: 0.98, factor: 1.37 });
    expect(Math.round(r.cajasHaAnio)).toBe(3974);
    expect(r.racimosHaAnio).toBeCloseTo(2900.8, 1);
  });

  it('calcula las cajas del lote completo', () => {
    expect(
      cajasLoteAnio({ poblacion: 1600, retorno: 1.85, recobro: 0.98, factor: 1.37 }, 10),
    ).toBeCloseTo(39740.96, 1);
  });

  it('rechaza valores inválidos', () => {
    expect(() => ecuacionProductiva({ poblacion: -1, retorno: 1, recobro: 0.9, factor: 1 })).toThrow();
    expect(() => ecuacionProductiva({ poblacion: 1, retorno: 1, recobro: 1.2, factor: 1 })).toThrow();
  });

  it('recobro observado = cosechados / (cosechados + perdidos)', () => {
    expect(recobroObservado(98, 2)).toBe(0.98);
    expect(recobroObservado(0, 0)).toBeNull();
  });
});

describe('factor por semana', () => {
  it('respeta los puntos conocidos', () => {
    expect(interpolarFactor(1)).toBe(1.4);
    expect(interpolarFactor(13)).toBe(1.15);
    expect(interpolarFactor(26)).toBe(1.5);
    expect(interpolarFactor(27)).toBe(1.5);
    expect(interpolarFactor(39)).toBe(1.5);
    expect(interpolarFactor(40)).toBe(1.5);
    expect(interpolarFactor(52)).toBe(1.4);
  });

  it('interpola linealmente entre puntos', () => {
    // Semana 7: a mitad entre 1 (1,40) y 13 (1,15) → 1,275
    expect(interpolarFactor(7)).toBeCloseTo(1.275, 4);
    // Semana 46: entre 40 (1,50) y 52 (1,40) → 1,45
    expect(interpolarFactor(46)).toBeCloseTo(1.45, 4);
    // Semana 33 está entre 27 y 39 (ambas 1,50)
    expect(interpolarFactor(33)).toBe(1.5);
  });

  it('acepta puntos editados', () => {
    expect(interpolarFactor(5, [{ semana: 1, factor: 1 }, { semana: 9, factor: 2 }])).toBe(1.5);
  });

  it('genera 52 semanas', () => {
    const f = factoresDelAnio(52);
    expect(f.size).toBe(52);
    expect(f.get(13)).toBe(1.15);
  });
});

describe('semanas ISO', () => {
  it('calcula semanas conocidas', () => {
    expect(semanaIso(new Date(2026, 0, 1))).toEqual({ anio: 2026, numero: 1 });
    expect(semanaIso(new Date(2026, 9, 5))).toEqual({ anio: 2026, numero: 41 });
    expect(semanaIso(new Date(2021, 0, 3))).toEqual({ anio: 2020, numero: 53 });
  });

  it('suma semanas cruzando el año', () => {
    // 2026 tiene 53 semanas ISO (el 31 de diciembre cae jueves).
    expect(sumarSemanas({ anio: 2026, numero: 50 }, 4)).toEqual({ anio: 2027, numero: 1 });
    expect(sumarSemanas({ anio: 2027, numero: 1 }, -4)).toEqual({ anio: 2026, numero: 50 });
    expect(semanasEnAnio(2026)).toBe(53);
    expect(semanasEnAnio(2027)).toBe(52);
  });

  it('inicio de semana es lunes', () => {
    expect(inicioSemanaIso(2026, 41).toISOString().slice(0, 10)).toBe('2026-10-05');
  });
});

describe('pronóstico semanal', () => {
  const factor = () => 1.4;

  it('racimos por color × recobro × factor de la semana de cosecha', () => {
    const semanas = pronosticoSemanal({
      cohortes: [{ loteId: 'L1', anio: 2026, semana: 30, colorCintaId: 'rojo', racimos: 1000 }],
      cosechas: [],
      recobroPorDefecto: 0.98,
      factorDeSemana: factor,
      distribucion: { 12: 1 },
      semanaActual: { anio: 2026, numero: 40 },
      horizonte: 4,
    });
    const s42 = semanas.find((s) => s.semana === 42)!;
    expect(s42.racimos).toBe(980);
    expect(s42.cajas).toBe(1372);
    expect(s42.porColor).toEqual([{ colorCintaId: 'rojo', racimos: 980 }]);
    expect(semanas.find((s) => s.semana === 41)!.racimos).toBe(0);
  });

  it('usa el factor de cada semana', () => {
    const semanas = pronosticoSemanal({
      cohortes: [{ loteId: 'L1', anio: 2026, semana: 1, colorCintaId: 'azul', racimos: 100 }],
      cosechas: [],
      recobroPorDefecto: 1,
      factorDeSemana: (s) => (s.numero === 13 ? 1.15 : 9),
      distribucion: { 12: 1 },
      semanaActual: { anio: 2026, numero: 10 },
      horizonte: 5,
    });
    expect(semanas.find((s) => s.semana === 13)!.cajas).toBe(115);
  });

  it('descuenta lo ya cosechado y reparte el resto en semanas futuras', () => {
    const semanas = pronosticoSemanal({
      cohortes: [{ loteId: 'L1', anio: 2026, semana: 30, colorCintaId: 'rojo', racimos: 900 }],
      cosechas: [
        {
          loteId: 'L1',
          anio: 2026,
          semana: 41,
          colorCintaId: 'rojo',
          racimosCosechados: 290,
          racimosPerdidos: 10,
        },
      ],
      recobroPorDefecto: 1,
      factorDeSemana: () => 1,
      semanaActual: { anio: 2026, numero: 42 },
      horizonte: 3,
    });
    // Restan 600 racimos repartidos entre semanas 42 y 43 (uniforme).
    expect(semanas.find((s) => s.semana === 42)!.racimos).toBe(300);
    expect(semanas.find((s) => s.semana === 43)!.racimos).toBe(300);
  });

  it('valida que la distribución sume 1', () => {
    expect(() =>
      pronosticoSemanal({
        cohortes: [],
        cosechas: [],
        recobroPorDefecto: 1,
        factorDeSemana: factor,
        distribucion: { 11: 0.5 },
        semanaActual: { anio: 2026, numero: 1 },
        horizonte: 1,
      }),
    ).toThrow();
  });
});
