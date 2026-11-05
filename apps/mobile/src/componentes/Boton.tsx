import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono, type NombreIcono } from './Icono';
import { bordes, campo, control, espaciado, semantico, tamanoIcono, tipografia } from './tema';

type Variante = 'principal' | 'secundario' | 'peligro';

/**
 * Botón principal: fondo verde, texto #111111. Secundario: borde negro sobre blanco.
 * Alto mínimo 56 px (uso con guantes). Esquinas rectas, sin sombras.
 * Deshabilitado: fondo suave, borde gris y texto secundario (no solo transparencia, que al sol
 * se confunde con un botón activo). Con `motivoDeshabilitado` se dice debajo qué falta.
 */
export function Boton({
  titulo,
  onPress,
  variante = 'principal',
  icono,
  deshabilitado,
  cargando,
  accessibilityHint,
  motivoDeshabilitado,
}: {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  icono?: NombreIcono;
  deshabilitado?: boolean;
  cargando?: boolean;
  accessibilityHint?: string;
  /** Texto bajo el botón cuando está deshabilitado (p. ej. «Elija la labor y el lote»). */
  motivoDeshabilitado?: string;
}) {
  const inactivo = deshabilitado || cargando;
  // Cargando conserva su aspecto (está trabajando); deshabilitado se ve apagado.
  const apagado = deshabilitado && !cargando;
  const colorTexto = apagado
    ? semantico.textoSecundario
    : variante === 'principal'
      ? semantico.textoSobreAcento
      : variante === 'peligro'
        ? semantico.peligro
        : semantico.titulo;
  const mostrarMotivo = apagado && Boolean(motivoDeshabilitado);
  const boton = (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      accessibilityHint={mostrarMotivo ? motivoDeshabilitado : accessibilityHint}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        variante === 'principal' ? estilos.principal : estilos.secundario,
        variante === 'peligro' && { borderColor: semantico.peligro },
        pressed && (variante === 'principal' ? estilos.principalPresionado : estilos.presionado),
        apagado && estilos.apagado,
        mostrarMotivo && { marginBottom: 0 },
      ]}
    >
      <View style={estilos.contenido}>
        {cargando ? (
          <ActivityIndicator color={colorTexto} />
        ) : icono ? (
          <Icono nombre={icono} color={colorTexto} />
        ) : null}
        <Text
          style={[estilos.texto, { color: colorTexto }]}
          maxFontSizeMultiplier={tipografia.escalaMaxima.controles}
        >
          {titulo}
        </Text>
      </View>
    </Pressable>
  );
  if (!mostrarMotivo) return boton;
  return (
    <View>
      {boton}
      <View style={estilos.motivo}>
        <Icono nombre="info" tamano={tamanoIcono.pequeno} color={semantico.textoSecundario} />
        <Text style={estilos.motivoTexto}>{motivoDeshabilitado}</Text>
      </View>
    </View>
  );
}

/**
 * Botón de solo ícono (volver, quitar, cerrar). `etiqueta` es obligatoria: es lo que dice el
 * lector de pantalla. 44 pt visibles + `hitSlop` hasta los 56 pt de campo, sin agrandar la fila.
 * `contorno` lleva el borde de control (para acciones dentro de listas); `fantasma`, sin borde.
 */
export function BotonIcono({
  icono,
  etiqueta,
  onPress,
  variante = 'fantasma',
  color = semantico.titulo,
  tamano = tamanoIcono.normal,
}: {
  icono: NombreIcono;
  etiqueta: string;
  onPress: () => void;
  variante?: 'contorno' | 'fantasma';
  color?: string;
  /** Tamaño del ícono (token de `tamanoIcono`); el área táctil no cambia. */
  tamano?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      hitSlop={(campo.alturaTactil - TAMANO_BOTON_ICONO) / 2}
      style={({ pressed }) => [
        estilos.botonIcono,
        variante === 'contorno' && estilos.botonIconoContorno,
        pressed && estilos.botonIconoPresionado,
      ]}
    >
      <Icono nombre={icono} tamano={tamano} color={color} />
    </Pressable>
  );
}

/** Mínimo táctil de WCAG/Apple; el `hitSlop` completa los 56 pt de campo. */
const TAMANO_BOTON_ICONO = 44;

const estilos = StyleSheet.create({
  botonIcono: {
    width: TAMANO_BOTON_ICONO,
    height: TAMANO_BOTON_ICONO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonIconoContorno: { borderWidth: control.grosor, borderColor: control.borde },
  botonIconoPresionado: { backgroundColor: semantico.fondoSuave },
  base: {
    minHeight: campo.alturaTactil,
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.sm,
    justifyContent: 'center',
    borderRadius: bordes.radio,
    marginVertical: espaciado.xs,
  },
  principal: { backgroundColor: semantico.acento },
  principalPresionado: { backgroundColor: semantico.acentoPresionado },
  secundario: {
    backgroundColor: semantico.fondo,
    borderWidth: control.grosorFoco,
    borderColor: semantico.bordeFuerte,
  },
  presionado: { backgroundColor: semantico.fondoSuave },
  apagado: {
    backgroundColor: semantico.fondoSuave,
    borderWidth: control.grosor,
    borderColor: semantico.borde,
  },
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm,
  },
  texto: {
    flexShrink: 1,
    textAlign: 'center',
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.cuerpo,
    textTransform: 'uppercase',
    letterSpacing: tipografia.espaciadoLetras.titulo,
  },
  motivo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.xs,
    marginTop: espaciado.xs,
    marginBottom: espaciado.xs,
  },
  motivoTexto: {
    flex: 1,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.tamanos.pequeno,
    color: semantico.textoSecundario,
  },
});
