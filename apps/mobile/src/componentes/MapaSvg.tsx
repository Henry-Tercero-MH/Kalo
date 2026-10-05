/**
 * Mapa esquemático de la finca con react-native-svg (Expo Go y navegador web, donde no hay
 * MapLibre nativo). Sin mapa base: dibuja los polígonos de los lotes, la cobertura de la
 * semana, la ruta activa y la posición del usuario, todo desde la base local.
 *
 * Proyección equirectangular local: x = lng · cos(lat₀), y = lat, ajustada al bbox de los
 * lotes. A la escala de una finca (pocos km) la distorsión es despreciable.
 */
import type { Posicion } from '@kalo/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Polyline, Text as TextoSvg } from 'react-native-svg';
import { usePosicion } from '@/gps/lote-actual';
import { useConfiguracion } from '@/permisos/contexto';
import { etiquetaLote, useDatosMapa, type PropsMapa } from './mapa/datos';
import { TextoSecundario } from './Texto';
import { colores, espaciado, semantico, tipografia } from './tema';

const MARGEN = 18;

type Anillo = Posicion[];

/** Anillos exteriores e interiores de un Polygon o MultiPolygon. */
function poligonos(g: { type: string; coordinates: unknown }): Anillo[][] {
  if (g.type === 'Polygon') return [g.coordinates as Anillo[]];
  if (g.type === 'MultiPolygon') return g.coordinates as Anillo[][];
  return [];
}

interface Proyeccion {
  x: (lng: number) => number;
  y: (lat: number) => number;
}

function crearProyeccion(
  bbox: [number, number, number, number],
  ancho: number,
  alto: number,
): Proyeccion {
  const [oeste, sur, este, norte] = bbox;
  const cosLat = Math.cos((((sur + norte) / 2) * Math.PI) / 180);
  const anchoGeo = Math.max((este - oeste) * cosLat, 1e-9);
  const altoGeo = Math.max(norte - sur, 1e-9);
  const escala = Math.min((ancho - 2 * MARGEN) / anchoGeo, (alto - 2 * MARGEN) / altoGeo);
  // Centrado en el espacio disponible.
  const dx = (ancho - anchoGeo * escala) / 2;
  const dy = (alto - altoGeo * escala) / 2;
  return {
    x: (lng) => dx + (lng - oeste) * cosLat * escala,
    y: (lat) => dy + (norte - lat) * escala,
  };
}

function rutaSvg(anillos: Anillo[], p: Proyeccion): string {
  return anillos
    .map(
      (anillo) =>
        anillo
          .map(
            ([lng, lat], i) =>
              `${i === 0 ? 'M' : 'L'}${p.x(lng).toFixed(1)},${p.y(lat).toFixed(1)}`,
          )
          .join('') + 'Z',
    )
    .join('');
}

function bboxDe(coordenadas: Posicion[]): [number, number, number, number] | null {
  if (coordenadas.length === 0) return null;
  let [oeste, sur, este, norte] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [lng, lat] of coordenadas) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    oeste = Math.min(oeste, lng);
    este = Math.max(este, lng);
    sur = Math.min(sur, lat);
    norte = Math.max(norte, lat);
  }
  return Number.isFinite(oeste) ? [oeste, sur, este, norte] : null;
}

/** Punto para la etiqueta: centro del bbox del anillo exterior más grande. */
function centroEtiqueta(anillos: Anillo[][]): Posicion | null {
  let mejor: Anillo | null = null;
  for (const pol of anillos) {
    const ext = pol[0];
    if (ext && (!mejor || ext.length > mejor.length)) mejor = ext;
  }
  const b = mejor ? bboxDe(mejor) : null;
  return b ? [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] : null;
}

export function MapaSvg({ alto = 420, rutaId }: PropsMapa) {
  const { t } = useTranslation();
  const config = useConfiguracion();
  const { lotes, porcentajes, celdas, ruta } = useDatosMapa(rutaId);
  const ubicacion = usePosicion((s) => s.ubicacion);
  const [ancho, setAncho] = useState(0);

  const bbox = useMemo(() => {
    const todas = lotes.flatMap((l) => poligonos(l.geometria).flatMap((pol) => pol[0] ?? []));
    return bboxDe(todas) ?? config?.bbox ?? bboxDe(ruta);
  }, [lotes, config?.bbox, ruta]);

  const dibujo = useMemo(() => {
    if (!bbox || ancho <= 0) return null;
    const p = crearProyeccion(bbox, ancho, alto);
    return {
      p,
      lotes: lotes.map((l) => {
        const anillos = poligonos(l.geometria);
        const centro = centroEtiqueta(anillos);
        return {
          id: l.id,
          d: anillos.map((pol) => rutaSvg(pol, p)).join(''),
          etiqueta: etiquetaLote(l.codigo, porcentajes[l.id]),
          x: centro ? p.x(centro[0]) : null,
          y: centro ? p.y(centro[1]) : null,
        };
      }),
      celdas: celdas.map((c, i) => ({
        clave: `${c.loteId}-${i}`,
        d: c.geometria.coordinates.map((pol) => rutaSvg(pol, p)).join(''),
      })),
      ruta: ruta.map(([lng, lat]) => `${p.x(lng).toFixed(1)},${p.y(lat).toFixed(1)}`).join(' '),
    };
  }, [bbox, ancho, alto, lotes, porcentajes, celdas, ruta]);

  const posicion =
    dibujo && ubicacion ? { x: dibujo.p.x(ubicacion.lng), y: dibujo.p.y(ubicacion.lat) } : null;
  const posicionVisible =
    posicion && posicion.x >= 0 && posicion.x <= ancho && posicion.y >= 0 && posicion.y <= alto;

  return (
    <View>
      <View
        style={{
          height: alto,
          borderWidth: 1,
          borderColor: semantico.borde,
          backgroundColor: semantico.fondoSuave,
          justifyContent: 'center',
        }}
        onLayout={(e) => setAncho(Math.round(e.nativeEvent.layout.width))}
      >
        {!bbox ? (
          <TextoSecundario style={{ textAlign: 'center', padding: espaciado.md }}>
            {t('mapa.sinLotes', 'Aún no hay lotes descargados en este teléfono.')}
          </TextoSecundario>
        ) : dibujo ? (
          <Svg width={ancho} height={alto}>
            <G>
              {dibujo.lotes.map((l) => (
                <Path key={`f-${l.id}`} d={l.d} fill={semantico.fondo} fillRule="evenodd" />
              ))}
              {dibujo.celdas.map((c) => (
                <Path
                  key={c.clave}
                  d={c.d}
                  fill={colores.marca.verde}
                  fillOpacity={0.45}
                  fillRule="evenodd"
                />
              ))}
              {dibujo.lotes.map((l) => (
                <Path
                  key={`b-${l.id}`}
                  d={l.d}
                  fill="none"
                  stroke={semantico.bordeFuerte}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              ))}
              {ruta.length >= 2 ? (
                <Polyline
                  points={dibujo.ruta}
                  fill="none"
                  stroke={colores.estados.info}
                  strokeWidth={4}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}
              {dibujo.lotes.map((l) =>
                l.x === null || l.y === null ? null : (
                  <G key={`e-${l.id}`}>
                    <TextoSvg
                      x={l.x}
                      y={l.y}
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight="bold"
                      fontFamily={tipografia.familias.cuerpoMedio}
                      stroke="#ffffff"
                      strokeWidth={3}
                      strokeLinejoin="round"
                      fill="#ffffff"
                    >
                      {l.etiqueta}
                    </TextoSvg>
                    <TextoSvg
                      x={l.x}
                      y={l.y}
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight="bold"
                      fontFamily={tipografia.familias.cuerpoMedio}
                      fill={semantico.titulo}
                    >
                      {l.etiqueta}
                    </TextoSvg>
                  </G>
                ),
              )}
              {posicion && posicionVisible ? (
                <G>
                  <Circle
                    cx={posicion.x}
                    cy={posicion.y}
                    r={14}
                    fill={colores.estados.info}
                    fillOpacity={0.2}
                  />
                  <Circle
                    cx={posicion.x}
                    cy={posicion.y}
                    r={7}
                    fill={colores.estados.info}
                    stroke="#ffffff"
                    strokeWidth={2.5}
                  />
                </G>
              ) : null}
            </G>
          </Svg>
        ) : null}
      </View>
      <TextoSecundario style={{ marginTop: espaciado.xs }}>
        {t('mapa.esquematico', 'Vista esquemática: lotes y cobertura, sin mapa base.')}
      </TextoSecundario>
    </View>
  );
}
