/**
 * Mapas base para la versión web (Leaflet). Teselas raster públicas, sin llave:
 *  - Satélite: Esri World Imagery (útil para ver plantaciones y caminos).
 *  - Calles: OpenStreetMap.
 * Sin internet (o en visores que bloquean imágenes externas) los lotes se siguen viendo.
 */
export interface CapaBase {
  id: 'satelite' | 'calles';
  nombre: string;
  url: string;
  atribucion: string;
  maxZoom: number;
}

export const CAPAS_BASE: CapaBase[] = [
  {
    id: 'satelite',
    nombre: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    atribucion: 'Imágenes © Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  {
    id: 'calles',
    nombre: 'Calles',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribucion: '© OpenStreetMap',
    maxZoom: 19,
  },
];
