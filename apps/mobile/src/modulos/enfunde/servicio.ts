import { fechaIso, semanaIso } from '@kalo/shared';
import { crear, type ContextoEscritura } from '@/db/repositorio';
import { columnasGps, type Ubicacion } from '@/gps/ubicacion';

/** El color de cinta lo fija la semana actual del calendario (no se elige a mano). */
export function guardarEnfunde(
  d: { loteId: string; colorCintaId: string; racimos: number; cuadrillaId: string | null; ubicacion: Ubicacion | null },
  ctx: ContextoEscritura,
) {
  const s = semanaIso(new Date());
  return crear(
    'enfunde',
    {
      lote_id: d.loteId,
      fecha: fechaIso(),
      anio: s.anio,
      semana: s.numero,
      color_cinta_id: d.colorCintaId,
      racimos: d.racimos,
      cuadrilla_id: d.cuadrillaId,
      trabajador_id: null,
      ...columnasGps(d.ubicacion),
    },
    ctx,
  );
}
