/**
 * Mapa de la finca (Android / iOS). Se elige en tiempo de ejecución:
 *  - Build nativa (tieneMapLibre): MapLibre con mapa base sin conexión.
 *  - Expo Go: mapa esquemático SVG (MapLibre no está en Expo Go).
 * En web se usa MapaFinca.web.tsx (solo SVG; el bundle web nunca importa MapLibre).
 */
import type { ComponentType } from 'react';
import { tieneMapLibre } from '@/demo/entorno';
import type { PropsMapa } from './mapa/datos';
import type * as ModuloMapLibre from './MapaMapLibre';
import { MapaSvg } from './MapaSvg';

function cargarMapaNativo(): ComponentType<PropsMapa> | null {
  if (!tieneMapLibre) return null;
  try {
    // Carga diferida: el módulo nativo de MapLibre solo se evalúa en la build nativa.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./MapaMapLibre') as typeof ModuloMapLibre).MapaMapLibre;
  } catch (e) {
    console.warn('MapLibre no disponible; se usa el mapa SVG', e);
    return null;
  }
}

const MapaNativo = cargarMapaNativo();

export function MapaFinca(props: PropsMapa) {
  return MapaNativo ? <MapaNativo {...props} /> : <MapaSvg {...props} />;
}
