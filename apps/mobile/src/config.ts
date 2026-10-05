import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  mapStyleUrl?: string;
  sentryDsn?: string;
};

/** Valores por defecto; la URL de la API se puede cambiar al configurar el dispositivo. */
export const CONFIG = {
  apiUrlPorDefecto: extra.apiUrl ?? 'http://10.0.2.2:4000',
  mapStyleUrl: extra.mapStyleUrl ?? 'https://tiles.openfreemap.org/styles/liberty',
  sentryDsn: extra.sentryDsn ?? '',
  versionApp: Constants.expoConfig?.version ?? '0.0.0',
} as const;
