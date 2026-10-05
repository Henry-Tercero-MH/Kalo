/**
 * Mapa base sin conexión en el navegador: no disponible (sin MapLibre nativo).
 * El mapa SVG usa los polígonos de la base local, que funcionan siempre.
 */

/** ¿Se puede descargar el mapa base en este entorno? */
export const mapaOfflineDisponible = false;

export async function descargarMapaFinca(
  _bbox: [number, number, number, number],
  _progreso?: (porcentaje: number) => void,
): Promise<void> {
  throw new Error('Mapa sin conexión: No disponible en este entorno (navegador web).');
}
