/**
 * Mapa de la finca (MapLibre). Mapa base descargado sin conexión + polígonos y cobertura
 * desde la base local (funcionan siempre, aun sin mapa base).
 */
import { semanaIso } from '@kalo/shared';
import { Camera, GeoJSONSource, Layer, Map, UserLocation } from '@maplibre/maplibre-react-native';
import { Q } from '@nozbe/watermelondb';
import { useMemo } from 'react';
import { View } from 'react-native';
import { CONFIG } from '@/config';
import { useConsulta } from '@/db/hooks';
import { useLotes } from '@/gps/lote-actual';
import { useConfiguracion } from '@/permisos/contexto';
import { colores, semantico } from './tema';

export function MapaFinca({ alto = 420, rutaId }: { alto?: number; rutaId?: string | null }) {
  const config = useConfiguracion();
  const lotes = useLotes();
  const s = useMemo(() => semanaIso(new Date()), []);
  const cobertura = useConsulta(
    'cobertura_lote',
    [Q.where('anio', s.anio), Q.where('semana', s.numero)],
    [s.anio, s.numero],
  );
  const puntos = useConsulta(
    'puntos_ruta',
    [Q.where('ruta_id', rutaId ?? '__ninguna__'), Q.sortBy('secuencia', Q.asc)],
    [rutaId],
  );

  const lotesGeo = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: lotes.map((l) => ({
        type: 'Feature',
        id: l.id,
        geometry: l.geometria,
        properties: {
          codigo: l.codigo,
          etiqueta: `${l.codigo} · ${Math.round(cobertura.find((c) => c.lote_id === l.id)?.porcentaje ?? 0)} %`,
        },
      })),
    }),
    [lotes, cobertura],
  );

  const celdasGeo = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: cobertura.flatMap((c) => {
        try {
          return [
            {
              type: 'Feature' as const,
              geometry: JSON.parse(c.celdas) as GeoJSON.MultiPolygon,
              properties: {},
            },
          ];
        } catch {
          return [];
        }
      }),
    }),
    [cobertura],
  );

  const rutaGeo = useMemo<GeoJSON.Feature>(
    () => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: puntos.map((p) => [p.lng, p.lat]) },
      properties: {},
    }),
    [puntos],
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
        {puntos.length >= 2 ? (
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
