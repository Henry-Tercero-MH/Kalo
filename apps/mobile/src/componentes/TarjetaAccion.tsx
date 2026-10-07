/**
 * Tarjeta grande de una tarea del inicio (ícono, título y estado del día). La usan los inicios
 * de cada perfil: caporal, técnico de sanidad, supervisor y administrador.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icono, type NombreIcono } from './Icono';
import { campo, espaciado, estilosBase, semantico, tipografia } from './tema';

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
        pressed && { backgroundColor: semantico.fondoSuave },
      ]}
    >
      <View style={[estilos.icono, { backgroundColor: fondoIcono }]}>
        <Icono nombre={icono} tamano={28} color={colorIcono} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={estilos.titulo}>{titulo}</Text>
        <Text style={estilosBase.secundario}>{estado}</Text>
      </View>
      <Icono nombre="chevron-right" color={semantico.textoSecundario} />
    </Pressable>
  );
}

/** Columna de tarjetas con el espacio entre ellas. */
export function ListaAcciones({ children }: { children: React.ReactNode }) {
  return <View style={{ gap: espaciado.md }}>{children}</View>;
}

const estilos = StyleSheet.create({
  tarjeta: {
    minHeight: campo.alturaTactil + 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: semantico.borde,
    backgroundColor: semantico.fondo,
  },
  destacada: { borderWidth: 2, borderColor: semantico.bordeFuerte },
  icono: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  titulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 18,
    color: semantico.titulo,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
});
