/**
 * Prueba de integración de punta a punta contra PostgreSQL + PostGIS.
 * Requiere TEST_DATABASE_URL (p. ej. postgres://kalo:kalo_demo@localhost:5432/kalo_campo_test).
 * Si no está definida, la prueba se omite.
 *
 * Recorre los criterios de aceptación del demo que dependen del servidor.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { semanaIso, fechaIso, type RespuestaPull } from '@kalo/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cargarConfig } from '../src/config';
import { crearBaseDatos } from '../src/db/cliente';
import { migrar } from '../src/db/migrar';
import { sembrar, vaciar } from '../src/db/seed/index';
import { construirServidor } from '../src/servidor';

const URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!URL)('integración API (PostgreSQL)', () => {
  let app: FastifyInstance;
  let cerrar: () => Promise<void>;

  const login = async (usuario: string, pin: string) => {
    const r = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { usuario, pin } });
    expect(r.statusCode).toBe(200);
    return r.json() as { accessToken: string; usuario: { id: string; permisos: string[]; modulosWeb: string[] } };
  };
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  async function registrarCelular(tokenUsuario: string) {
    const id = randomUUID();
    const r = await app.inject({
      method: 'POST',
      url: '/v1/dispositivos/registrar',
      headers: auth(tokenUsuario),
      payload: { id, nombre: 'Celular de prueba', claveRespaldo: randomBytes(32).toString('hex') },
    });
    expect(r.statusCode).toBe(200);
    return { id, token: (r.json() as { accessToken: string }).accessToken };
  }

  const pull = async (token: string, desde: number | null) => {
    const r = await app.inject({ method: 'GET', url: `/v1/sync/pull?last_pulled_at=${desde ?? 'null'}`, headers: auth(token) });
    expect(r.statusCode).toBe(200);
    return r.json() as RespuestaPull;
  };
  const push = async (token: string, changes: object, lastPulledAt: number | null) => {
    const r = await app.inject({ method: 'POST', url: '/v1/sync/push', headers: auth(token), payload: { changes, lastPulledAt } });
    expect(r.statusCode).toBe(200);
    return r.json() as { resultados: { id: string; estado: string; conflicto?: boolean; error?: string }[] };
  };

  beforeAll(async () => {
    await migrar(URL!);
    const { db, cliente } = crearBaseDatos(URL!);
    await vaciar(db);
    await sembrar(db);
    app = await construirServidor(
      cargarConfig({ ...process.env, NODE_ENV: 'test', DATABASE_URL: URL, JWT_SECRET: 'x'.repeat(40) }),
      db,
    );
    cerrar = async () => {
      await app.close();
      await cliente.end();
    };
  });

  afterAll(async () => cerrar?.());

  it('un técnico registra un muestreo con foto y GPS desde el celular', async () => {
    const tecnico = await login('tecnico', '4444');
    const cel = await registrarCelular(tecnico.accessToken);
    const p = await pull(cel.token, null);
    const lote = p.changes.lotes!.created[0]!;
    const plaga = p.changes.plagas!.created[0]!;
    expect(p.changes.usuarios!.created.some((u) => u.usuario === 'tecnico')).toBe(true);
    // El pull nunca expone el hash bcrypt del servidor.
    expect(p.changes.usuarios!.created[0]).not.toHaveProperty('pin_hash');

    const ahora = Date.now();
    const muestreo = {
      id: randomUUID(),
      lote_id: lote.id,
      plaga_id: plaga.id,
      fecha: fechaIso(),
      incidencia: 12,
      severidad: 'media',
      respuestas: JSON.stringify({ plantas_revisadas: 50, plantas_afectadas: 6 }),
      formulario_id: null,
      formulario_version: 1,
      notas: null,
      lat: 15.47,
      lng: -88.81,
      precision_gps: 5,
      hora_gps: ahora,
      created_at: ahora,
      updated_at: ahora,
      created_by: tecnico.usuario.id,
      _status: 'created',
      _changed: '',
    };
    const archivo = {
      id: randomUUID(),
      tipo: 'foto',
      mime: 'image/jpeg',
      tamano_bytes: 1234,
      registro_tabla: 'muestreos',
      registro_id: muestreo.id,
      estado_subida: 'pendiente',
      created_at: ahora,
      updated_at: ahora,
      created_by: tecnico.usuario.id,
    };
    const r = await push(cel.token, { muestreos: { created: [muestreo], updated: [], deleted: [] }, archivos: { created: [archivo], updated: [], deleted: [] } }, p.timestamp);
    expect(r.resultados.every((x) => x.estado === 'aceptado')).toBe(true);

    // El archivo pide su URL prefirmada después de los datos.
    const url = await app.inject({ method: 'POST', url: `/v1/archivos/${archivo.id}/subida`, headers: auth(cel.token) });
    expect(url.statusCode).toBe(200);
    expect((url.json() as { url: string }).url).toContain('X-Amz-Signature');

    // Aparece en el panel (tabla y mapa).
    const sup = await login('supervisor', '3333');
    const tabla = await app.inject({ method: 'GET', url: `/v1/registros/muestreos?desde=${fechaIso()}`, headers: auth(sup.accessToken) });
    expect((tabla.json() as { id: string }[]).some((m) => m.id === muestreo.id)).toBe(true);
    const mapa = await app.inject({ method: 'GET', url: '/v1/mapa/registros', headers: auth(sup.accessToken) });
    expect((mapa.json() as { features: { id: string }[] }).features.some((f) => f.id === muestreo.id)).toBe(true);
  });

  it('dos celulares sin conexión: sin duplicados y el conflicto de cosecha llega a la bandeja', async () => {
    const caporal = await login('caporal', '5555');
    const a = await registrarCelular(caporal.accessToken);
    const b = await registrarCelular(caporal.accessToken);
    const pa = await pull(a.token, null);
    const pb = await pull(b.token, null);
    const lote = pa.changes.lotes!.created[0]!;
    const color = pa.changes.colores_cinta!.created[0]!;
    const s = semanaIso(new Date());
    const base = (valores: object) => ({
      id: randomUUID(),
      lote_id: lote.id,
      fecha: fechaIso(),
      anio: s.anio,
      semana: s.numero,
      color_cinta_id: color.id,
      racimos_cosechados: 100,
      racimos_perdidos: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
      created_by: caporal.usuario.id,
      estado_validacion: 'pendiente',
      ...valores,
    });
    const deA = base({});
    const deB = base({});
    const r1 = await push(a.token, { cosecha: { created: [deA], updated: [], deleted: [] } }, pa.timestamp);
    const r2 = await push(b.token, { cosecha: { created: [deB], updated: [], deleted: [] } }, pb.timestamp);
    // Reintento del mismo push (señal intermitente): no duplica.
    await push(a.token, { cosecha: { created: [deA], updated: [], deleted: [] } }, pa.timestamp);
    expect([...r1.resultados, ...r2.resultados].every((x) => x.estado === 'aceptado')).toBe(true);

    // Ambos descargan el registro de A y lo editan sin conexión.
    const pa2 = await pull(a.token, pa.timestamp);
    const pb2 = await pull(b.token, pb.timestamp);
    const enServidor = pa2.changes.cosecha!.updated.find((x) => x.id === deA.id)!;
    expect(enServidor).toBeDefined();
    expect(pb2.changes.cosecha!.updated.filter((x) => x.id === deA.id)).toHaveLength(1);
    const vB = { ...enServidor, racimos_cosechados: 120, updated_at: Date.now() + 2000, _status: 'updated', _changed: 'racimos_cosechados,updated_at' };
    const vA = { ...enServidor, racimos_cosechados: 110, updated_at: Date.now() + 1000, _status: 'updated', _changed: 'racimos_cosechados,updated_at' };
    await push(b.token, { cosecha: { created: [], updated: [vB], deleted: [] } }, pb2.timestamp);
    const rA = await push(a.token, { cosecha: { created: [], updated: [vA], deleted: [] } }, pa2.timestamp);
    expect(rA.resultados[0]).toMatchObject({ estado: 'fusionado', conflicto: true });

    const sup = await login('supervisor', '3333');
    const conflictos = await app.inject({ method: 'GET', url: '/v1/validacion/conflictos', headers: auth(sup.accessToken) });
    const lista = conflictos.json() as { id: string; registro_id: string; tabla: string }[];
    const c = lista.find((x) => x.registro_id === deA.id);
    expect(c?.tabla).toBe('cosecha');

    // El supervisor lo resuelve y el valor final llega a los celulares.
    const res = await app.inject({
      method: 'POST',
      url: `/v1/validacion/conflictos/${c!.id}/resolver`,
      headers: auth(sup.accessToken),
      payload: { valores: { racimos_cosechados: 115 }, nota: 'Recontado' },
    });
    expect(res.statusCode).toBe(200);
    const pa3 = await pull(a.token, pa2.timestamp);
    expect(pa3.changes.cosecha!.updated.find((x) => x.id === deA.id)?.racimos_cosechados).toBe(115);

    // Validación del supervisor.
    const val = await app.inject({
      method: 'POST',
      url: `/v1/validacion/cosecha/${deB.id}`,
      headers: auth(sup.accessToken),
      payload: { decision: 'validado' },
    });
    expect(val.statusCode).toBe(200);
  });

  it('un caporal solo tiene los módulos de su rol', async () => {
    const caporal = await login('caporal', '5555');
    expect(caporal.usuario.permisos).toContain('cosecha:crear');
    expect(caporal.usuario.permisos).not.toContain('plagas:crear');
    expect(caporal.usuario.modulosWeb).toEqual([]);
    const r = await app.inject({ method: 'GET', url: '/v1/pronostico/ecuacion', headers: auth(caporal.accessToken) });
    expect(r.statusCode).toBe(403);
  });

  it('un campo nuevo en el formulario llega al celular al sincronizar', async () => {
    const admin = await login('admin', '1111');
    const tecnico = await login('tecnico', '4444');
    const cel = await registrarCelular(tecnico.accessToken);
    const p1 = await pull(cel.token, null);
    const def = JSON.parse(String(p1.changes.definiciones_formulario!.created.find((d) => d.activo)!.definicion));
    const nueva = await app.inject({
      method: 'POST',
      url: '/v1/admin/formularios',
      headers: auth(admin.accessToken),
      payload: {
        codigo: def.codigo,
        titulo: def.titulo,
        campos: [...def.campos, { id: 'hojas_funcionales', tipo: 'entero', etiqueta: 'Hojas funcionales', requerido: false, min: 0, max: 20 }],
      },
    });
    expect(nueva.statusCode).toBe(200);
    const p2 = await pull(cel.token, p1.timestamp);
    const activa = p2.changes.definiciones_formulario!.updated.find((d) => d.activo);
    expect(activa?.version).toBe(2);
    expect(String(activa?.definicion)).toContain('hojas_funcionales');
  });

  it('el pronóstico semanal usa el factor de la semana correspondiente', async () => {
    const g = await login('gerente', '2222');
    const r = await app.inject({ method: 'GET', url: '/v1/pronostico/semanal?horizonte=4', headers: auth(g.accessToken) });
    const cuerpo = r.json() as { semanas: { semana: number; anio: number; factor: number; racimos: number; cajas: number }[] };
    const cat = await app.inject({ method: 'GET', url: '/v1/catalogos', headers: auth(g.accessToken) });
    const semanas = (cat.json() as { semanas: { anio: number; numero: number; factor: number }[] }).semanas;
    for (const s of cuerpo.semanas) {
      const cal = semanas.find((x) => x.anio === s.anio && x.numero === s.semana)!;
      expect(s.factor).toBe(cal.factor);
      expect(s.cajas).toBeCloseTo(s.racimos * s.factor, 0);
    }
    expect(cuerpo.semanas.some((s) => s.cajas > 0)).toBe(true);
  });

  it('el mapa muestra lotes por estado y la cobertura calculada con PostGIS', async () => {
    const g = await login('gerente', '2222');
    const r = await app.inject({ method: 'GET', url: '/v1/mapa/lotes', headers: auth(g.accessToken) });
    const lotes = r.json() as { features: { properties: { estado: string } }[] };
    expect(lotes.features).toHaveLength(6);
    expect(lotes.features.map((f) => f.properties.estado)).toContain('ALERTA');
  });

  it('borrado remoto: el dispositivo recibe la orden de borrar', async () => {
    const tecnico = await login('tecnico', '4444');
    const cel = await registrarCelular(tecnico.accessToken);
    const admin = await login('admin', '1111');
    const r = await app.inject({
      method: 'PATCH',
      url: `/v1/dispositivos/${cel.id}`,
      headers: auth(admin.accessToken),
      payload: { estado: 'borrado_solicitado' },
    });
    expect(r.statusCode).toBe(200);
    const p = await pull(cel.token, null);
    expect(p.dispositivo.accion).toBe('borrar');
  });
});
