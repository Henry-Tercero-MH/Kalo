/**
 * Piezas visuales: tarjetas, muestras de color de cinta, estados con color + palabra.
 */
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono, type NombreIcono } from './Icono';
import { LOGO } from './logo-fuente';
import { Etiqueta, Texto } from './Texto';
import { campo, espaciado, semantico, tipografia } from './tema';

export function Tarjeta({
  children,
  onPress,
  destacada,
}: {
  children: ReactNode;
  onPress?: () => void;
  destacada?: boolean;
}) {
  const contenido = (
    <View
      style={[estilos.tarjeta, destacada && { borderColor: semantico.bordeFuerte, borderWidth: 2 }]}
    >
      {children}
    </View>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.8 }}
    >
      {contenido}
    </Pressable>
  ) : (
    contenido
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
      style={({ pressed }) => [estilos.filaMenu, pressed && { opacity: 0.75 }]}
    >
      <Icono nombre={icono} tamano={28} color={semantico.titulo} />
      <View style={{ flex: 1 }}>
        <Text style={estilos.tituloFila}>{titulo}</Text>
        {descripcion ? (
          <Texto style={{ fontSize: 14, color: semantico.textoSecundario }}>{descripcion}</Texto>
        ) : null}
      </View>
      {derecha ?? <Icono nombre="chevron-right" color={semantico.textoSecundario} />}
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
  const lado = grande ? 40 : 24;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaciado.sm }}>
      <View
        accessibilityLabel={nombre ? `Cinta ${nombre}` : undefined}
        style={{
          width: lado,
          height: lado,
          backgroundColor: hex,
          borderWidth: 1,
          borderColor: semantico.bordeFuerte,
        }}
      />
      {nombre ? (
        <Text style={[estilos.nombreColor, grande && { fontSize: 22 }]}>
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, backgroundColor: COLOR_ESTADO[tipo] }} />
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
    <View style={[estilos.aviso, { borderLeftColor: COLOR_ESTADO[tipo] }]}>
      <Icono
        nombre={tipo === 'peligro' || tipo === 'alerta' ? 'triangle-alert' : 'info'}
        color={semantico.titulo}
      />
      <Texto style={{ flex: 1 }}>{texto}</Texto>
    </View>
  );
}

/**
 * Logo de Inversiones Kalo arriba a la izquierda (mínimo 32 px de alto).
 * Si el archivo docs/marca/kalo-logo.png no está, se muestra «INVERSIONES KALO» en estilo título.
 * Para usar el logo: `pnpm --filter @kalo/mobile marca:logo` (nunca redibujarlo ni recolorearlo).
 */
export function Logo() {
  if (LOGO)
    return (
      <Image
        source={LOGO}
        style={{ height: 32, width: 154, maxWidth: '100%' }}
        resizeMode="contain"
        accessibilityLabel="Inversiones Kalo"
      />
    );
  return <Text style={estilos.logoTexto}>{'INVERSIONES\nKALO'}</Text>;
}

const estilos = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderColor: semantico.borde,
    padding: espaciado.lg,
    marginBottom: espaciado.md,
    backgroundColor: semantico.fondo,
  },
  filaMenu: {
    minHeight: campo.alturaTactil + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.lg,
    paddingVertical: espaciado.md,
    borderBottomWidth: 1,
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
  textoEstado: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.etiqueta,
    letterSpacing: 1,
  },
  valorDato: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 26,
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
    borderLeftWidth: 4,
    backgroundColor: semantico.fondoSuave,
    padding: espaciado.md,
    marginVertical: espaciado.sm,
  },
  logoTexto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 15,
    lineHeight: 17,
    letterSpacing: 1,
    color: semantico.titulo,
  },
});
