import type { AccionBitacora } from '@kalo/shared';
import type { Ejecutor } from '../db/cliente';
import { bitacora } from '../db/esquema';

export async function registrarBitacora(
  db: Ejecutor,
  e: {
    fincaId: string | null;
    usuarioId: string | null;
    dispositivoId?: string | null;
    accion: AccionBitacora;
    tabla?: string;
    registroId?: string;
    datos?: unknown;
  },
) {
  await db.insert(bitacora).values({
    finca_id: e.fincaId,
    usuario_id: e.usuarioId,
    dispositivo_id: e.dispositivoId ?? null,
    accion: e.accion,
    tabla: e.tabla ?? null,
    registro_id: e.registroId ?? null,
    datos: e.datos ?? null,
    created_at: Date.now(),
  });
}
