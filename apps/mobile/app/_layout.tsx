/**
 * Raíz de la app: fuentes de la marca, i18n, base local y tareas en segundo plano.
 */
import '@/i18n';
import '@/gps/rastreo';
import '@/sync/disparadores';
// Solo los pesos que usa la guía de marca (Archivo 400/600/800 y Anton para portadas).
import { Anton_400Regular } from '@expo-google-fonts/anton/400Regular';
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { useFonts } from 'expo-font';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import * as Sentry from '@sentry/react-native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CONFIG } from '@/config';
import { database } from '@/db/database';
import { useSesion } from '@/permisos/sesion';
import { alBorrarDispositivo } from '@/sync/motor';

if (CONFIG.sentryDsn) Sentry.init({ dsn: CONFIG.sentryDsn, tracesSampleRate: 0.1 });

void SplashScreen.preventAutoHideAsync();

function RaizLayout() {
  const router = useRouter();
  const [fuentesListas] = useFonts({ Archivo_400Regular, Archivo_600SemiBold, Archivo_800ExtraBold, Anton_400Regular });

  useEffect(() => {
    if (fuentesListas) void SplashScreen.hideAsync();
  }, [fuentesListas]);

  // Borrado remoto ordenado desde el panel: se cierra la sesión y se vuelve a configurar.
  useEffect(() => {
    const quitar = alBorrarDispositivo(() => {
      useSesion.getState().cerrar();
      router.replace('/(auth)/configurar');
    });
    return () => {
      quitar();
    };
  }, [router]);

  if (!fuentesListas) return null;
  return (
    <SafeAreaProvider>
      <DatabaseProvider database={database}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#ffffff' } }} />
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

export default CONFIG.sentryDsn ? Sentry.wrap(RaizLayout) : RaizLayout;
