import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuración de la app de campo. Android es la prioridad.
 * Las URL salen de variables EXPO_PUBLIC_* (ver .env.example en la raíz).
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Kalo Campo',
  slug: 'kalo-campo',
  scheme: 'kalocampo',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  backgroundColor: '#ffffff',
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    // EAS Update: configure EAS_PROJECT_ID para actualizaciones remotas.
    enabled: Boolean(process.env.EAS_PROJECT_ID),
    url: process.env.EAS_PROJECT_ID
      ? `https://u.expo.dev/${process.env.EAS_PROJECT_ID}`
      : undefined,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  },
  android: {
    package: 'com.inversioneskalo.campo',
    versionCode: 1,
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'CAMERA',
      'RECORD_AUDIO',
    ],
    blockedPermissions: ['android.permission.READ_EXTERNAL_STORAGE'],
  },
  ios: {
    bundleIdentifier: 'com.inversioneskalo.campo',
    supportsTablet: false,
    infoPlist: { UIBackgroundModes: ['location', 'fetch'] },
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-localization',
    'expo-secure-store',
    ['@morrowdigital/watermelondb-expo-plugin', {}],
    [
      'expo-build-properties',
      {
        android: {
          packagingOptions: { pickFirst: ['**/libc++_shared.so'] },
        },
      },
    ],
    '@maplibre/maplibre-react-native',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Kalo Campo usa su ubicación para saber en qué lote está y grabar el recorrido mientras una tarea está activa.',
        locationWhenInUsePermission: 'Kalo Campo usa su ubicación para saber en qué lote está.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      'expo-camera',
      { cameraPermission: 'Kalo Campo usa la cámara para fotos de campo y para leer códigos QR.' },
    ],
    [
      'expo-image-picker',
      { cameraPermission: 'Kalo Campo usa la cámara para tomar fotos de campo.' },
    ],
    ['expo-audio', { microphonePermission: 'Kalo Campo usa el micrófono para notas de voz.' }],
  ],
  experiments: { typedRoutes: true },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000',
    mapStyleUrl:
      process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
});
