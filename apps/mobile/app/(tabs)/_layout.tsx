/**
 * Pestañas principales. Controla la sesión: sin usuario vuelve al login y tras un tiempo
 * sin uso pide el PIN otra vez. Arranca los disparadores de sincronización.
 */
import { leerParametro, moduloCongelado } from '@kalo/shared';
import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icono } from '@/componentes/Icono';
import { bordes, campo, espaciado, semantico, tamanoIcono, tipografia } from '@/componentes/tema';
import { consultar } from '@/db/repositorio';
import { useObservarPosicion } from '@/gps/lote-actual';
import { useSesion } from '@/permisos/sesion';
import { iniciarDisparadores } from '@/sync/disparadores';
import { useEstadoSync } from '@/sync/estado';

let disparadoresIniciados = false;

export default function TabsLayout() {
  const { t } = useTranslation();
  const usuario = useSesion((s) => s.usuario);
  const ultimoEnvio = useEstadoSync((s) => s.ultimoEnvio);
  // La barra crece con el área de gestos / botones del sistema para que nada quede tapado.
  const { bottom } = useSafeAreaInsets();
  useObservarPosicion();

  useEffect(() => {
    if (!usuario || disparadoresIniciados) return;
    disparadoresIniciados = true;
    void iniciarDisparadores();
  }, [usuario]);

  // Tras cada sincronización se recalculan permisos y feature flags (pueden cambiar en el panel).
  useEffect(() => {
    if (ultimoEnvio) void useSesion.getState().recargarPermisos();
  }, [ultimoEnvio]);

  // Caducidad de la sesión por inactividad.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (e) => {
      if (e !== 'active') return;
      const params = await consultar('parametros');
      const minutos = Number(leerParametro(params, 'sesion_inactividad_min')) || 30;
      if (Date.now() - useSesion.getState().ultimaActividad > minutos * 60_000)
        useSesion.getState().cerrar();
      else useSesion.getState().tocar();
    });
    return () => sub.remove();
  }, []);

  if (!usuario) return <Redirect href="/(auth)/login" />;

  const icono = (nombre: string) =>
    function IconoTab({ color }: { color: unknown }) {
      return <Icono nombre={nombre} color={String(color)} tamano={tamanoIcono.grande} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: semantico.titulo,
        tabBarInactiveTintColor: semantico.textoSecundario,
        tabBarStyle: {
          height: campo.alturaTactil + espaciado.lg + bottom,
          paddingTop: espaciado.sm,
          borderTopWidth: bordes.lineaTitulo,
          borderTopColor: semantico.bordeFuerte,
          backgroundColor: semantico.fondo,
        },
        tabBarLabelStyle: {
          fontFamily: tipografia.familias.cuerpoMedio,
          fontSize: tipografia.tamanos.etiqueta,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.inicio'), tabBarIcon: icono('house') }} />
      <Tabs.Screen
        name="registrar"
        options={{ title: t('tabs.registrar'), tabBarIcon: icono('square-plus') }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: t('tabs.mapa'),
          tabBarIcon: icono('map'),
          // Oculta mientras el mapa esté congelado en la etapa actual.
          href: moduloCongelado('mapa') ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="sincronizar"
        options={{ title: t('tabs.sincronizar'), tabBarIcon: icono('sincronizar') }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: t('tabs.perfil'), tabBarIcon: icono('user-round') }}
      />
    </Tabs>
  );
}
