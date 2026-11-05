'use client';

/**
 * Mapa de la finca: lotes coloreados por el último estado de plagas (con leyenda en
 * palabras), capa de rutas recorridas, cobertura de la semana y registros con ubicación.
 */
import { colores } from '@kalo/ui-tokens';
import {
  Map as MapaGl,
  NavigationControl,
  Popup,
  ScaleControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl';
import { useEffect, useRef } from 'react';

export const COLOR_ESTADO_LOTE: Record<string, string> = {
  ALERTA: colores.estados.peligro,
  VIGILANCIA: colores.estados.alerta,
  NORMAL: colores.estados.exito,
  'SIN DATOS': colores.neutros.n300,
};

const ESTILO =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

// Worker copiado a public/ por scripts/copiar-maplibre.mjs.
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

/** Estilo de respaldo sin mapa base (sin internet): los lotes y capas se siguen viendo. */
const ESTILO_RESPALDO: StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': colores.neutros.n50 } }],
};
const vacio: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

export interface CapasMapa {
  lotes: GeoJSON.FeatureCollection;
  rutas: GeoJSON.FeatureCollection;
  cobertura: GeoJSON.FeatureCollection;
  registros: GeoJSON.FeatureCollection;
}

export function MapaFinca({
  capas,
  visibles,
  bbox,
  alSeleccionarLote,
}: {
  capas: Partial<CapasMapa>;
  visibles: { rutas: boolean; cobertura: boolean; registros: boolean };
  bbox?: [number, number, number, number];
  alSeleccionarLote?: (id: string) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaGl | null>(null);
  const listo = useRef(false);
  // Última actualización de capas; se aplica cuando el estilo está listo.
  const ultimaAplicacion = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!contenedor.current) return;
    const m = new MapaGl({
      container: contenedor.current,
      style: ESTILO,
      center: bbox ? [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2] : [-88.81, 15.47],
      zoom: 14,
      attributionControl: { compact: true },
    });
    m.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    m.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left');
    let respaldo = false;
    m.on('error', (e) => {
      // Si el estilo base no carga (sin internet), se usa el estilo de respaldo.
      if (
        !respaldo &&
        !listo.current &&
        String(e.error?.message ?? '').includes('Failed to fetch')
      ) {
        respaldo = true;
        m.setStyle(ESTILO_RESPALDO);
      }
    });
    m.on('style.load', () => {
      for (const id of ['lotes', 'rutas', 'cobertura', 'registros'])
        m.addSource(id, { type: 'geojson', data: vacio });
      m.addLayer({
        id: 'cobertura',
        type: 'fill',
        source: 'cobertura',
        paint: { 'fill-color': colores.marca.verde, 'fill-opacity': 0.5 },
      });
      m.addLayer({
        id: 'lotes-relleno',
        type: 'fill',
        source: 'lotes',
        paint: {
          'fill-color': [
            'match',
            ['get', 'estado'],
            ...Object.entries(COLOR_ESTADO_LOTE).flat(),
            colores.neutros.n300,
          ] as never,
          'fill-opacity': 0.35,
        },
      });
      m.addLayer({
        id: 'lotes-borde',
        type: 'line',
        source: 'lotes',
        paint: { 'line-color': colores.marca.negro, 'line-width': 2 },
      });
      m.addLayer({
        id: 'lotes-etiqueta',
        type: 'symbol',
        source: 'lotes',
        layout: {
          'text-field': ['concat', ['get', 'codigo'], '\n', ['get', 'estado']],
          'text-size': 13,
          'text-font': ['Noto Sans Bold'],
        },
        paint: {
          'text-color': colores.neutros.n900,
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
      });
      m.addLayer({
        id: 'rutas',
        type: 'line',
        source: 'rutas',
        paint: { 'line-color': colores.estados.info, 'line-width': 2 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
      m.addLayer({
        id: 'registros',
        type: 'circle',
        source: 'registros',
        paint: {
          'circle-radius': 5,
          'circle-color': [
            'match',
            ['get', 'tipo'],
            'fusarium',
            colores.estados.peligro,
            'trampa',
            colores.neutros.n900,
            colores.estados.info,
          ] as never,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
      listo.current = true;
      // Reaplica las últimas capas (también tras cambiar al estilo de respaldo).
      ultimaAplicacion.current?.();
    });
    // Eventos de capa: se registran una sola vez (sobreviven al cambio de estilo).
    m.on('click', 'lotes-relleno', (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id;
      if (id && alSeleccionarLote) alSeleccionarLote(String(id));
    });
    m.on('mouseenter', 'lotes-relleno', () => (m.getCanvas().style.cursor = 'pointer'));
    m.on('mouseleave', 'lotes-relleno', () => (m.getCanvas().style.cursor = ''));
    const popup = new Popup({ closeButton: false, closeOnClick: false });
    m.on('mousemove', 'registros', (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      popup
        .setLngLat(e.lngLat)
        .setText(`${String(f.properties.tipo).toUpperCase()} · ${f.properties.detalle ?? ''}`)
        .addTo(m);
    });
    m.on('mouseleave', 'registros', () => popup.remove());
    mapa.current = m;
    return () => {
      listo.current = false;
      m.remove();
    };
    // El mapa se crea una sola vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const aplicar = () => {
      for (const [id, datos] of Object.entries(capas))
        (m.getSource(id) as GeoJSONSource | undefined)?.setData(datos ?? vacio);
      m.setLayoutProperty('rutas', 'visibility', visibles.rutas ? 'visible' : 'none');
      m.setLayoutProperty('cobertura', 'visibility', visibles.cobertura ? 'visible' : 'none');
      m.setLayoutProperty('registros', 'visibility', visibles.registros ? 'visible' : 'none');
    };
    ultimaAplicacion.current = aplicar;
    if (listo.current && m.isStyleLoaded()) aplicar();
  }, [capas, visibles]);

  useEffect(() => {
    if (bbox && mapa.current) mapa.current.fitBounds(bbox, { padding: 40, duration: 0 });
  }, [bbox]);

  return (
    <div
      ref={contenedor}
      className="h-[620px] w-full border border-neutros-n200"
      role="region"
      aria-label="Mapa de la finca"
    />
  );
}
