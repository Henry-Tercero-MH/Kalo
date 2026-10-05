/**
 * Pruebas del motor de sincronización con dos celulares simulados.
 *
 * Cada "celular" es una base local mínima que imita el comportamiento de WatermelonDB:
 * guarda filas con `_status` / `_changed`, hace pull y push contra el motor.
 */
import { randomUUID } from 'node:crypto';
import { resolverConflictoLocal, type FilaCruda, type NombreTabla } from '@kalo/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { procesarPull, procesarPush, type DispositivoSync } from '../src/sync/motor';
import { RepositorioMemoria } from './repositorio-memoria';

const FINCA = randomUUID();
const LOTE = randomUUID();
const CINTA = randomUUID();
const CAPORAL = randomUUID();
const TECNICO = randomUUID();

type FilaLocal = FilaCruda & { _status: 'synced' | 'created' | 'updated'; _changed: string };

class CelularSimulado {
  datos = new Map<NombreTabla, Map<string, FilaLocal>>();
  ultimaDescarga: number | null = null;
  reloj = 10_000;

  constructor(
    public dispositivo: DispositivoSync,
    private repo: RepositorioMemoria,
  ) {}

  private t(n: NombreTabla) {
    if (!this.datos.has(n)) this.datos.set(n, new Map());
    return this.datos.get(n)!;
  }

  crear(tabla: NombreTabla, valores: Record<string, unknown>): string {
    const id = randomUUID();
    const ahora = ++this.reloj;
    this.t(tabla).set(id, {
      id,
      created_at: ahora,
      updated_at: ahora,
      server_updated_at: null,
      deleted_at: null,
      device_id: this.dispositivo.id,
      finca_id: FINCA,
      ...valores,
      _status: 'created',
      _changed: '',
    } as FilaLocal);
    return id;
  }

  editar(tabla: NombreTabla, id: string, valores: Record<string, unknown>, horaLocal?: number) {
    const f = this.t(tabla).get(id)!;
    const cambiados = new Set(f._changed ? f._changed.split(',') : []);
    for (const k of Object.keys(valores)) cambiados.add(k);
    cambiados.add('updated_at');
    this.t(tabla).set(id, {
      ...f,
      ...(valores as FilaCruda),
      updated_at: horaLocal ?? ++this.reloj,
      _status: f._status === 'created' ? 'created' : 'updated',
      _changed: [...cambiados].join(','),
    });
  }

  leer(tabla: NombreTabla, id: string) {
    return this.t(tabla).get(id);
  }

  /** Igual que la app: si el push escribió registros, vuelve a descargar para conocer su versión base. */
  async sincronizar() {
    const push = await this.cicloPullPush();
    if (push.resultados.some((r) => r.estado !== 'rechazado')) await this.cicloPullPush();
    return push;
  }

  private async cicloPullPush() {
    // 1) pull
    const pull = await procesarPull(this.repo, this.dispositivo, this.ultimaDescarga, 60);
    for (const [tabla, c] of Object.entries(pull.changes)) {
      for (const fila of [...c.created, ...c.updated]) {
        const local = this.t(tabla as NombreTabla).get(fila.id);
        // Igual que la app: conflictResolver de WatermelonDB con resolverConflictoLocal.
        if (local && local._status !== 'synced') {
          this.t(tabla as NombreTabla).set(fila.id, resolverConflictoLocal(local, fila as FilaLocal));
        } else {
          this.t(tabla as NombreTabla).set(fila.id, { ...fila, _status: 'synced', _changed: '' });
        }
      }
    }
    // 2) push
    const changes: Record<string, { created: FilaCruda[]; updated: FilaCruda[]; deleted: string[] }> = {};
    for (const [tabla, filas] of this.datos) {
      const created = [...filas.values()].filter((f) => f._status === 'created');
      const updated = [...filas.values()].filter((f) => f._status === 'updated');
      if (created.length || updated.length) changes[tabla] = { created, updated, deleted: [] };
    }
    const push = await procesarPush(this.repo, this.dispositivo, {
      changes,
      lastPulledAt: pull.timestamp,
    });
    const rechazados = new Set(push.resultados.filter((r) => r.estado === 'rechazado').map((r) => r.id));
    for (const filas of this.datos.values()) {
      for (const f of filas.values()) {
        if (f._status !== 'synced' && !rechazados.has(f.id)) {
          filas.set(f.id, { ...f, _status: 'synced', _changed: '' });
        }
      }
    }
    this.ultimaDescarga = pull.timestamp;
    return push;
  }
}

function cosecha(valores: Record<string, unknown> = {}) {
  return {
    lote_id: LOTE,
    fecha: '2026-10-05',
    anio: 2026,
    semana: 41,
    color_cinta_id: CINTA,
    racimos_cosechados: 100,
    racimos_perdidos: 2,
    motivo_perdida: null,
    cuadrilla_id: null,
    lat: 15.4,
    lng: -88.8,
    precision_gps: 5,
    hora_gps: 10_000,
    estado_validacion: 'pendiente',
    created_by: CAPORAL,
    ...valores,
  };
}

describe('motor de sincronización', () => {
  let repo: RepositorioMemoria;
  let a: CelularSimulado;
  let b: CelularSimulado;

  beforeEach(() => {
    repo = new RepositorioMemoria();
    const permisosCaporal = new Set(['cosecha:crear', 'cosecha:editar', 'labores:crear']);
    repo.usuarios.set(CAPORAL, { id: CAPORAL, fincaId: FINCA, activo: true, permisos: permisosCaporal });
    repo.usuarios.set(TECNICO, {
      id: TECNICO,
      fincaId: FINCA,
      activo: true,
      permisos: new Set(['plagas:crear']),
    });
    const base = { fincaId: FINCA, empresaId: randomUUID(), estado: 'activo' };
    a = new CelularSimulado({ ...base, id: randomUUID() }, repo);
    b = new CelularSimulado({ ...base, id: randomUUID() }, repo);
  });

  it('dos celulares registran sin conexión y todo llega sin duplicados', async () => {
    await a.sincronizar();
    await b.sincronizar();
    const ids = [a.crear('cosecha', cosecha()), a.crear('cosecha', cosecha()), b.crear('cosecha', cosecha())];

    await a.sincronizar();
    await b.sincronizar();
    // Reintento (p. ej. se cortó la señal tras enviar): no debe duplicar.
    await a.sincronizar();
    await b.sincronizar();

    expect(repo.tabla('cosecha').size).toBe(3);
    expect([...repo.tabla('cosecha').keys()].sort()).toEqual([...ids].sort());
    // Cada celular recibe los registros del otro.
    for (const id of ids) {
      expect(a.leer('cosecha', id)).toBeDefined();
      expect(b.leer('cosecha', id)).toBeDefined();
    }
  });

  it('edición concurrente del mismo registro: gana el más reciente y queda conflicto para el supervisor', async () => {
    const id = a.crear('cosecha', cosecha());
    await a.sincronizar();
    await b.sincronizar();

    // Ambos editan sin conexión: A cambia cosechados (antes), B cambia cosechados y perdidos (después).
    a.editar('cosecha', id, { racimos_cosechados: 110 }, 20_000);
    b.editar('cosecha', id, { racimos_cosechados: 120, racimos_perdidos: 4 }, 30_000);

    const pushB = await b.sincronizar();
    expect(pushB.resultados[0]).toMatchObject({ id, estado: 'aceptado' });
    const pushA = await a.sincronizar();
    expect(pushA.resultados.find((r) => r.id === id)).toMatchObject({ estado: 'fusionado', conflicto: true });

    const servidor = repo.tabla('cosecha').get(id)!;
    expect(servidor.racimos_cosechados).toBe(120); // B es más reciente
    expect(servidor.racimos_perdidos).toBe(4);

    const conflictos = repo.bitacora.filter((e) => e.accion === 'conflicto');
    expect(conflictos).toHaveLength(1);
    expect(conflictos[0]).toMatchObject({ tabla: 'cosecha', registroId: id, requiereRevision: true });

    // Tras sincronizar de nuevo, ambos celulares convergen al mismo valor.
    await a.sincronizar();
    await b.sincronizar();
    expect(a.leer('cosecha', id)!.racimos_cosechados).toBe(120);
    expect(b.leer('cosecha', id)!.racimos_cosechados).toBe(120);
  });

  it('cambios concurrentes en campos distintos se combinan', async () => {
    const id = a.crear('cosecha', cosecha());
    await a.sincronizar();
    await b.sincronizar();
    a.editar('cosecha', id, { motivo_perdida: 'viento' }, 40_000);
    b.editar('cosecha', id, { racimos_perdidos: 7 }, 30_000);
    await b.sincronizar();
    await a.sincronizar();
    const s = repo.tabla('cosecha').get(id)!;
    expect(s.motivo_perdida).toBe('viento');
    expect(s.racimos_perdidos).toBe(7);
  });

  it('rechaza registros sin permiso o inválidos sin afectar a los demás', async () => {
    const valido = a.crear('cosecha', cosecha());
    const sinPermiso = a.crear('cosecha', cosecha({ created_by: TECNICO }));
    const invalido = a.crear('cosecha', cosecha({ racimos_cosechados: -5 }));
    const push = await a.sincronizar();
    const estado = Object.fromEntries(push.resultados.map((r) => [r.id, r.estado]));
    expect(estado[valido]).toBe('aceptado');
    expect(estado[sinPermiso]).toBe('rechazado');
    expect(estado[invalido]).toBe('rechazado');
    expect(push.experimentalRejectedIds.cosecha).toHaveLength(2);
    expect(repo.tabla('cosecha').size).toBe(1);
  });

  it('el celular no puede validar sus propios registros', async () => {
    const id = a.crear('cosecha', cosecha({ estado_validacion: 'validado', validado_por: CAPORAL }));
    await a.sincronizar();
    const s = repo.tabla('cosecha').get(id)!;
    expect(s.estado_validacion).toBe('pendiente');
    expect(s.validado_por).toBeNull();
  });

  it('un registro validado que se edita vuelve a pendiente', async () => {
    const id = a.crear('cosecha', cosecha());
    await a.sincronizar();
    repo.tabla('cosecha').set(id, {
      ...repo.tabla('cosecha').get(id)!,
      estado_validacion: 'validado',
      server_updated_at: 1,
    });
    a.editar('cosecha', id, { racimos_cosechados: 99 });
    await a.sincronizar();
    expect(repo.tabla('cosecha').get(id)!.estado_validacion).toBe('pendiente');
  });

  it('rechaza escrituras a catálogos de solo lectura', async () => {
    const push = await procesarPush(repo, a.dispositivo, {
      lastPulledAt: null,
      changes: { lotes: { created: [{ id: randomUUID() }], updated: [], deleted: [] } },
    });
    expect(push.resultados[0]).toMatchObject({ estado: 'rechazado', error: 'Tabla de solo lectura' });
  });

  it('pide borrar los datos a un dispositivo con borrado remoto', async () => {
    const pull = await procesarPull(repo, { ...a.dispositivo, estado: 'borrado_solicitado' }, null, 60);
    expect(pull.dispositivo.accion).toBe('borrar');
    expect(Object.keys(pull.changes)).toHaveLength(0);
  });
});
