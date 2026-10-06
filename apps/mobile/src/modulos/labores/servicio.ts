import { fechaIso, type Fila } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import {
  actualizar,
  coleccion,
  consultar,
  crear,
  vivos,
  type ContextoEscritura,
} from '@/db/repositorio';
import { columnasGps, type Ubicacion } from '@/gps/ubicacion';

/**
 * Asistencia del día por cuadrilla. Si ya se tomó hoy, actualiza los registros existentes
 * en lugar de crear otros (volver a tomarla corrige, no duplica).
 */
export async function guardarAsistencia(
  d: { cuadrillaId: string; presentes: Record<string, boolean>; ubicacion: Ubicacion | null },
  ctx: ContextoEscritura,
) {
  const ahora = Date.now();
  const hoy = fechaIso();
  const existentes = await coleccion('asistencia')
    .query(
      vivos(),
      Q.where('fecha', hoy),
      Q.where('trabajador_id', Q.oneOf(Object.keys(d.presentes))),
    )
    .fetch();
  const porTrabajador = new Map(existentes.map((r) => [r.fila.trabajador_id, r]));
  // Una sola transacción para toda la cuadrilla.
  await database.write(async () => {
    for (const [trabajadorId, presente] of Object.entries(d.presentes)) {
      const previo = porTrabajador.get(trabajadorId);
      if (previo) {
        if (Boolean(previo.fila.presente) === presente) continue;
        await previo.update((r) => {
          r._setRaw('presente', presente);
          r._setRaw('hora_entrada', presente ? ahora : null);
          r._setRaw('updated_at', ahora);
        });
        continue;
      }
      await database.get('asistencia').create((r) => {
        const valores = {
          trabajador_id: trabajadorId,
          cuadrilla_id: d.cuadrillaId,
          fecha: hoy,
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

/**
 * El caporal asigna una labor a varios trabajadores: un registro por trabajador. No repite
 * una asignación pendiente igual (mismo trabajador, labor, lote y día).
 */
export async function asignarLabor(
  d: {
    tipoLaborId: string;
    loteId: string;
    cuadrillaId: string | null;
    trabajadorIds: string[];
    meta: number | null;
    notas: string;
  },
  ctx: ContextoEscritura,
): Promise<{ creadas: number; repetidas: number }> {
  const hoy = fechaIso();
  const previas = await consultar(
    'asignaciones_labor',
    Q.where('fecha', hoy),
    Q.where('tipo_labor_id', d.tipoLaborId),
    Q.where('lote_id', d.loteId),
    Q.where('estado', 'asignada'),
  );
  const yaAsignados = new Set(previas.map((a) => a.trabajador_id));
  let creadas = 0;
  for (const trabajadorId of d.trabajadorIds) {
    if (yaAsignados.has(trabajadorId)) continue;
    await crear(
      'asignaciones_labor',
      {
        tipo_labor_id: d.tipoLaborId,
        lote_id: d.loteId,
        trabajador_id: trabajadorId,
        cuadrilla_id: d.cuadrillaId,
        fecha: hoy,
        meta: d.meta,
        estado: 'asignada',
        labor_id: null,
        notas: d.notas.trim() || null,
      },
      ctx,
    );
    creadas++;
  }
  return { creadas, repetidas: d.trabajadorIds.length - creadas };
}

/** Reporta lo hecho en una labor asignada: crea el registro de labor y cierra la asignación. */
export async function reportarAsignacion(
  asignacion: Fila<'asignaciones_labor'>,
  d: { cantidad: number; notas: string; ubicacion: Ubicacion | null },
  ctx: ContextoEscritura,
) {
  const labor = await guardarLabor(
    {
      tipoLaborId: asignacion.tipo_labor_id,
      loteId: asignacion.lote_id,
      trabajadorId: asignacion.trabajador_id,
      cuadrillaId: asignacion.cuadrilla_id,
      cantidad: d.cantidad,
      notas: d.notas,
      ubicacion: d.ubicacion,
    },
    ctx,
  );
  await actualizar('asignaciones_labor', asignacion.id, {
    estado: 'reportada',
    labor_id: labor.id,
  });
  return labor;
}
