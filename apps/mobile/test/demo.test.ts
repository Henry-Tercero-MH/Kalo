import { fechaIso, semanaIso } from '@kalo/shared';
import {
  ajustarFechasDemo,
  semanasDeDesplazamiento,
  sumarDias,
  type PullDemo,
} from '../src/demo/fechas';
import datosReales from '../src/demo/datos-demo.json';

const DIA = 86_400_000;

/** Datos mínimos: generados el miércoles 23-09-2026 (semana ISO 39) al mediodía UTC. */
function datosPrueba(): PullDemo {
  const t = Date.UTC(2026, 8, 23, 12);
  return {
    generado: '2026-09-23T12:00:00.000Z',
    timestamp: t,
    changes: {
      enfunde: {
        created: [
          {
            id: 'e1',
            fecha: '2026-09-21',
            anio: 2026,
            semana: 39,
            created_at: t,
            updated_at: t,
            server_updated_at: t,
            hora_gps: t - 1000,
            racimos: 10,
          },
        ],
        updated: [],
        deleted: [],
      },
      rutas: {
        created: [{ id: 'r1', inicio: t, fin: t + 3600_000, created_at: t }],
        updated: [],
        deleted: [],
      },
      asistencia: {
        created: [{ id: 'a1', fecha: '2026-09-22', hora_entrada: t, presente: true }],
        updated: [],
        deleted: [],
      },
      ordenes_trabajo: {
        created: [
          { id: 'o1', fecha: '2026-09-23', estado: 'pendiente' },
          { id: 'o2', fecha: '2026-09-22', estado: 'completada' },
        ],
        updated: [],
        deleted: [],
      },
      semanas: {
        created: [{ id: 's1', anio: 2026, numero: 39, fecha_inicio: '2026-09-21', created_at: t }],
        updated: [],
        deleted: [],
      },
    },
  };
}

const fila = (d: PullDemo, tabla: string, i = 0) => d.changes[tabla]!.created[i]!;

describe('sumarDias', () => {
  it('cruza meses y años', () => {
    expect(sumarDias('2026-09-28', 7)).toBe('2026-10-05');
    expect(sumarDias('2026-12-28', 7)).toBe('2027-01-04');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('semanasDeDesplazamiento', () => {
  it('es 0 en la misma semana ISO y cuenta semanas completas', () => {
    const g = new Date(2026, 8, 23, 12);
    expect(semanasDeDesplazamiento(g, new Date(2026, 8, 21, 8))).toBe(0);
    expect(semanasDeDesplazamiento(g, new Date(2026, 8, 27, 20))).toBe(0);
    expect(semanasDeDesplazamiento(g, new Date(2026, 8, 28, 8))).toBe(1);
    expect(semanasDeDesplazamiento(g, new Date(2027, 0, 6, 8))).toBe(15);
    expect(semanasDeDesplazamiento(g, new Date(2026, 8, 10, 8))).toBe(-2);
  });
});

describe('ajustarFechasDemo', () => {
  it('no cambia nada si es la misma semana y el mismo día de las órdenes', () => {
    const d = datosPrueba();
    expect(ajustarFechasDemo(d, new Date(2026, 8, 23, 9))).toBe(d);
  });

  it('desplaza fechas y horas un múltiplo de 7 días sin modificar el original', () => {
    const d = datosPrueba();
    const copia = JSON.parse(JSON.stringify(d)) as PullDemo;
    const ahora = new Date(2026, 9, 7, 9); // miércoles, semana 41 → 2 semanas después
    const r = ajustarFechasDemo(d, ahora);
    expect(d).toEqual(copia);

    const e = fila(r, 'enfunde');
    expect(e.fecha).toBe('2026-10-05');
    expect(e.created_at).toBe((fila(d, 'enfunde').created_at as number) + 14 * DIA);
    expect(e.updated_at).toBe((fila(d, 'enfunde').updated_at as number) + 14 * DIA);
    expect(e.server_updated_at).toBe((fila(d, 'enfunde').server_updated_at as number) + 14 * DIA);
    expect(e.hora_gps).toBe((fila(d, 'enfunde').hora_gps as number) + 14 * DIA);
    expect(e.racimos).toBe(10);
    expect({ anio: e.anio, semana: e.semana }).toEqual({ anio: 2026, semana: 41 });

    const ruta = fila(r, 'rutas');
    expect(ruta.inicio).toBe((fila(d, 'rutas').inicio as number) + 14 * DIA);
    expect(ruta.fin).toBe((fila(d, 'rutas').fin as number) + 14 * DIA);

    const a = fila(r, 'asistencia');
    expect(a.fecha).toBe('2026-10-06');
    expect(a.hora_entrada).toBe((fila(d, 'asistencia').hora_entrada as number) + 14 * DIA);

    // La semana actual coincide con la semana de los registros desplazados.
    const s = semanaIso(ahora);
    expect(semanaIso(new Date(`${e.fecha as string}T12:00:00`))).toEqual(s);
  });

  it('no desplaza el calendario de semanas', () => {
    const d = datosPrueba();
    const r = ajustarFechasDemo(d, new Date(2026, 9, 7, 9));
    expect(r.changes.semanas).toBe(d.changes.semanas);
  });

  it('las órdenes de trabajo del último día quedan para hoy', () => {
    const d = datosPrueba();
    const ahora = new Date(2026, 9, 9, 9); // viernes
    const r = ajustarFechasDemo(d, ahora);
    expect(fila(r, 'ordenes_trabajo', 0).fecha).toBe(fechaIso(ahora));
    expect(fila(r, 'ordenes_trabajo', 1).fecha).toBe(sumarDias(fechaIso(ahora), -1));
  });

  it('recalcula año y semana al cruzar de año', () => {
    const d = datosPrueba();
    const r = ajustarFechasDemo(d, new Date(2027, 0, 6, 9)); // semana 1 de 2027
    const e = fila(r, 'enfunde');
    expect({ anio: e.anio, semana: e.semana }).toEqual({ anio: 2027, semana: 1 });
    expect(e.fecha).toBe('2027-01-04');
  });

  it('el timestamp del pull nunca queda en el futuro', () => {
    const d = datosPrueba();
    const ahora = new Date(2026, 9, 5, 9);
    expect(ajustarFechasDemo(d, ahora).timestamp).toBeLessThanOrEqual(ahora.getTime());
  });

  it('funciona con los datos DEMO reales', () => {
    const datos = datosReales as unknown as PullDemo;
    const ahora = new Date();
    const r = ajustarFechasDemo(datos, ahora);
    const sAhora = semanaIso(ahora);
    const sGenerado = semanaIso(new Date(datos.generado));
    // La cobertura de la última semana generada cae en la semana actual.
    const ultima = (c: Record<string, unknown>[]) =>
      c.reduce((m, f) => Math.max(m, (f.anio as number) * 100 + (f.semana as number)), 0);
    const original = ultima(datos.changes.cobertura_lote!.created);
    const ajustada = ultima(r.changes.cobertura_lote!.created);
    if (original === sGenerado.anio * 100 + sGenerado.numero) {
      expect(ajustada).toBe(sAhora.anio * 100 + sAhora.numero);
    }
    // Todas las fechas siguen siendo AAAA-MM-DD válidas.
    for (const [tabla, c] of Object.entries(r.changes)) {
      for (const f of c.created) {
        if ('fecha' in f) expect(String(f.fecha)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        if (tabla === 'ordenes_trabajo') expect(f.fecha).toBe(fechaIso(ahora));
      }
    }
  });
});
