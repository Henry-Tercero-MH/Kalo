/**
 * Tarjeta grande de una tarea del inicio (ícono, título y estado del día). La usan los inicios
 * de cada perfil: caporal, técnico de sanidad, supervisor y administrador.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono, type NombreIcono } from './Icono';
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

export function TarjetaAccion({
  icono,
  titulo,
  estado,
  destacada,
  peligro,
  onPress,
}: {
  icono: NombreIcono;
  titulo: string;
  estado: string;
  /** Resalta la tarjeta (borde negro y cuadro verde): hay algo pendiente. */
  destacada?: boolean;
  /** Cuadro rojo (p. ej. alertas abiertas). */
  peligro?: boolean;
  onPress: () => void;
}) {
  const fondoIcono = peligro
    ? semantico.peligro
    : destacada
      ? semantico.acento
      : semantico.bordeFuerte;
  const colorIcono = destacada && !peligro ? semantico.titulo : semantico.fondo;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${estado}`}
      style={({ pressed }) => [
        estilos.tarjeta,
        (destacada || peligro) && estilos.destacada,
        pressed && estilosBase.presionado,
      ]}
    >
      <View style={[estilos.icono, { backgroundColor: fondoIcono }]}>
        <Icono nombre={icono} tamano={tamanoIcono.grande} color={colorIcono} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={estilos.titulo}>{titulo}</Text>
        <Text style={estilosBase.secundario}>{estado}</Text>
      </View>
      <Icono nombre="siguiente" color={semantico.textoSecundario} />
    </Pressable>
  );
}

/** Columna de tarjetas con el espacio entre ellas. */
export function ListaAcciones({ children }: { children: React.ReactNode }) {
  return <View style={{ gap: espaciado.md }}>{children}</View>;
}

const estilos = StyleSheet.create({
  tarjeta: {
    minHeight: campo.alturaTactil + espaciado.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderWidth: control.grosor,
    // Se toca: borde de control (5,3:1), no el gris de división (1,3:1), que al sol no se ve.
    borderColor: control.bordeTocable,
    backgroundColor: semantico.fondo,
  },
  destacada: {
    borderWidth: bordes.lineaTitulo,
    borderColor: semantico.bordeFuerte,
    // El borde crece 1 pt: se descuenta para que el contenido no se mueva.
    padding: espaciado.md - (bordes.lineaTitulo - bordes.lineaDivision),
  },
  icono: {
    width: campo.alturaTactil,
    height: campo.alturaTactil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.subtitulo,
    color: semantico.titulo,
    textTransform: 'uppercase',
    letterSpacing: tipografia.espaciadoLetras.titulo,
    marginBottom: espaciado.xs,
  },
});
