/**
 * Mapa base sin conexión: al configurar el dispositivo se descarga el mapa de la finca.
 * Los polígonos de lotes y la cobertura vienen de la base local, así que funcionan siempre.
 */
import { OfflineManager } from '@maplibre/maplibre-react-native';
import { CONFIG } from '@/config';

const NOMBRE_PAQUETE = 'finca';

export async function descargarMapaFinca(
  bbox: [number, number, number, number],
  progreso?: (porcentaje: number) => void,
): Promise<void> {
  const existentes = await OfflineManager.getPacks();
  for (const p of existentes) {
    if ((p.metadata as { nombre?: string } | undefined)?.nombre === NOMBRE_PAQUETE) {
      await OfflineManager.deletePack(p.id);
    }
  }
  await new Promise<void>((resolver, rechazar) => {
    OfflineManager.createPack(
      { mapStyle: CONFIG.mapStyleUrl, bounds: bbox, minZoom: 12, maxZoom: 17, metadata: { nombre: NOMBRE_PAQUETE } },
      (_pack, estado) => {
        progreso?.(Math.round(estado.percentage));
        if (estado.state === 'complete' || estado.percentage >= 100) resolver();
      },
      (_pack, error) => rechazar(new Error(error.message)),
    ).catch(rechazar);
  });
}
