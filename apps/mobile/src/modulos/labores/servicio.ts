import { fechaIso } from '@kalo/shared';
import { database } from '@/db/database';
import { crear, type ContextoEscritura } from '@/db/repositorio';
import { columnasGps, type Ubicacion } from '@/gps/ubicacion';

export async function guardarAsistencia(
  d: { cuadrillaId: string; presentes: Record<string, boolean>; ubicacion: Ubicacion | null },
  ctx: ContextoEscritura,
) {
  const ahora = Date.now();
  // Una sola transacción para toda la cuadrilla.
  await database.write(async () => {
    for (const [trabajadorId, presente] of Object.entries(d.presentes)) {
      await database.get('asistencia').create((r) => {
        const valores = {
          trabajador_id: trabajadorId,
          cuadrilla_id: d.cuadrillaId,
          fecha: fechaIso(),
          presente,
          hora_entrada: presente ? ahora : null,
          ...columnasGps(d.ubicacion),
          created_at: ahora,
          updated_at: ahora,
          server_updated_at: null,
          deleted_at: null,
          device_id: ctx.dispositivoId,
          created_by: ctx.usuarioId,
          finca_id: ctx.fincaId,
        };
        for (const [k, v] of Object.entries(valores)) r._setRaw(k, v as never);
      });
    }
  });
}

export function guardarLabor(
  d: {
    tipoLaborId: string;
    loteId: string;
    trabajadorId: string | null;
    cuadrillaId: string | null;
    cantidad: number;
    notas: string;
    ubicacion: Ubicacion | null;
  },
  ctx: ContextoEscritura,
) {
  return crear(
    'labores',
    {
      tipo_labor_id: d.tipoLaborId,
      lote_id: d.loteId,
      trabajador_id: d.trabajadorId,
      cuadrilla_id: d.cuadrillaId,
      fecha: fechaIso(),
      cantidad: d.cantidad,
      notas: d.notas.trim() || null,
      estado_validacion: 'pendiente',
      validado_por: null,
      validado_en: null,
      motivo_rechazo: null,
      ...columnasGps(d.ubicacion),
    },
    ctx,
  );
}
