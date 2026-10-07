/**
 * Cálculos para los inicios de gerencia, supervisión y sanidad, a partir de los datos que ya
 * están en el teléfono (funcionan sin señal). Todo se agrupa por semana ISO o por día.
 */
import {
  claveSemana,
  fechaIso,
  semanaIso,
  sumarSemanas,
  type Fila,
  type SemanaAnio,
} from '@kalo/shared';
import { useMemo } from 'react';
import { useConsulta } from '@/db/hooks';

export const SEMANAS_GRAFICA = 8;

/** Las últimas `n` semanas ISO, de la más antigua a la actual. */
export function ultimasSemanas(n = SEMANAS_GRAFICA, hoy = new Date()): SemanaAnio[] {
  const actual = semanaIso(hoy);
  return Array.from({ length: n }, (_, i) => sumarSemanas(actual, i - (n - 1)));
}

/** Los últimos `n` días (AAAA-MM-DD), del más antiguo a hoy. */
export function ultimosDias(n: number, hoy = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - (n - 1 - i));
    return fechaIso(d);
  });
}

const sumarPor = <T>(filas: readonly T[], clave: (f: T) => string, valor: (f: T) => number) => {
  const m = new Map<string, number>();
  for (const f of filas) m.set(clave(f), (m.get(clave(f)) ?? 0) + valor(f));
  return m;
};

/** «S41» para los ejes de las gráficas. */
export const etiquetaSemana = (s: SemanaAnio) => `S${s.numero}`;
/** «lu 06» para los ejes por día. */
export function etiquetaDia(fecha: string) {
  const d = new Date(`${fecha}T12:00:00`);
  const dia = d.toLocaleDateString('es-GT', { weekday: 'short' }).replace('.', '').slice(0, 2);
  return `${dia} ${fecha.slice(8, 10)}`;
}

const claveDe = (f: { anio: number; semana: number }) =>
  claveSemana({ anio: f.anio, numero: f.semana });

/** Producción y personal de la finca: lo que mira el gerente. */
export function useResumenGerencia() {
  const cosecha = useConsulta('cosecha');
  const enfunde = useConsulta('enfunde');
  const asistencia = useConsulta('asistencia');
  const muestreos = useConsulta('muestreos');
  const alertas = useConsulta('alertas_fusarium');
  const semanasCal = useConsulta('semanas');
  const lotes = useConsulta('lotes');
  const labores = useConsulta('labores');

  return useMemo(() => {
    const cosechados = sumarPor(cosecha, claveDe, (f) => f.racimos_cosechados);
    const perdidos = sumarPor(cosecha, claveDe, (f) => f.racimos_perdidos);
    const enfundados = sumarPor(enfunde, claveDe, (f) => f.racimos);

    // Ventana de semanas: sin las primeras vacías (el teléfono guarda pocas semanas).
    const todas = ultimasSemanas();
    const conDatos = (k: string) => (cosechados.get(k) ?? 0) + (enfundados.get(k) ?? 0) > 0;
    const primera = todas.findIndex((x) => conDatos(claveSemana(x)));
    const semanas = todas.slice(Math.max(0, Math.min(primera < 0 ? 0 : primera, todas.length - 4)));
    const claves = semanas.map(claveSemana);
    // Semana de referencia de los indicadores: la última con cosecha (la actual puede estar
    // empezando y aún no tener registros).
    let iRef = claves.length - 1;
    while (iRef > 0 && !(cosechados.get(claves[iRef]!) ?? 0)) iRef--;
    const actual = claves[iRef]!;
    const anterior = claves[iRef - 1] ?? '';
    const semanaReferencia = semanas[iRef]!;
    const factor = new Map(
      semanasCal.map((s) => [claveSemana({ anio: s.anio, numero: s.numero }), s.factor]),
    );
    const cajas = (k: string) => (cosechados.get(k) ?? 0) * (factor.get(k) ?? 0);
    const recobro = (k: string) => {
      const c = cosechados.get(k) ?? 0;
      const p = perdidos.get(k) ?? 0;
      return c + p > 0 ? (c / (c + p)) * 100 : null;
    };

    // Asistencia: % de presentes por día (últimos 6 días con registro, sin domingos vacíos).
    const porDia = new Map<string, { presentes: number; total: number }>();
    for (const a of asistencia) {
      const d = porDia.get(a.fecha) ?? { presentes: 0, total: 0 };
      d.total++;
      if (a.presente) d.presentes++;
      porDia.set(a.fecha, d);
    }
    const dias = [...porDia.keys()].sort().slice(-6);
    const pct = (d?: { presentes: number; total: number }) =>
      d && d.total > 0 ? (d.presentes / d.total) * 100 : null;
    const ausenciasPorMotivo = sumarPor(
      asistencia.filter((a) => !a.presente && dias.includes(a.fecha)),
      (a) => a.motivo_ausencia ?? 'sin_motivo',
      () => 1,
    );

    // Plagas: incidencia promedio por lote en la semana más reciente con muestreos.
    const semanaMuestreo = [...muestreos]
      .map((m) => m.fecha)
      .sort()
      .at(-1);
    const desde = semanaMuestreo
      ? fechaIso(new Date(new Date(`${semanaMuestreo}T12:00:00`).getTime() - 6 * 86_400_000))
      : null;
    const recientes = desde ? muestreos.filter((m) => m.fecha >= desde) : [];
    const porLote = new Map<string, number[]>();
    for (const m of recientes)
      porLote.set(m.lote_id, [...(porLote.get(m.lote_id) ?? []), m.incidencia]);
    const nombreLote = new Map(lotes.map((l) => [l.id, l.nombre.replace(/\s*DEMO$/i, '')]));
    const incidencia = [...porLote.entries()]
      .map(([id, v]) => ({
        etiqueta: nombreLote.get(id) ?? '—',
        valor: v.reduce((s, x) => s + x, 0) / v.length,
      }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));

    const alertasAbiertas = alertas.filter((a: Fila<'alertas_fusarium'>) =>
      ['sospecha', 'en_revision'].includes(a.estado),
    ).length;
    const laboresSemana = labores.filter((l) => {
      const s = semanaIso(new Date(`${l.fecha}T12:00:00`));
      return claveSemana(s) === actual;
    }).length;

    return {
      semanas,
      claves,
      semanaReferencia,
      cosecha: {
        actual: cosechados.get(actual) ?? 0,
        anterior: cosechados.get(anterior) ?? 0,
        serie: claves.map((k) => [cosechados.get(k) ?? 0, perdidos.get(k) ?? 0]),
      },
      cajas: {
        actual: cajas(actual),
        anterior: cajas(anterior),
        serie: claves.map((k) => [cajas(k)]),
      },
      recobro: { actual: recobro(actual), anterior: recobro(anterior) },
      enfunde: {
        actual: enfundados.get(actual) ?? 0,
        anterior: enfundados.get(anterior) ?? 0,
        serie: claves.map((k) => [enfundados.get(k) ?? 0]),
      },
      asistencia: {
        dias,
        serie: dias.map((d) => [pct(porDia.get(d)) ?? 0]),
        ultimo: pct(porDia.get(dias.at(-1) ?? '')),
        penultimo: pct(porDia.get(dias.at(-2) ?? '')),
        ausenciasPorMotivo,
      },
      incidencia,
      alertasAbiertas,
      laboresSemana,
    };
  }, [cosecha, enfunde, asistencia, muestreos, alertas, semanasCal, lotes, labores]);
}
