/**
 * Mapa de la finca en el navegador: siempre el mapa esquemático SVG.
 * (Metro elige este archivo para web; así el bundle web no incluye MapLibre.)
 */
import type { PropsMapa } from './mapa/datos';
import { MapaSvg } from './MapaSvg';

export function MapaFinca(props: PropsMapa) {
  return <MapaSvg {...props} />;
}
