/**
 * Mapa de la finca en el navegador: Leaflet con mapa base satelital o de calles.
 * (Metro elige este archivo para web; así el bundle web no incluye MapLibre nativo.)
 */
import type { PropsMapa } from './mapa/datos';
import { MapaLeaflet } from './MapaLeaflet.web';

export function MapaFinca(props: PropsMapa) {
  return <MapaLeaflet {...props} />;
}
