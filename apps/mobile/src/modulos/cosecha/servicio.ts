import { fechaIso, semanaIso } from '@kalo/shared';
import { crear, type ContextoEscritura } from '@/db/repositorio';
import { columnasGps, type Ubicacion } from '@/gps/ubicacion';

export function guardarCosecha(
  d: {
    loteId: string;
    colorCintaId: string;
    cosechados: number;
    perdidos: number;
    motivo: string | null;
    cuadrillaId: string | null;
    ubicacion: Ubicacion | null;
  },
  ctx: ContextoEscritura,
) {
  const s = semanaIso(new Date());
  return crear(
    'cosecha',
    {
      lote_id: d.loteId,
      fecha: fechaIso(),
      anio: s.anio,
      semana: s.numero,
      color_cinta_id: d.colorCintaId,
      racimos_cosechados: d.cosechados,
      racimos_perdidos: d.perdidos,
      motivo_perdida: d.perdidos > 0 ? d.motivo : null,
      cuadrilla_id: d.cuadrillaId,
      estado_validacion: 'pendiente',
      validado_por: null,
      validado_en: null,
      motivo_rechazo: null,
      ...columnasGps(d.ubicacion),
    },
    ctx,
  );
}

/** Colores que se pueden cosechar esta semana: los enfundados hace 11 a 13 semanas. */
export const EDADES_COSECHA = [11, 12, 13] as const;
