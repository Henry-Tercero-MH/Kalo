/**
 * Mapa de la finca en el navegador con Leaflet: mapa base satelital o de calles, lotes con su
 * cobertura de la semana, celdas recorridas, ruta activa y posición del usuario.
 * Todos los datos salen de la base local; solo el mapa base necesita internet.
 */
import 'leaflet/dist/leaflet.css';
import { colores } from '@kalo/ui-tokens';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { usePosicion } from '@/gps/lote-actual';
import { CAPAS_BASE, type CapaBase } from './mapa/capas-base';
import { etiquetaLote, useDatosMapa, type PropsMapa } from './mapa/datos';
import { espaciado, semantico, tipografia } from './tema';

/** Lado [lat, lng] de Leaflet a partir de [lng, lat] GeoJSON. */
const aLatLng = ([lng, lat]: [number, number] | number[]): L.LatLngTuple => [
  lat as number,
  lng as number,
];

/** Estilos de las etiquetas de lote (Leaflet usa HTML propio para los tooltips). */
const CSS_ETIQUETAS = `
.kalo-etiqueta-lote{background:${semantico.fondo};border:2px solid ${semantico.bordeFuerte};border-radius:0;
box-shadow:none;padding:1px 4px;font-family:${tipografia.familias.titulo},Archivo,sans-serif;font-size:11px;
color:${semantico.titulo};letter-spacing:.04em;white-space:nowrap}
.kalo-etiqueta-lote::before{display:none}
.leaflet-container{font-family:${tipografia.familias.cuerpo},Archivo,sans-serif;background:${colores.neutros.n50}}
.leaflet-control-attribution{font-size:10px}
.leaflet-bar{border-radius:0!important;border:2px solid ${semantico.bordeFuerte}!important}
.leaflet-bar a{border-radius:0!important;width:40px!important;height:40px!important;line-height:40px!important}
`;

export function MapaLeaflet({ alto = 420, rutaId }: PropsMapa) {
  const { t } = useTranslation();
  const datos = useDatosMapa(rutaId);
  const posicion = usePosicion((s) => s.ubicacion);
  const contenedor = useRef<View>(null);
  const mapa = useRef<L.Map | null>(null);
  const capaBase = useRef<L.TileLayer | null>(null);
  const capas = useRef<L.LayerGroup | null>(null);
  const encuadrado = useRef(false);
  const limitesFinca = useRef<L.LatLngBounds | null>(null);
  const [base, setBase] = useState<CapaBase['id']>('satelite');
  const [sinMapaBase, setSinMapaBase] = useState(false);

  // Crear el mapa una sola vez.
  useEffect(() => {
    const nodo = contenedor.current as unknown as HTMLElement | null;
    if (!nodo) return;
    if (!document.getElementById('kalo-leaflet-css')) {
      const estilo = document.createElement('style');
      estilo.id = 'kalo-leaflet-css';
      estilo.textContent = CSS_ETIQUETAS;
      document.head.appendChild(estilo);
    }
    const m = L.map(nodo, {
      zoomControl: true,
      attributionControl: true,
      // Zoom fraccionario: la finca llena el recuadro en cualquier ancho de pantalla.
      zoomSnap: 0.25,
      zoomDelta: 0.5,
    });
    m.setView([15.47, -88.81], 14);
    capas.current = L.layerGroup().addTo(m);
    mapa.current = m;
    // El contenedor de react-native-web puede medir 0 al montar: se recalcula el tamaño
    // y se vuelve a encuadrar la finca con el tamaño real.
    const timer = setTimeout(() => {
      m.invalidateSize();
      if (limitesFinca.current?.isValid()) m.fitBounds(limitesFinca.current, { padding: [12, 12] });
    }, 80);
    return () => {
      clearTimeout(timer);
      m.remove();
      mapa.current = null;
    };
  }, []);

  // Mapa base (satélite o calles). Si las teselas no cargan, se avisa y siguen los lotes.
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    capaBase.current?.remove();
    const def = CAPAS_BASE.find((c) => c.id === base)!;
    let cargadas = 0;
    let fallidas = 0;
    setSinMapaBase(false);
    const capa = L.tileLayer(def.url, { maxZoom: def.maxZoom, attribution: def.atribucion });
    capa.on('tileload', () => {
      cargadas++;
      setSinMapaBase(false);
    });
    capa.on('tileerror', () => {
      fallidas++;
      if (cargadas === 0 && fallidas >= 4) setSinMapaBase(true);
    });
    capa.addTo(m);
    capa.bringToBack();
    capaBase.current = capa;
  }, [base]);

  // Lotes, celdas de cobertura, ruta y posición.
  useEffect(() => {
    const m = mapa.current;
    const grupo = capas.current;
    if (!m || !grupo) return;
    grupo.clearLayers();
    const limites = L.latLngBounds([]);

    for (const c of datos.celdas) {
      L.polygon(
        c.geometria.coordinates.map((poli) => poli.map((anillo) => anillo.map(aLatLng))),
        { stroke: false, fillColor: colores.marca.verde, fillOpacity: 0.55, interactive: false },
      ).addTo(grupo);
    }

    for (const lote of datos.lotes) {
      const anillos = lote.geometria.coordinates.map((anillo) => anillo.map(aLatLng));
      const poligono = L.polygon(anillos, {
        color: '#ffffff',
        weight: 2.5,
        fillColor: colores.neutros.n900,
        fillOpacity: 0.08,
      }).addTo(grupo);
      poligono
        .bindTooltip(etiquetaLote(lote.codigo, datos.porcentajes[lote.id]), {
          permanent: true,
          direction: 'center',
          className: 'kalo-etiqueta-lote',
        })
        .bindPopup(
          `<strong>${lote.nombre}</strong><br>${lote.hectareas.toFixed(2).replace('.', ',')} ha · ` +
            `cobertura ${Math.round(datos.porcentajes[lote.id] ?? 0)} %`,
        );
      limites.extend(poligono.getBounds());
    }

    if (datos.ruta.length >= 2) {
      L.polyline(datos.ruta.map(aLatLng), {
        color: colores.estados.info,
        weight: 4,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(grupo);
    }

    if (posicion) {
      L.circleMarker([posicion.lat, posicion.lng], {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: colores.estados.info,
        fillOpacity: 1,
      })
        .bindTooltip(t('mapa.ustedEstaAqui', 'Usted está aquí'))
        .addTo(grupo);
    }

    // Encuadra la finca la primera vez que hay lotes.
    if (!encuadrado.current && limites.isValid()) {
      limitesFinca.current = limites;
      m.invalidateSize();
      m.fitBounds(limites, { padding: [12, 12] });
      encuadrado.current = true;
    }
  }, [datos, posicion, t]);

  return (
    <View style={{ height: alto, borderWidth: 1, borderColor: semantico.borde }}>
      <View ref={contenedor} style={{ flex: 1 }} />
      {/* Selector de mapa base: botones grandes, esquinas rectas. */}
      <View
        style={{
          position: 'absolute',
          top: espaciado.sm,
          right: espaciado.sm,
          flexDirection: 'row',
          zIndex: 1000,
        }}
      >
        {CAPAS_BASE.map((c) => {
          const activa = c.id === base;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected: activa }}
              onPress={() => setBase(c.id)}
              style={{
                minHeight: 40,
                paddingHorizontal: espaciado.md,
                justifyContent: 'center',
                backgroundColor: activa ? semantico.bordeFuerte : semantico.fondo,
                borderWidth: 2,
                borderColor: semantico.bordeFuerte,
              }}
            >
              <Text
                style={{
                  fontFamily: tipografia.familias.titulo,
                  fontSize: 12,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  color: activa ? semantico.fondo : semantico.titulo,
                }}
              >
                {t(`mapa.base.${c.id}`, c.nombre)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {sinMapaBase ? (
        <View
          style={{
            position: 'absolute',
            left: espaciado.sm,
            right: espaciado.sm,
            bottom: espaciado.xl,
            backgroundColor: semantico.fondo,
            borderLeftWidth: 4,
            borderLeftColor: semantico.alerta,
            padding: espaciado.sm,
            zIndex: 1000,
          }}
        >
          <Text
            style={{ fontFamily: tipografia.familias.cuerpo, fontSize: 13, color: semantico.texto }}
          >
            {t(
              'mapa.sinMapaBase',
              'Sin mapa base (sin internet): se muestran los lotes y la cobertura.',
            )}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
