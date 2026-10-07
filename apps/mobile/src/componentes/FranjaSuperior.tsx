/**
 * Franja verde de la marca arriba de cada pantalla. Cubre también la zona de la barra de
 * estado del teléfono (hora, señal, batería), así lo de arriba del logo queda verde.
 */
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores } from './tema';

/** Alto de la franja debajo de la barra de estado. */
const ALTO = 12;

export function FranjaSuperior() {
  const { top } = useSafeAreaInsets();
  return <View style={{ height: top + ALTO, backgroundColor: colores.marca.verde600 }} />;
}
