/**
 * Gráficas simples para el celular, hechas con vistas (funcionan igual en Android, iOS y
 * navegador, sin librerías ni internet). Colores de la marca: negro para la serie principal,
 * verde para lo destacado y neutros para lo secundario. Esquinas rectas, sin sombras.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icono } from './Icono';
import { colores, espaciado, estilosBase, semantico, tipografia } from './tema';

const formato = (n: number, decimales = 0) =>
  n.toLocaleString('es-GT', { maximumFractionDigits: decimales, minimumFractionDigits: 0 });

/** Indicador grande con su variación respecto al período anterior. */
export function Indicador({
  etiqueta,
  valor,
  unidad,
  anterior,
  decimales = 0,
  /** Si subir es malo (p. ej. pérdidas o alertas), la flecha hacia arriba sale en rojo. */
  subirEsMalo,
  nota,
}: {
  etiqueta: string;
  valor: number | null;
  unidad?: string;
  anterior?: number | null;
  decimales?: number;
  subirEsMalo?: boolean;
  nota?: string;
}) {
  const hayVariacion =
    valor !== null && anterior !== null && anterior !== undefined && anterior > 0;
  const variacion = hayVariacion ? ((valor - anterior) / anterior) * 100 : 0;
  const sube = variacion > 0.5;
  const baja = variacion < -0.5;
  const malo = (sube && subirEsMalo) || (baja && !subirEsMalo);
  return (
    <View style={estilos.indicador}>
      <Text style={estilosBase.etiqueta} numberOfLines={2}>
        {etiqueta}
      </Text>
      <Text style={estilos.indicadorValor}>
        {valor === null ? '—' : formato(valor, decimales)}
        {unidad && valor !== null ? <Text style={estilos.indicadorUnidad}> {unidad}</Text> : null}
      </Text>
      {hayVariacion ? (
        <View style={estilos.variacion}>
          <Icono
            nombre={sube ? 'trending-up' : baja ? 'trending-down' : 'minus'}
            tamano={16}
            color={
              sube || baja
                ? malo
                  ? semantico.peligro
                  : semantico.exito
                : semantico.textoSecundario
            }
          />
          <Text
            style={[
              estilos.variacionTexto,
              {
                color:
                  sube || baja
                    ? malo
                      ? semantico.peligro
                      : semantico.exito
                    : semantico.textoSecundario,
              },
            ]}
          >
            {`${variacion > 0 ? '+' : ''}${formato(variacion, 0)} %`}
          </Text>
          <Text style={estilosBase.secundario}> vs. anterior</Text>
        </View>
      ) : nota ? (
        <Text style={estilosBase.secundario}>{nota}</Text>
      ) : null}
    </View>
  );
}

/** Rejilla de 2 columnas para indicadores. */
export function FilaIndicadores({ children }: { children: ReactNode }) {
  return <View style={estilos.rejilla}>{children}</View>;
}

export interface SerieBarras {
  nombre: string;
  color: string;
}

/**
 * Barras verticales (apiladas si hay varias series). `valores[i]` es la lista de valores de
 * cada serie para la categoría i.
 */
export function Barras({
  titulo,
  subtitulo,
  categorias,
  series,
  valores,
  alto = 150,
  destacarUltima = true,
  decimales = 0,
  sufijo = '',
}: {
  titulo: string;
  subtitulo?: string;
  categorias: string[];
  series: SerieBarras[];
  valores: number[][];
  alto?: number;
  destacarUltima?: boolean;
  decimales?: number;
  sufijo?: string;
}) {
  const totales = valores.map((v) => v.reduce((s, x) => s + x, 0));
  const maximo = Math.max(1, ...totales);
  return (
    <View style={estilos.grafica}>
      <Text style={estilos.titulo}>{titulo}</Text>
      {subtitulo ? <Text style={estilosBase.secundario}>{subtitulo}</Text> : null}
      <View style={[estilos.area, { height: alto + 22 }]}>
        {categorias.map((c, i) => {
          const actual = destacarUltima && i === categorias.length - 1;
          return (
            <View key={c} style={estilos.columna}>
              <Text style={[estilos.valorBarra, actual && { color: semantico.titulo }]}>
                {totales[i] ? `${formato(totales[i]!, decimales)}${sufijo}` : ''}
              </Text>
              <View style={{ height: (alto * (totales[i] ?? 0)) / maximo, width: '70%' }}>
                {[...series].reverse().map((s, k) => {
                  const idx = series.length - 1 - k;
                  const v = valores[i]?.[idx] ?? 0;
                  return (
                    <View
                      key={s.nombre}
                      style={{
                        flex: v,
                        backgroundColor: idx === 0 && actual ? colores.marca.verde700 : s.color,
                      }}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
      <View style={estilos.eje}>
        {categorias.map((c, i) => (
          <Text
            key={c}
            style={[
              estilos.categoria,
              destacarUltima && i === categorias.length - 1 && { color: semantico.titulo },
            ]}
            numberOfLines={1}
          >
            {c}
          </Text>
        ))}
      </View>
      {series.length > 1 ? <Leyenda series={series} /> : null}
    </View>
  );
}

/** Barras horizontales con etiqueta a la izquierda y valor a la derecha. */
export function BarrasHorizontales({
  titulo,
  subtitulo,
  filas,
  maximo,
  decimales = 0,
  sufijo = '',
  /** Desde este valor la barra sale en color de alerta. */
  umbral,
}: {
  titulo: string;
  subtitulo?: string;
  filas: { etiqueta: string; valor: number }[];
  maximo?: number;
  decimales?: number;
  sufijo?: string;
  umbral?: number;
}) {
  const max = maximo ?? Math.max(1, ...filas.map((f) => f.valor));
  return (
    <View style={estilos.grafica}>
      <Text style={estilos.titulo}>{titulo}</Text>
      {subtitulo ? <Text style={estilosBase.secundario}>{subtitulo}</Text> : null}
      <View style={{ marginTop: espaciado.sm, gap: espaciado.sm }}>
        {filas.map((f) => {
          const alerta = umbral !== undefined && f.valor >= umbral;
          return (
            <View key={f.etiqueta} style={estilos.filaH}>
              <Text style={estilos.etiquetaH} numberOfLines={2}>
                {f.etiqueta}
              </Text>
              <View style={estilos.pistaH}>
                <View
                  style={{
                    width: `${Math.min(100, (f.valor / max) * 100)}%`,
                    height: '100%',
                    backgroundColor: alerta ? semantico.alerta : semantico.bordeFuerte,
                  }}
                />
              </View>
              <Text style={[estilos.valorH, alerta && { color: semantico.peligro }]}>
                {`${formato(f.valor, decimales)}${sufijo}`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function Leyenda({ series }: { series: SerieBarras[] }) {
  return (
    <View style={estilos.leyenda}>
      {series.map((s) => (
        <View key={s.nombre} style={estilos.itemLeyenda}>
          <View style={{ width: 12, height: 12, backgroundColor: s.color }} />
          <Text style={estilosBase.secundario}>{s.nombre}</Text>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
    marginBottom: espaciado.md,
  },
  indicador: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: semantico.borde,
    backgroundColor: semantico.fondo,
    gap: 2,
  },
  indicadorValor: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 28,
    color: semantico.titulo,
    fontVariant: ['tabular-nums'],
  },
  indicadorUnidad: { fontFamily: tipografia.familias.cuerpo, fontSize: 14, color: semantico.texto },
  variacion: { flexDirection: 'row', alignItems: 'center', gap: 2, flexWrap: 'wrap' },
  variacionTexto: { fontFamily: tipografia.familias.cuerpoMedio, fontSize: 13 },
  grafica: {
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: semantico.borde,
    marginBottom: espaciado.md,
  },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 15,
    color: semantico.titulo,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  area: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: espaciado.sm,
    borderBottomWidth: 1,
    borderBottomColor: colores.graficas.ejes,
  },
  columna: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  valorBarra: {
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: 11,
    color: semantico.textoSecundario,
    marginBottom: 2,
    fontVariant: ['tabular-nums'],
  },
  eje: { flexDirection: 'row', marginTop: 4 },
  categoria: {
    flex: 1,
    textAlign: 'center',
    fontFamily: tipografia.familias.cuerpo,
    fontSize: 11,
    color: semantico.textoSecundario,
  },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.md, marginTop: espaciado.sm },
  itemLeyenda: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filaH: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  etiquetaH: {
    width: 112,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: 13,
    color: semantico.texto,
  },
  pistaH: { flex: 1, height: 16, backgroundColor: colores.neutros.n50 },
  valorH: {
    minWidth: 48,
    textAlign: 'right',
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: 13,
    color: semantico.titulo,
    fontVariant: ['tabular-nums'],
  },
});
