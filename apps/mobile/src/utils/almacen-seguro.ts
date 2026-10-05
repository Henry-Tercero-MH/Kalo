/**
 * Datos sensibles del dispositivo en el almacén seguro del sistema (Keystore en Android).
 * En el navegador (web) no hay almacén seguro: se usa localStorage (solo modo demo).
 */
import * as SecureStore from 'expo-secure-store';
import { esWeb } from '@/demo/entorno';

const CLAVES = {
  configuracion: 'kalo.configuracion',
  tokens: 'kalo.tokens',
  intentos: 'kalo.intentos_pin',
  preferencias: 'kalo.preferencias',
  ultimaSesion: 'kalo.ultima_sesion',
  modoDemo: 'kalo.modo_demo',
} as const;

export interface ConfiguracionDispositivo {
  apiUrl: string;
  dispositivoId: string;
  fincaId: string;
  fincaNombre: string;
  bbox: [number, number, number, number] | null;
  /** Clave AES-256 (hex) para respaldos cifrados; el servidor guarda una copia. */
  claveRespaldo: string;
  configuradoEn: number;
}

export interface TokensDispositivo {
  accessToken: string;
  refreshToken: string;
  expiraEn: number;
}

export interface Preferencias {
  archivosSoloWifi: boolean;
  ahorroBateria: boolean;
}

/** Acceso de bajo nivel: SecureStore en el celular, localStorage en el navegador. */
const almacenamiento = {
  async obtener(clave: string): Promise<string | null> {
    if (!esWeb) return SecureStore.getItemAsync(clave);
    try {
      return globalThis.localStorage?.getItem(clave) ?? null;
    } catch {
      return null;
    }
  },
  async guardar(clave: string, valor: string): Promise<void> {
    if (!esWeb) return SecureStore.setItemAsync(clave, valor);
    try {
      globalThis.localStorage?.setItem(clave, valor);
    } catch {
      // Navegación privada o cuota llena: se pierde al recargar, la app sigue funcionando.
    }
  },
  async borrar(clave: string): Promise<void> {
    if (!esWeb) return SecureStore.deleteItemAsync(clave);
    try {
      globalThis.localStorage?.removeItem(clave);
    } catch {
      // Sin acceso a localStorage: no hay nada que borrar.
    }
  },
};

async function leer<T>(clave: string): Promise<T | null> {
  const v = await almacenamiento.obtener(clave);
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}
const escribir = (clave: string, valor: unknown) =>
  almacenamiento.guardar(clave, JSON.stringify(valor));

export const almacen = {
  configuracion: () => leer<ConfiguracionDispositivo>(CLAVES.configuracion),
  guardarConfiguracion: (c: ConfiguracionDispositivo) => escribir(CLAVES.configuracion, c),
  tokens: () => leer<TokensDispositivo>(CLAVES.tokens),
  guardarTokens: (t: TokensDispositivo) => escribir(CLAVES.tokens, t),
  intentos: async () =>
    (await leer<{ fallidos: number; bloqueadoHasta: number }>(CLAVES.intentos)) ?? {
      fallidos: 0,
      bloqueadoHasta: 0,
    },
  guardarIntentos: (v: { fallidos: number; bloqueadoHasta: number }) =>
    escribir(CLAVES.intentos, v),
  preferencias: async (): Promise<Preferencias> =>
    (await leer<Preferencias>(CLAVES.preferencias)) ?? {
      archivosSoloWifi: false,
      ahorroBateria: false,
    },
  guardarPreferencias: (p: Preferencias) => escribir(CLAVES.preferencias, p),
  /** Dispositivo configurado con «Probar demo» (datos DEMO, sincronización simulada). */
  modoDemo: async () => (await leer<boolean>(CLAVES.modoDemo)) === true,
  guardarModoDemo: (v: boolean) => escribir(CLAVES.modoDemo, v),
  /** Borra todo (borrado remoto o reconfiguración). */
  async borrarTodo() {
    await Promise.all(Object.values(CLAVES).map((c) => almacenamiento.borrar(c)));
  },
};
