/**
 * Ecuación productiva por lote y pronóstico semanal de cajas.
 * Todos los valores de referencia salen de `parametros` y del calendario de `semanas`.
 */
import {
  claveSemana,
  ecuacionProductiva,
  interpolarFactor,
  pronosticoSemanal,
  recobroObservado,
  semanaIso,
  sumarSemanas,
  type DistribucionCosecha,
  type PuntoFactor,
  type SemanaAnio,
} from '@kalo/shared';
import { and, eq, gte, isNull, or, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { leerParametro } from '../cobertura/parametros';
import type { Ejecutor } from '../db/cliente';
import { cosecha, enfunde, lotes, parametros, pronosticos, semanas } from '../db/esquema';

async function contexto(db: Ejecutor, fincaId: string) {
  const params = await db
    .select({ clave: parametros.clave, valor: parametros.valor })
    .from(parametros)
    .where(or(eq(parametros.finca_id, fincaId), isNull(parametros.finca_id)));
  const cal = await db
    .select({ anio: semanas.anio, numero: semanas.numero, factor: semanas.factor })
    .from(semanas)
    .where(and(eq(semanas.finca_id, fincaId), isNull(semanas.deleted_at)));
  const puntos = leerParametro(params, 'factor_puntos_conocidos') as PuntoFactor[];
  const factores = new Map(
    cal.map((s) => [claveSemana({ anio: s.anio, numero: s.numero }), s.factor]),
  );
  const factorDeSemana = (s: SemanaAnio) =>
    factores.get(claveSemana(s)) ?? interpolarFactor(s.numero, puntos);
  return { params, cal, factorDeSemana };
}

async function recobrosPorLote(db: Ejecutor, fincaId: string, desde: SemanaAnio) {
  const filas = await db
    .select({
      lote: cosecha.lote_id,
      cosechados: sql<number>`sum(${cosecha.racimos_cosechados})::int`,
      perdidos: sql<number>`sum(${cosecha.racimos_perdidos})::int`,
    })
    .from(cosecha)
    .where(
      and(
        eq(cosecha.finca_id, fincaId),
        isNull(cosecha.deleted_at),
        sql`(${cosecha.anio} * 100 + ${cosecha.semana}) >= ${desde.anio * 100 + desde.numero}`,
        sql`${cosecha.estado_validacion} <> 'rechazado'`,
      ),
    )
    .groupBy(cosecha.lote_id);
  return new Map(
    filas
      .map((f) => [f.lote, recobroObservado(Number(f.cosechados), Number(f.perdidos))] as const)
      .filter((x): x is [string, number] => x[1] !== null),
  );
}

export async function calcularPronostico(
  db: Ejecutor,
  fincaId: string,
  horizonte: number,
  loteId?: string,
) {
  const { params, factorDeSemana } = await contexto(db, fincaId);
  const actual = semanaIso(new Date());
  const ventana = sumarSemanas(actual, -16);
  const condLote = loteId ? [eq(enfunde.lote_id, loteId)] : [];
  const cohortes = await db
    .select({
      loteId: enfunde.lote_id,
      anio: enfunde.anio,
      semana: enfunde.semana,
      colorCintaId: enfunde.color_cinta_id,
      racimos: sql<number>`sum(${enfunde.racimos})::int`,
    })
    .from(enfunde)
    .where(
      and(
        eq(enfunde.finca_id, fincaId),
        isNull(enfunde.deleted_at),
        sql`(${enfunde.anio} * 100 + ${enfunde.semana}) >= ${ventana.anio * 100 + ventana.numero}`,
        ...condLote,
      ),
    )
    .groupBy(enfunde.lote_id, enfunde.anio, enfunde.semana, enfunde.color_cinta_id);
  const cosechas = await db
    .select({
      loteId: cosecha.lote_id,
      anio: cosecha.anio,
      semana: cosecha.semana,
      colorCintaId: cosecha.color_cinta_id,
      racimosCosechados: cosecha.racimos_cosechados,
      racimosPerdidos: cosecha.racimos_perdidos,
    })
    .from(cosecha)
    .where(
      and(
        eq(cosecha.finca_id, fincaId),
        isNull(cosecha.deleted_at),
        sql`(${cosecha.anio} * 100 + ${cosecha.semana}) >= ${ventana.anio * 100 + ventana.numero}`,
        ...(loteId ? [eq(cosecha.lote_id, loteId)] : []),
      ),
    );
  const distribucion = leerParametro(params, 'distribucion_cosecha') as DistribucionCosecha;
  const recobroPorDefecto = Number(leerParametro(params, 'recobro_referencia'));
  const recobroPorLote = await recobrosPorLote(db, fincaId, sumarSemanas(actual, -13));

  const semanasPronostico = pronosticoSemanal({
    cohortes: cohortes.map((c) => ({ ...c, racimos: Number(c.racimos) })),
    cosechas,
    recobroPorLote,
    recobroPorDefecto,
    factorDeSemana,
    distribucion,
    semanaActual: actual,
    horizonte,
  });
  return {
    semanaActual: actual,
    recobroPorDefecto,
    distribucion,
    distribucionPendiente: true,
    semanas: semanasPronostico,
  };
}

export default async function rutasPronostico(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/ecuacion',
    {
      preHandler: app.requiere('pronostico:ver'),
      schema: {
        tags: ['pronostico'],
        summary: 'Ecuación productiva por lote (Población × Retorno × Recobro × Factor)',
        querystring: z.object({
          retorno: z.coerce.number().min(0).optional(),
          recobro: z.coerce.number().min(0).max(1).optional(),
          factor: z.coerce.number().min(0).optional(),
        }),
      },
    },
    async (req) => {
      const fincaId = req.usuario!.fincaId;
      const { params, cal, factorDeSemana } = await contexto(app.db, fincaId);
      const actual = semanaIso(new Date());
      const delAnio = cal.filter((s) => s.anio === actual.anio);
      const factorAnual = delAnio.length
        ? delAnio.reduce((s, x) => s + x.factor, 0) / delAnio.length
        : factorDeSemana(actual);
      const retorno = req.query.retorno ?? Number(leerParametro(params, 'retorno_referencia'));
      const recobroRef = Number(leerParametro(params, 'recobro_referencia'));
      const recobros = await recobrosPorLote(app.db, fincaId, sumarSemanas(actual, -13));
      const filas = await app.db
        .select({
          id: lotes.id,
          codigo: lotes.codigo,
          nombre: lotes.nombre,
          hectareas: lotes.hectareas,
          poblacion: lotes.poblacion,
        })
        .from(lotes)
        .where(and(eq(lotes.finca_id, fincaId), isNull(lotes.deleted_at)))
        .orderBy(lotes.codigo);
      const factor = req.query.factor ?? Math.round(factorAnual * 10000) / 10000;
      return {
        semanaActual: actual,
        factorSemanaActual: factorDeSemana(actual),
        factorPromedioAnual: Math.round(factorAnual * 10000) / 10000,
        retorno,
        recobroReferencia: recobroRef,
        lotes: filas.map((l) => {
          const recobro = req.query.recobro ?? recobros.get(l.id) ?? recobroRef;
          const r = ecuacionProductiva({ poblacion: l.poblacion, retorno, recobro, factor });
          return {
            ...l,
            ...r,
            recobroObservado: recobros.get(l.id) ?? null,
            cajasLoteAnio: Math.round(r.cajasHaAnio * l.hectareas),
          };
        }),
      };
    },
  );

  const esquemaSemanal = z.object({
    horizonte: z.coerce.number().int().min(1).max(26).default(8),
    lote_id: z.string().uuid().optional(),
  });

  app.get(
    '/semanal',
    {
      preHandler: app.requiere('pronostico:ver'),
      schema: {
        tags: ['pronostico'],
        summary: 'Pronóstico semanal de cajas',
        querystring: esquemaSemanal,
      },
    },
    async (req) =>
      calcularPronostico(app.db, req.usuario!.fincaId, req.query.horizonte, req.query.lote_id),
  );

  app.post(
    '/guardar',
    {
      preHandler: app.requiere('pronostico:ver'),
      schema: {
        tags: ['pronostico'],
        summary: 'Guarda una instantánea del pronóstico',
        body: esquemaSemanal,
      },
    },
    async (req) => {
      const u = req.usuario!;
      const r = await calcularPronostico(app.db, u.fincaId, req.body.horizonte, req.body.lote_id);
      const ahora = Date.now();
      if (r.semanas.length) {
        await app.db.insert(pronosticos).values(
          r.semanas.map((s) => ({
            finca_id: u.fincaId,
            generado_en: ahora,
            generado_por: u.id,
            anio: s.anio,
            semana: s.semana,
            racimos: s.racimos,
            factor: s.factor,
            cajas: s.cajas,
            detalle: { porColor: s.porColor, lote_id: req.body.lote_id ?? null },
          })),
        );
      }
      return { ok: true, generadoEn: ahora };
    },
  );

  app.get(
    '/historial',
    {
      preHandler: app.requiere('pronostico:ver'),
      schema: { tags: ['pronostico'], summary: 'Instantáneas guardadas' },
    },
    async (req) =>
      app.db
        .select()
        .from(pronosticos)
        .where(
          and(
            eq(pronosticos.finca_id, req.usuario!.fincaId),
            gte(pronosticos.generado_en, Date.now() - 90 * 86_400_000),
          ),
        )
        .orderBy(pronosticos.generado_en)
        .limit(500),
  );
}
