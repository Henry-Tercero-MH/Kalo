/**
 * Avisos y confirmaciones que funcionan igual en el celular y en el navegador.
 * En react-native-web, Alert.alert no hace nada (ni muestra el aviso ni llama a los
 * botones), así que en web se usan window.alert / window.confirm.
 */
import { Alert } from 'react-native';
import { esWeb } from '@/demo/entorno';
import i18n from '@/i18n';

/** Aviso con un solo botón «Aceptar»; `alAceptar` se llama al cerrarlo. */
export function avisar(titulo: string, mensaje?: string, alAceptar?: () => void) {
  if (esWeb) {
    try {
      globalThis.alert?.(mensaje ? `${titulo}\n\n${mensaje}` : titulo);
    } catch {
      // sin diálogos en este navegador
    }
    alAceptar?.();
    return;
  }
  Alert.alert(titulo, mensaje, [{ text: i18n.t('comun.aceptar'), onPress: alAceptar }]);
}

/** Confirmación Aceptar / Cancelar. */
export function confirmar(titulo: string, mensaje: string, alAceptar: () => void) {
  if (esWeb) {
    let ok = true;
    try {
      ok = globalThis.confirm ? globalThis.confirm(`${titulo}\n\n${mensaje}`) : true;
    } catch {
      // sin diálogos: se toma como aceptado
    }
    if (ok) alAceptar();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: i18n.t('comun.cancelar'), style: 'cancel' },
    { text: i18n.t('comun.aceptar'), onPress: alAceptar },
  ]);
}
