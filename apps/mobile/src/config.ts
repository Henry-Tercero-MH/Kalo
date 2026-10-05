import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  datos?: 'mock' | 'api';
  apiUrl?: string;
  mapStyleUrl?: string;
  sentryDsn?: string;
};

/** Valores por defecto; la URL de la API se puede cambiar al configurar el dispositivo. */
export const CONFIG = {
  /** Origen de datos: 'mock' (DEMO local, sin API) o 'api' (servidor real). */
  datos: extra.datos === 'api' ? ('api' as const) : ('mock' as const),
  apiUrlPorDefecto: extra.apiUrl ?? 'http://10.0.2.2:4000',
  mapStyleUrl: extra.mapStyleUrl ?? 'https://tiles.openfreemap.org/styles/liberty',
  sentryDsn: extra.sentryDsn ?? '',
  versionApp: Constants.expoConfig?.version ?? '0.0.0',
} as const;

/** true solo si la app debe hablar con la API real (EXPO_PUBLIC_KALO_DATOS=api). */
export const USA_API = CONFIG.datos === 'api';
