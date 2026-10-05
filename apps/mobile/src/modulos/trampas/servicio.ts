import { fechaIso, QR } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { consultar, crear, type ContextoEscritura } from '@/db/repositorio';
import { columnasGps, type Ubicacion } from '@/gps/ubicacion';

export async function buscarTrampaPorQr(contenido: string) {
  const codigo = contenido.trim();
  const [trampa] = await consultar(
    'trampas',
    Q.where('codigo_qr', codigo.startsWith(QR.trampa) ? codigo : `${QR.trampa}${codigo}`),
  );
  return trampa ?? null;
}

export function guardarLectura(
  d: { trampaId: string; loteId: string; cantidad: number; ubicacion: Ubicacion | null },
  ctx: ContextoEscritura,
) {
  return crear(
    'lecturas_trampa',
    {
      trampa_id: d.trampaId,
      lote_id: d.loteId,
      fecha: fechaIso(),
      cantidad: d.cantidad,
      notas: null,
      ...columnasGps(d.ubicacion),
    },
    ctx,
  );
}
