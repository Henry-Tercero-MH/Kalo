/**
 * Datos sensibles del dispositivo en el almacén seguro del sistema (Keystore en Android).
 */
import * as SecureStore from 'expo-secure-store';

const CLAVES = {
  configuracion: 'kalo.configuracion',
  tokens: 'kalo.tokens',
  intentos: 'kalo.intentos_pin',
  preferencias: 'kalo.preferencias',
  ultimaSesion: 'kalo.ultima_sesion',
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

async function leer<T>(clave: string): Promise<T | null> {
  const v = await SecureStore.getItemAsync(clave);
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}
const escribir = (clave: string, valor: unknown) =>
  SecureStore.setItemAsync(clave, JSON.stringify(valor));

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
  /** Borra todo (borrado remoto o reconfiguración). */
  async borrarTodo() {
    await Promise.all(Object.values(CLAVES).map((c) => SecureStore.deleteItemAsync(c)));
  },
};
