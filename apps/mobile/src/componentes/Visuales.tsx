/**
 * Piezas visuales: tarjetas, muestras de color de cinta, estados con color + palabra.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Boton } from './Boton';
import { Icono, type NombreIcono } from './Icono';
import { LOGO } from './logo-fuente';
import { Etiqueta, Texto, TextoSecundario } from './Texto';
import {
  bordes,
  campo,
  control,
  espaciado,
  estilosBase,
  semantico,
  tamanoIcono,
  tipografia,
} from './tema';

export function Tarjeta({
  children,
  onPress,
  destacada,
}: {
  children: ReactNode;
  onPress?: () => void;
  destacada?: boolean;
}) {
  const contenido = (presionada: boolean) => (
    <View
      style={[
        estilos.tarjeta,
        // Si se toca, lleva el borde de control (5,3:1), no el gris de división.
        onPress && estilos.tarjetaTocable,
        destacada && estilos.tarjetaDestacada,
        presionada && estilosBase.presionado,
      ]}
    >
      {children}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => contenido(pressed)}
    </Pressable>
  ) : (
    contenido(false)
  );
}

/** Fila de menú grande con ícono, título y descripción. */
export function FilaMenu({
  icono,
  titulo,
  descripcion,
  onPress,
  derecha,
}: {
  icono: NombreIcono;
  titulo: string;
  descripcion?: string;
  onPress: () => void;
  derecha?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [estilos.filaMenu, pressed && estilosBase.presionado]}
    >
      <Icono nombre={icono} tamano={tamanoIcono.grande} color={semantico.titulo} />
      <View style={{ flex: 1 }}>
        <Text style={estilos.tituloFila}>{titulo}</Text>
        {descripcion ? <TextoSecundario>{descripcion}</TextoSecundario> : null}
      </View>
      {derecha ?? <Icono nombre="siguiente" color={semantico.textoSecundario} />}
    </Pressable>
  );
}

/** Los colores de cinta son datos: muestra + nombre escrito al lado. */
export function MuestraColor({
  hex,
  nombre,
  grande,
}: {
  hex: string;
  nombre?: string;
  grande?: boolean;
}) {
  const { t } = useTranslation();
  const lado = grande ? espaciado.xxl + espaciado.sm : campo.tamanoIcono;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaciado.sm }}>
      <View
        accessibilityLabel={nombre ? t('comun.cinta', { nombre }) : undefined}
        style={{
          width: lado,
          height: lado,
          backgroundColor: hex,
          borderWidth: bordes.lineaDivision,
          borderColor: semantico.bordeFuerte,
        }}
      />
      {nombre ? (
        <Text style={[estilos.nombreColor, grande && { fontSize: tipografia.tamanos.titulo }]}>
          {nombre.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

export type TipoEstado = 'exito' | 'alerta' | 'peligro' | 'info' | 'neutro';
const COLOR_ESTADO: Record<TipoEstado, string> = {
  exito: semantico.exito,
  alerta: semantico.alerta,
  peligro: semantico.peligro,
  info: semantico.info,
  neutro: semantico.textoSecundario,
};

/** Estado siempre con color Y palabra (el color solo no transmite significado). */
export function Estado({ tipo, texto }: { tipo: TipoEstado; texto: string }) {
  return (
    <View style={estilos.estado}>
      <View style={[estilos.marcaEstado, { backgroundColor: COLOR_ESTADO[tipo] }]} />
      <Text
        style={[
          estilos.textoEstado,
          { color: tipo === 'neutro' ? semantico.textoSecundario : semantico.titulo },
        ]}
      >
        {texto.toUpperCase()}
      </Text>
    </View>
  );
}

export function Dato({
  etiqueta,
  valor,
  unidad,
}: {
  etiqueta: string;
  valor: ReactNode;
  unidad?: string;
}) {
  return (
    <View style={{ marginBottom: espaciado.md }}>
      <Etiqueta>{etiqueta}</Etiqueta>
      <Text style={estilos.valorDato}>
        {valor}
        {unidad ? <Text style={estilos.unidad}> {unidad}</Text> : null}
      </Text>
    </View>
  );
}

export function Aviso({ texto, tipo = 'info' }: { texto: string; tipo?: TipoEstado }) {
  return (
    <View
      style={[estilos.aviso, { borderLeftColor: COLOR_ESTADO[tipo] }]}
      accessibilityRole={tipo === 'peligro' ? 'alert' : undefined}
      accessibilityLiveRegion={tipo === 'peligro' || tipo === 'alerta' ? 'polite' : undefined}
    >
      <Icono
        nombre={tipo === 'peligro' || tipo === 'alerta' ? 'triangle-alert' : 'info'}
        color={semantico.titulo}
      />
      <Texto style={{ flex: 1 }}>{texto}</Texto>
    </View>
  );
}

/**
 * Estado vacío: ícono, título, descripción y una acción opcional. Para listas sin datos o
 * pantallas que aún no tienen la información descargada (nunca un texto suelto).
 */
export function EstadoVacio({
  icono,
  titulo,
  descripcion,
  accion,
}: {
  icono: NombreIcono;
  titulo: string;
  descripcion?: string;
  accion?: { titulo: string; onPress: () => void; icono?: NombreIcono };
}) {
  return (
    <View style={estilos.vacio}>
      <Icono nombre={icono} tamano={tamanoIcono.grande} color={semantico.textoSecundario} />
      <Text accessibilityRole="header" style={estilos.vacioTitulo}>
        {titulo}
      </Text>
      {descripcion ? (
        <TextoSecundario style={estilos.vacioDescripcion}>{descripcion}</TextoSecundario>
      ) : null}
      {accion ? (
        <View style={estilos.vacioAccion}>
          <Boton
            titulo={accion.titulo}
            icono={accion.icono}
            variante="secundario"
            onPress={accion.onPress}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Algo falló (envío, descarga). Marco rojo de 2 pt + ícono + palabra: el error no depende solo
 * del color. `accion` suele ser «Reintentar» y es la acción principal del bloque.
 */
export function EstadoError({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: { titulo: string; onPress: () => void; icono?: NombreIcono };
}) {
  return (
    <View style={[estilos.vacio, estilos.error]} accessibilityRole="alert">
      <Icono nombre="alerta" tamano={tamanoIcono.grande} color={semantico.peligro} />
      <Text accessibilityRole="header" style={estilos.vacioTitulo}>
        {titulo}
      </Text>
      {descripcion ? <Texto style={estilos.vacioDescripcion}>{descripcion}</Texto> : null}
      {accion ? (
        <View style={estilos.vacioAccion}>
          <Boton titulo={accion.titulo} icono={accion.icono} onPress={accion.onPress} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Estado de carga. Con avance real (`progreso` 0–100, o `actual`/`total`) muestra el porcentaje
 * grande, una barra y «3 de 10»; sin avance conocido muestra solo el indicador giratorio:
 * nunca se inventa un porcentaje.
 */
export function EstadoCarga({
  titulo,
  descripcion,
  progreso,
  actual,
  total,
}: {
  titulo: string;
  descripcion?: string;
  progreso?: number | null;
  actual?: number;
  total?: number;
}) {
  const { t } = useTranslation();
  const conTotales = actual !== undefined && total !== undefined && total > 0;
  const bruto = conTotales ? (actual / total) * 100 : progreso;
  const porcentaje =
    bruto === undefined || bruto === null ? null : Math.round(Math.min(100, Math.max(0, bruto)));
  return (
    <View
      style={estilos.carga}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={titulo}
      accessibilityValue={porcentaje === null ? undefined : { min: 0, max: 100, now: porcentaje }}
      accessibilityLiveRegion="polite"
    >
      {porcentaje === null ? (
        <ActivityIndicator size="large" color={semantico.bordeFuerte} />
      ) : (
        <Text style={estilos.cargaPorcentaje}>{`${porcentaje} %`}</Text>
      )}
      <Text style={estilos.vacioTitulo}>{titulo}</Text>
      {porcentaje !== null ? (
        <View style={estilos.cargaBarra}>
          <View style={[estilos.cargaRelleno, { width: `${porcentaje}%` }]} />
        </View>
      ) : null}
      {conTotales ? (
        <TextoSecundario>{t('comun.avance', { actual, total })}</TextoSecundario>
      ) : null}
      {descripcion ? (
        <TextoSecundario style={estilos.vacioDescripcion}>{descripcion}</TextoSecundario>
      ) : null}
    </View>
  );
}

/**
 * Logo de Inversiones Kalo arriba a la izquierda (mínimo 32 px de alto).
 * Si el archivo docs/marca/kalo-logo.png no está, se muestra «INVERSIONES KALO» en estilo título.
 * Para usar el logo: `pnpm --filter @kalo/mobile marca:logo` (nunca redibujarlo ni recolorearlo).
 */
export function Logo() {
  const { t } = useTranslation();
  if (LOGO)
    return (
      <Image
        source={LOGO}
        style={{ height: 32, width: 154, maxWidth: '100%' }}
        resizeMode="contain"
        accessibilityLabel={t('comun.nombreMarca')}
      />
    );
  return <Text style={estilos.logoTexto}>{'INVERSIONES\nKALO'}</Text>;
}

const estilos = StyleSheet.create({
  tarjeta: {
    borderWidth: bordes.lineaDivision,
    borderColor: semantico.borde,
    padding: espaciado.lg,
    marginBottom: espaciado.md,
    backgroundColor: semantico.fondo,
  },
  tarjetaTocable: { borderColor: control.bordeTocable },
  tarjetaDestacada: {
    borderColor: semantico.bordeFuerte,
    borderWidth: bordes.lineaTitulo,
    // El borde crece 1 pt: se descuenta para que el contenido no se mueva.
    padding: espaciado.lg - (bordes.lineaTitulo - bordes.lineaDivision),
  },
  filaMenu: {
    minHeight: campo.alturaTactil + espaciado.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.lg,
    paddingVertical: espaciado.md,
    borderBottomWidth: bordes.lineaDivision,
    borderBottomColor: semantico.borde,
  },
  tituloFila: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.cuerpo,
    color: semantico.titulo,
    textTransform: 'uppercase',
  },
  nombreColor: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.cuerpo,
    color: semantico.titulo,
  },
  estado: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  marcaEstado: { width: espaciado.md, height: espaciado.md },
  textoEstado: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.etiqueta,
    letterSpacing: tipografia.espaciadoEtiquetas,
  },
  valorDato: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.tituloGrande,
    color: semantico.titulo,
    fontVariant: ['tabular-nums'],
  },
  unidad: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.tamanos.pequeno,
    color: semantico.textoSecundario,
  },
  aviso: {
    flexDirection: 'row',
    gap: espaciado.md,
    borderLeftWidth: espaciado.xs,
    backgroundColor: semantico.fondoSuave,
    padding: espaciado.md,
    marginVertical: espaciado.sm,
  },
  vacio: {
    alignItems: 'center',
    gap: espaciado.sm,
    paddingVertical: espaciado.xl,
    paddingHorizontal: espaciado.lg,
    marginVertical: espaciado.sm,
    borderWidth: bordes.lineaDivision,
    borderColor: semantico.borde,
    backgroundColor: semantico.fondoSuave,
  },
  vacioTitulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.cuerpo,
    color: semantico.titulo,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  vacioDescripcion: { textAlign: 'center' },
  vacioAccion: { alignSelf: 'stretch', marginTop: espaciado.sm },
  error: {
    borderWidth: bordes.lineaTitulo,
    borderColor: semantico.peligro,
    backgroundColor: semantico.peligroSuave,
    // El borde es 1 pt más grueso que el del estado vacío: se descuenta para no mover el contenido.
    paddingVertical: espaciado.xl - (bordes.lineaTitulo - bordes.lineaDivision),
    paddingHorizontal: espaciado.lg - (bordes.lineaTitulo - bordes.lineaDivision),
  },
  carga: {
    alignItems: 'center',
    gap: espaciado.sm,
    paddingVertical: espaciado.xl,
    paddingHorizontal: espaciado.lg,
    marginVertical: espaciado.sm,
  },
  cargaPorcentaje: {
    ...estilosBase.numero,
    fontSize: tipografia.tamanos.tituloGrande,
  },
  // Marco negro: el verde solo (1,8:1) no se distingue del blanco; el marco da el contraste.
  cargaBarra: {
    alignSelf: 'stretch',
    height: espaciado.md,
    borderWidth: control.grosor,
    borderColor: semantico.bordeFuerte,
    backgroundColor: semantico.fondo,
  },
  cargaRelleno: { height: '100%', backgroundColor: semantico.acento },
  logoTexto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.pequeno,
    lineHeight: tipografia.alturaLinea.ajustada,
    letterSpacing: tipografia.espaciadoLetras.enfasis,
    color: semantico.titulo,
  },
});
