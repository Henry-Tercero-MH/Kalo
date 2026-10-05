/**
 * Almacenamiento pequeño de la ruta activa (sobrevive a cierres de la app).
 *  - Android / iOS (también Expo Go): expo-secure-store.
 *  - Web: localStorage (expo-secure-store no existe en el navegador).
 * Si nada de eso funciona, queda en memoria mientras la app esté abierta.
 */
import * as SecureStore from 'expo-secure-store';
import { esWeb } from '@/demo/entorno';

const memoria = new Map<string, string>();

function localStorageSeguro(): Storage | null {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

export async function leerValor(clave: string): Promise<string | null> {
  try {
    if (esWeb) {
      const ls = localStorageSeguro();
      if (ls) return ls.getItem(clave);
    } else {
      return await SecureStore.getItemAsync(clave);
    }
  } catch (e) {
    console.warn('No se pudo leer el almacén local', e);
  }
  return memoria.get(clave) ?? null;
}

export async function guardarValor(clave: string, valor: string | null): Promise<void> {
  if (valor === null) memoria.delete(clave);
  else memoria.set(clave, valor);
  try {
    if (esWeb) {
      const ls = localStorageSeguro();
      if (!ls) return;
      if (valor === null) ls.removeItem(clave);
      else ls.setItem(clave, valor);
    } else if (valor === null) {
      await SecureStore.deleteItemAsync(clave);
    } else {
      await SecureStore.setItemAsync(clave, valor);
    }
  } catch (e) {
    console.warn('No se pudo escribir en el almacén local', e);
  }
}
