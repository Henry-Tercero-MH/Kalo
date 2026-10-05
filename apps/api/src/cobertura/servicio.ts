/**
 * Cobertura por lote: cada lote se divide en una cuadrícula (por defecto 20 × 20 m) y se marcan
 * las celdas a menos de `cobertura_radio_m` de algún punto GPS de la semana.
 * Se calcula en PostGIS, en la zona UTM del lote, y se guarda en `cobertura_lote`
 * (que se sincroniza al celular para mostrar el mapa de cobertura).
 */
import { leerParametro, type ParametroFila } from './parametros';
import { sql } from 'drizzle-orm';
import type { BaseDatos } from '../db/cliente';
import { parametros } from '../db/esquema';
import { escrituraSincronizada } from '../sync/repositorio-drizzle';

export { ZONA_HORARIA } from '../lib/zona-horaria';
import { ZONA_HORARIA } from '../lib/zona-horaria';

type LoteSemana = {
  lote_id: string;
  finca_id: string;
  anio: number;
  semana: number;
};

/** (lote, semana ISO) tocados por un conjunto de puntos GPS. */
export async function lotesSemanasDePuntos(db: BaseDatos, idsPuntos: string[]): Promise<LoteSemana[]> {
  const resultado = new Map<string, LoteSemana>();
  // En bloques para no exceder el límite de parámetros de PostgreSQL.
  for (let i = 0; i < idsPuntos.length; i += 5000) {
    const bloque = idsPuntos.slice(i, i + 5000);
    const filas = await db.execute<LoteSemana>(sql`
    SELECT DISTINCT l.id AS lote_id, l.finca_id,
      EXTRACT(isoyear FROM to_timestamp(p.hora_gps / 1000.0) AT TIME ZONE ${ZONA_HORARIA})::int AS anio,
      EXTRACT(week FROM to_timestamp(p.hora_gps / 1000.0) AT TIME ZONE ${ZONA_HORARIA})::int AS semana
    FROM puntos_ruta p
    JOIN lotes l ON ST_Intersects(l.geom, p.geom) AND l.deleted_at IS NULL
    WHERE p.id IN ${bloque}
  `);
    for (const f of filas) resultado.set(`${f.lote_id}:${f.anio}:${f.semana}`, f);
  }
  return [...resultado.values()];
}

export async function recalcularCobertura(db: BaseDatos, objetivo: LoteSemana): Promise<void> {
  const params = (await db
    .select({ clave: parametros.clave, valor: parametros.valor })
    .from(parametros)) as ParametroFila[];
  const celda = Number(leerParametro(params, 'cobertura_celda_m'));
  const radio = Number(leerParametro(params, 'cobertura_radio_m'));

  const [r] = await db.execute<{
    total: number;
    recorridas: number;
    celdas: string | null;
  }>(sql`
    WITH lote AS (
      SELECT geom,
        32600 + floor((ST_X(ST_Centroid(geom)) + 180) / 6)::int + 1
          - CASE WHEN ST_Y(ST_Centroid(geom)) < 0 THEN -100 ELSE 0 END AS srid
      FROM lotes WHERE id = ${objetivo.lote_id}
    ),
    lote_utm AS (SELECT ST_Transform(geom, srid) AS geom, srid FROM lote),
    celdas AS (
      SELECT g.geom FROM lote_utm l, LATERAL ST_SquareGrid(${celda}, l.geom) g
      WHERE ST_Intersects(g.geom, l.geom)
    ),
    puntos AS (
      SELECT ST_Transform(p.geom, l.srid) AS geom
      FROM puntos_ruta p, lote_utm l
      WHERE p.deleted_at IS NULL
        AND EXTRACT(isoyear FROM to_timestamp(p.hora_gps / 1000.0) AT TIME ZONE ${ZONA_HORARIA}) = ${objetivo.anio}
        AND EXTRACT(week FROM to_timestamp(p.hora_gps / 1000.0) AT TIME ZONE ${ZONA_HORARIA}) = ${objetivo.semana}
        AND ST_DWithin(ST_Transform(p.geom, l.srid), l.geom, ${radio})
    ),
    recorridas AS (
      SELECT DISTINCT c.geom FROM celdas c
      WHERE EXISTS (SELECT 1 FROM puntos p WHERE ST_DWithin(c.geom, p.geom, ${radio}))
    )
    SELECT
      (SELECT count(*) FROM celdas)::int AS total,
      (SELECT count(*) FROM recorridas)::int AS recorridas,
      (SELECT ST_AsGeoJSON(ST_Multi(ST_Transform(ST_Union(geom), 4326)), 6) FROM recorridas) AS celdas
  `);
  if (!r) return;
  const total = Number(r.total);
  const recorridas = Number(r.recorridas);
  const celdas = r.celdas ? JSON.parse(r.celdas) : { type: 'MultiPolygon', coordinates: [] };
  const porcentaje = total > 0 ? Math.round((recorridas / total) * 1000) / 10 : 0;

  await escrituraSincronizada(db, objetivo.finca_id, async (tx, ahora) => {
    await tx.execute(sql`
      INSERT INTO cobertura_lote (id, created_at, updated_at, server_updated_at, finca_id, lote_id, anio, semana,
        celdas_total, celdas_recorridas, porcentaje, celdas)
      VALUES (gen_random_uuid(), ${ahora}, ${ahora}, ${ahora}, ${objetivo.finca_id}, ${objetivo.lote_id},
        ${objetivo.anio}, ${objetivo.semana}, ${total}, ${recorridas}, ${porcentaje}, ${JSON.stringify(celdas)}::jsonb)
      ON CONFLICT (lote_id, anio, semana) DO UPDATE SET
        updated_at = EXCLUDED.updated_at, server_updated_at = EXCLUDED.server_updated_at,
        celdas_total = EXCLUDED.celdas_total, celdas_recorridas = EXCLUDED.celdas_recorridas,
        porcentaje = EXCLUDED.porcentaje, celdas = EXCLUDED.celdas
    `);
  });
}

/** Recalcula la cobertura afectada por puntos recién sincronizados. */
export async function recalcularPorPuntos(db: BaseDatos, idsPuntos: string[]) {
  for (const objetivo of await lotesSemanasDePuntos(db, idsPuntos)) {
    await recalcularCobertura(db, objetivo);
  }
}
