/**
 * Mapa de la finca con MapLibre nativo (solo build nativa: ver MapaFinca.tsx).
 * Mapa base descargado sin conexión + polígonos y cobertura desde la base local.
 * No importar este archivo directamente: en Expo Go y en web el módulo nativo no existe.
 */
import { Camera, GeoJSONSource, Layer, Map, UserLocation } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { CONFIG } from '@/config';
import { useConfiguracion } from '@/permisos/contexto';
import { etiquetaLote, useDatosMapa, type PropsMapa } from './mapa/datos';
import { colores, semantico } from './tema';

export function MapaMapLibre({ alto = 420, rutaId }: PropsMapa) {
  const config = useConfiguracion();
  const { lotes, porcentajes, celdas, ruta } = useDatosMapa(rutaId);

  const lotesGeo = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: lotes.map((l) => ({
        type: 'Feature',
        id: l.id,
        geometry: l.geometria,
        properties: { codigo: l.codigo, etiqueta: etiquetaLote(l.codigo, porcentajes[l.id]) },
      })),
    }),
    [lotes, porcentajes],
  );

  const celdasGeo = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: celdas.map((c) => ({
        type: 'Feature' as const,
        geometry: c.geometria as GeoJSON.MultiPolygon,
        properties: {},
      })),
    }),
    [celdas],
  );

  const rutaGeo = useMemo<GeoJSON.Feature>(
    () => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: ruta },
      properties: {},
    }),
    [ruta],
  );

  const bbox = config?.bbox;
  return (
    <View style={{ height: alto, borderWidth: 1, borderColor: semantico.borde }}>
      <Map style={{ flex: 1 }} mapStyle={CONFIG.mapStyleUrl} attribution logo={false} compass>
        <Camera
          initialViewState={
            bbox
              ? { bounds: bbox, padding: { top: 24, bottom: 24, left: 24, right: 24 } }
              : { zoom: 13 }
          }
        />
        <GeoJSONSource id="celdas" data={celdasGeo}>
          <Layer
            id="celdas-relleno"
            type="fill"
            style={{ fillColor: colores.marca.verde, fillOpacity: 0.45 }}
          />
        </GeoJSONSource>
        <GeoJSONSource id="lotes" data={lotesGeo}>
          <Layer
            id="lotes-borde"
            type="line"
            style={{ lineColor: semantico.bordeFuerte, lineWidth: 2 }}
          />
          <Layer
            id="lotes-etiqueta"
            type="symbol"
            style={{
              textField: ['get', 'etiqueta'],
              textSize: 14,
              textColor: semantico.titulo,
              textHaloColor: '#ffffff',
              textHaloWidth: 2,
            }}
          />
        </GeoJSONSource>
        {ruta.length >= 2 ? (
          <GeoJSONSource id="ruta" data={rutaGeo}>
            <Layer
              id="ruta-linea"
              type="line"
              style={{ lineColor: colores.estados.info, lineWidth: 4 }}
            />
          </GeoJSONSource>
        ) : null}
        <UserLocation />
      </Map>
    </View>
  );
}
