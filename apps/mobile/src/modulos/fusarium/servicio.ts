import { fechaIso } from '@kalo/shared';
import { crear, type ContextoEscritura } from '@/db/repositorio';
import { columnasGps, type Ubicacion } from '@/gps/ubicacion';
import { adjuntarArchivos, type ArchivoLocal } from '@/utils/archivos';

/** La alerta queda con estado «Sospecha» y pendiente de validación del supervisor. */
export async function guardarAlertaFusarium(
  d: { loteId: string | null; sintomas: string[]; notas: string; ubicacion: Ubicacion | null; fotos: ArchivoLocal[] },
  ctx: ContextoEscritura,
) {
  const r = await crear(
    'alertas_fusarium',
    {
      lote_id: d.loteId,
      fecha: fechaIso(),
      sintomas: JSON.stringify(d.sintomas),
      estado: 'sospecha',
      notas: d.notas.trim() || null,
      estado_validacion: 'pendiente',
      validado_por: null,
      validado_en: null,
      motivo_rechazo: null,
      ...columnasGps(d.ubicacion),
    },
    ctx,
  );
  await adjuntarArchivos(d.fotos, { tabla: 'alertas_fusarium', id: r.id }, ctx);
  return r;
}
