/**
 * Datos del mapa de la finca (comunes a MapLibre y al mapa SVG): lotes con su polígono,
 * cobertura de la semana y puntos de la ruta activa, todos desde la base local.
 */
import { semanaIso, type MultiPoligonoGeoJson } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useMemo } from 'react';
import { useConsulta } from '@/db/hooks';
import { useLotes, type LoteConGeometria } from '@/gps/lote-actual';

export interface PropsMapa {
  alto?: number;
  rutaId?: string | null;
}

export interface CeldasLote {
  loteId: string;
  geometria: MultiPoligonoGeoJson;
}

export interface DatosMapa {
  lotes: LoteConGeometria[];
  /** Porcentaje de cobertura de la semana por lote. */
  porcentajes: Record<string, number>;
  celdas: CeldasLote[];
  /** Ruta activa en orden, [lng, lat]. */
  ruta: [number, number][];
}

export function useDatosMapa(rutaId?: string | null): DatosMapa {
  const lotes = useLotes();
  const s = useMemo(() => semanaIso(new Date()), []);
  const cobertura = useConsulta(
    'cobertura_lote',
    [Q.where('anio', s.anio), Q.where('semana', s.numero)],
    [s.anio, s.numero],
  );
  const puntos = useConsulta(
    'puntos_ruta',
    [Q.where('ruta_id', rutaId ?? '__ninguna__'), Q.sortBy('secuencia', Q.asc)],
    [rutaId],
  );

  return useMemo(() => {
    const porcentajes: Record<string, number> = {};
    const celdas: CeldasLote[] = [];
    for (const c of cobertura) {
      porcentajes[c.lote_id] = c.porcentaje;
      try {
        const g = JSON.parse(c.celdas) as MultiPoligonoGeoJson | null;
        if (g?.type === 'MultiPolygon' && Array.isArray(g.coordinates)) {
          celdas.push({ loteId: c.lote_id, geometria: g });
        }
      } catch {
        // celdas inválidas: se ignoran
      }
    }
    const ruta = puntos.map((p) => [p.lng, p.lat] as [number, number]);
    return { lotes, porcentajes, celdas, ruta };
  }, [lotes, cobertura, puntos]);
}

/** Etiqueta de un lote en el mapa: «L-01 · 45 %». */
export const etiquetaLote = (codigo: string, porcentaje: number | undefined) =>
  `${codigo} · ${Math.round(porcentaje ?? 0)} %`;
