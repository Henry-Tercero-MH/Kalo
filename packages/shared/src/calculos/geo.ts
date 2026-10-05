/**
 * Utilidades geográficas livianas (sin dependencias) para el celular y el servidor.
 * Coordenadas en grados decimales (EPSG:4326), orden GeoJSON [lng, lat].
 */

export type Posicion = [lng: number, lat: number];

export interface PoligonoGeoJson {
  type: 'Polygon';
  coordinates: Posicion[][];
}

export interface MultiPoligonoGeoJson {
  type: 'MultiPolygon';
  coordinates: Posicion[][][];
}

export type GeometriaArea = PoligonoGeoJson | MultiPoligonoGeoJson;

const RADIO_TIERRA_M = 6_371_008.8;
const rad = (g: number) => (g * Math.PI) / 180;

/** Distancia en metros (fórmula de haversine). */
export function distanciaMetros(a: Posicion, b: Posicion): number {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function puntoEnAnillo(p: Posicion, anillo: Posicion[]): boolean {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]!;
    const [xj, yj] = anillo[j]!;
    const cruza = yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

/** Punto dentro de polígono (ray casting), respetando huecos. */
export function puntoEnPoligono(p: Posicion, geom: GeometriaArea): boolean {
  const poligonos = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return poligonos.some((anillos) => {
    const [exterior, ...huecos] = anillos;
    if (!exterior || !puntoEnAnillo(p, exterior)) return false;
    return !huecos.some((h) => puntoEnAnillo(p, h));
  });
}

/** Devuelve el primer lote que contiene la posición (o null). */
export function loteEnPosicion<T extends { id: string; poligono: GeometriaArea }>(
  p: Posicion,
  lotes: readonly T[],
): T | null {
  return lotes.find((l) => puntoEnPoligono(p, l.poligono)) ?? null;
}

/** Área aproximada en hectáreas (proyección equirectangular local; suficiente para lotes). */
export function areaHectareas(geom: GeometriaArea): number {
  const poligonos = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let total = 0;
  for (const anillos of poligonos) {
    anillos.forEach((anillo, idx) => {
      const lat0 = rad(anillo.reduce((s, p) => s + p[1], 0) / anillo.length);
      let a = 0;
      for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
        const [x1, y1] = anillo[j]!;
        const [x2, y2] = anillo[i]!;
        a +=
          rad(x1) * Math.cos(lat0) * RADIO_TIERRA_M * (rad(y2) * RADIO_TIERRA_M) -
          rad(x2) * Math.cos(lat0) * RADIO_TIERRA_M * (rad(y1) * RADIO_TIERRA_M);
      }
      const m2 = Math.abs(a / 2);
      total += idx === 0 ? m2 : -m2;
    });
  }
  return total / 10_000;
}

/** Centroide simple (promedio de vértices del anillo exterior). */
export function centroide(geom: GeometriaArea): Posicion {
  const anillo = geom.type === 'Polygon' ? geom.coordinates[0]! : geom.coordinates[0]![0]!;
  const n = anillo.length - (sonIguales(anillo[0]!, anillo[anillo.length - 1]!) ? 1 : 0);
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    x += anillo[i]![0];
    y += anillo[i]![1];
  }
  return [x / n, y / n];
}

function sonIguales(a: Posicion, b: Posicion): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** Recuadro [minLng, minLat, maxLng, maxLat]. */
export function recuadro(geoms: readonly GeometriaArea[]): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const g of geoms) {
    const anillos = g.type === 'Polygon' ? g.coordinates : g.coordinates.flat();
    for (const anillo of anillos) {
      for (const [x, y] of anillo) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return [minX, minY, maxX, maxY];
}

export interface PuntoGps {
  lat: number;
  lng: number;
  precision: number;
  hora: number;
}

/** Descarta puntos con precisión peor que el máximo permitido (por defecto 30 m). */
export function filtrarPorPrecision<T extends { precision: number }>(
  puntos: readonly T[],
  maxPrecisionM = 30,
): T[] {
  return puntos.filter((p) => Number.isFinite(p.precision) && p.precision <= maxPrecisionM);
}

/** Distancia perpendicular aproximada (m) de p al segmento a–b. */
function distanciaASegmento(p: Posicion, a: Posicion, b: Posicion): number {
  const lat0 = rad((a[1] + b[1] + p[1]) / 3);
  const proyectar = (q: Posicion) => [
    rad(q[0]) * Math.cos(lat0) * RADIO_TIERRA_M,
    rad(q[1]) * RADIO_TIERRA_M,
  ];
  const [px, py] = proyectar(p) as [number, number];
  const [ax, ay] = proyectar(a) as [number, number];
  const [bx, by] = proyectar(b) as [number, number];
  const dx = bx - ax;
  const dy = by - ay;
  const largo2 = dx * dx + dy * dy;
  if (largo2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Simplifica una ruta con Douglas-Peucker (tolerancia en metros).
 * Conserva siempre el primer y el último punto.
 */
export function simplificarRuta<T extends { lat: number; lng: number }>(
  puntos: readonly T[],
  toleranciaM = 3,
): T[] {
  if (puntos.length <= 2) return [...puntos];
  const conservar = new Array<boolean>(puntos.length).fill(false);
  conservar[0] = true;
  conservar[puntos.length - 1] = true;
  const pila: [number, number][] = [[0, puntos.length - 1]];
  const pos = (p: T): Posicion => [p.lng, p.lat];
  while (pila.length > 0) {
    const [ini, fin] = pila.pop()!;
    let maxDist = 0;
    let indice = -1;
    for (let i = ini + 1; i < fin; i++) {
      const d = distanciaASegmento(pos(puntos[i]!), pos(puntos[ini]!), pos(puntos[fin]!));
      if (d > maxDist) {
        maxDist = d;
        indice = i;
      }
    }
    if (indice !== -1 && maxDist > toleranciaM) {
      conservar[indice] = true;
      pila.push([ini, indice], [indice, fin]);
    }
  }
  return puntos.filter((_, i) => conservar[i]);
}

/** Longitud total de una ruta en metros. */
export function longitudRuta(puntos: readonly { lat: number; lng: number }[]): number {
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1]!;
    const b = puntos[i]!;
    total += distanciaMetros([a.lng, a.lat], [b.lng, b.lat]);
  }
  return total;
}

/** 1 manzana guatemalteca = 10.000 varas² (vara = 0,835905 m) ≈ 0,698737 ha. */
export const HECTAREAS_POR_MANZANA = 0.698737;

export function convertirArea(hectareas: number, unidad: 'ha' | 'mz'): number {
  return unidad === 'ha' ? hectareas : hectareas / HECTAREAS_POR_MANZANA;
}
