import { Redirect } from 'expo-router';

/**
 * Cualquier ruta desconocida vuelve a la entrada. Así la versión web funciona aunque se
 * publique en una ruta que la app no conoce (por ejemplo, dentro de un visor de enlaces).
 */
export default function NoEncontrado() {
  return <Redirect href="/" />;
}
