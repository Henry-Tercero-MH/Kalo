/**
 * Mapa base sin conexión: al configurar el dispositivo se descarga el mapa de la finca.
 * Los polígonos de lotes y la cobertura vienen de la base local, así que funcionan siempre.
 *
 * Solo en la build nativa (MapLibre). En Expo Go lanza «No disponible en este entorno»;
 * en web se usa mapas-offline.web.ts.
 */
import type * as MapLibre from '@maplibre/maplibre-react-native';
import { CONFIG } from '@/config';
import { tieneMapLibre } from '@/demo/entorno';

const NOMBRE_PAQUETE = 'finca';

/** ¿Se puede descargar el mapa base en este entorno? */
export const mapaOfflineDisponible = tieneMapLibre;

function offlineManager(): typeof MapLibre.OfflineManager {
  if (!tieneMapLibre) {
    throw new Error('Mapa sin conexión: No disponible en este entorno (solo en la app instalada).');
  }
  // Carga diferida: en Expo Go el módulo nativo de MapLibre no existe.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@maplibre/maplibre-react-native') as typeof MapLibre).OfflineManager;
}

export async function descargarMapaFinca(
  bbox: [number, number, number, number],
  progreso?: (porcentaje: number) => void,
): Promise<void> {
  const OfflineManager = offlineManager();
  const existentes = await OfflineManager.getPacks();
  for (const p of existentes) {
    if ((p.metadata as { nombre?: string } | undefined)?.nombre === NOMBRE_PAQUETE) {
      await OfflineManager.deletePack(p.id);
    }
  }
  await new Promise<void>((resolver, rechazar) => {
    OfflineManager.createPack(
      {
        mapStyle: CONFIG.mapStyleUrl,
        bounds: bbox,
        minZoom: 12,
        maxZoom: 17,
        metadata: { nombre: NOMBRE_PAQUETE },
      },
      (_pack, estado) => {
        progreso?.(Math.round(estado.percentage));
        if (estado.state === 'complete' || estado.percentage >= 100) resolver();
      },
      (_pack, error) => rechazar(new Error(error.message)),
    ).catch(rechazar);
  });
}
