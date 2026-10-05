import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono, type NombreIcono } from './Icono';
import { campo, espaciado, semantico, tipografia } from './tema';

type Variante = 'principal' | 'secundario' | 'peligro';

/**
 * Botón principal: fondo verde, texto #111111. Secundario: borde negro sobre blanco.
 * Alto mínimo 56 px (uso con guantes). Esquinas rectas, sin sombras.
 */
export function Boton({
  titulo,
  onPress,
  variante = 'principal',
  icono,
  deshabilitado,
  cargando,
  accessibilityHint,
}: {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  icono?: NombreIcono;
  deshabilitado?: boolean;
  cargando?: boolean;
  accessibilityHint?: string;
}) {
  const inactivo = deshabilitado || cargando;
  const colorTexto = variante === 'principal' ? semantico.textoSobreAcento : variante === 'peligro' ? semantico.peligro : semantico.titulo;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      accessibilityHint={accessibilityHint}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        variante === 'principal' ? estilos.principal : estilos.secundario,
        variante === 'peligro' && { borderColor: semantico.peligro },
        inactivo && estilos.inactivo,
        pressed && estilos.presionado,
      ]}
    >
      <View style={estilos.contenido}>
        {cargando ? <ActivityIndicator color={colorTexto} /> : icono ? <Icono nombre={icono} color={colorTexto} /> : null}
        <Text style={[estilos.texto, { color: colorTexto }]}>{titulo}</Text>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: campo.alturaTactil,
    paddingHorizontal: espaciado.lg,
    justifyContent: 'center',
    borderRadius: 0,
    marginVertical: espaciado.xs,
  },
  principal: { backgroundColor: semantico.acento },
  secundario: { backgroundColor: semantico.fondo, borderWidth: 2, borderColor: semantico.bordeFuerte },
  inactivo: { opacity: 0.45 },
  presionado: { opacity: 0.8 },
  contenido: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espaciado.sm },
  texto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.cuerpo,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
