/**
 * Pronóstico semanal de cajas:
 *   racimos enfundados por color × recobro × factor de la semana de cosecha.
 *
 * Cada cohorte (lote + semana de enfunde + color de cinta) se cosecha entre 11 y 13
 * semanas después. El reparto entre esas semanas es un parámetro (`distribucion_cosecha`);
 * por defecto es uniforme y queda PENDIENTE de confirmar con la finca.
 */
import { redondear } from './factor';
import { claveSemana, sumarSemanas, type SemanaAnio } from './semanas';

export interface CohorteEnfunde {
  loteId: string;
  anio: number;
  semana: number;
  colorCintaId: string;
  racimos: number;
}

export interface CosechaRegistrada {
  loteId: string;
  anio: number;
  semana: number;
  colorCintaId: string;
  racimosCosechados: number;
  racimosPerdidos: number;
}

/** Proporción de la cohorte que se cosecha a cada edad (semanas). Debe sumar 1. */
export type DistribucionCosecha = Record<number, number>;

export const DISTRIBUCION_COSECHA_REFERENCIA: DistribucionCosecha = {
  11: 1 / 3,
  12: 1 / 3,
  13: 1 / 3,
};

export interface EntradaPronostico {
  cohortes: readonly CohorteEnfunde[];
  cosechas: readonly CosechaRegistrada[];
  /** Recobro por lote; si falta se usa `recobroPorDefecto`. */
  recobroPorLote?: ReadonlyMap<string, number>;
  recobroPorDefecto: number;
  /** Factor por semana (clave `AAAA-Snn`). */
  factorDeSemana: (s: SemanaAnio) => number;
  distribucion?: DistribucionCosecha;
  /** Semanas anteriores a esta se consideran cerradas (no se pronostican). */
  semanaActual: SemanaAnio;
  /** Cantidad de semanas a pronosticar desde la actual. */
  horizonte: number;
}

export interface DetalleColor {
  colorCintaId: string;
  racimos: number;
}

export interface SemanaPronostico {
  anio: number;
  semana: number;
  clave: string;
  factor: number;
  racimos: number;
  cajas: number;
  porColor: DetalleColor[];
}

function compararSemanas(a: SemanaAnio, b: SemanaAnio): number {
  return a.anio !== b.anio ? a.anio - b.anio : a.numero - b.numero;
}

export function validarDistribucion(d: DistribucionCosecha): void {
  const suma = Object.values(d).reduce((s, v) => s + v, 0);
  if (Math.abs(suma - 1) > 0.001) {
    throw new Error(`La distribución de cosecha debe sumar 1 (suma ${suma.toFixed(3)})`);
  }
}

export function pronosticoSemanal(e: EntradaPronostico): SemanaPronostico[] {
  const distribucion = e.distribucion ?? DISTRIBUCION_COSECHA_REFERENCIA;
  validarDistribucion(distribucion);
  const edades = Object.keys(distribucion)
    .map(Number)
    .sort((a, b) => a - b);
  const edadMin = edades[0] ?? 11;
  const edadMax = edades[edades.length - 1] ?? 13;

  const semanas: SemanaPronostico[] = [];
  const indice = new Map<string, SemanaPronostico>();
  const colores = new Map<string, Map<string, number>>();
  for (let i = 0; i < e.horizonte; i++) {
    const s = sumarSemanas(e.semanaActual, i);
    const factor = e.factorDeSemana(s);
    const fila: SemanaPronostico = {
      anio: s.anio,
      semana: s.numero,
      clave: claveSemana(s),
      factor,
      racimos: 0,
      cajas: 0,
      porColor: [],
    };
    semanas.push(fila);
    indice.set(fila.clave, fila);
    colores.set(fila.clave, new Map());
  }

  for (const c of e.cohortes) {
    const inicio: SemanaAnio = { anio: c.anio, numero: c.semana };
    const recobro = e.recobroPorLote?.get(c.loteId) ?? e.recobroPorDefecto;
    const esperado = c.racimos * recobro;

    // Cosechas ya registradas de esta cohorte: mismo lote y color, dentro de la ventana.
    const desde = sumarSemanas(inicio, edadMin);
    const hasta = sumarSemanas(inicio, edadMax);
    let yaSalieron = 0;
    for (const k of e.cosechas) {
      if (k.loteId !== c.loteId || k.colorCintaId !== c.colorCintaId) continue;
      const sk: SemanaAnio = { anio: k.anio, numero: k.semana };
      if (compararSemanas(sk, desde) >= 0 && compararSemanas(sk, hasta) <= 0) {
        yaSalieron += k.racimosCosechados + k.racimosPerdidos;
      }
    }
    const restante = Math.max(0, esperado - yaSalieron);
    if (restante === 0) continue;

    // Reparte el restante solo entre las edades que aún no han pasado.
    const futuras = edades
      .map((edad) => ({ edad, s: sumarSemanas(inicio, edad) }))
      .filter(({ s }) => compararSemanas(s, e.semanaActual) >= 0);
    const pesoTotal = futuras.reduce((acc, f) => acc + (distribucion[f.edad] ?? 0), 0);
    if (pesoTotal <= 0) continue;

    for (const { edad, s } of futuras) {
      const fila = indice.get(claveSemana(s));
      if (!fila) continue;
      const racimos = (restante * (distribucion[edad] ?? 0)) / pesoTotal;
      fila.racimos += racimos;
      const porColor = colores.get(fila.clave)!;
      porColor.set(c.colorCintaId, (porColor.get(c.colorCintaId) ?? 0) + racimos);
    }
  }

  for (const fila of semanas) {
    fila.cajas = redondear(fila.racimos * fila.factor, 1);
    fila.racimos = redondear(fila.racimos, 1);
    fila.porColor = [...colores.get(fila.clave)!.entries()].map(([colorCintaId, racimos]) => ({
      colorCintaId,
      racimos: redondear(racimos, 1),
    }));
  }
  return semanas;
}
