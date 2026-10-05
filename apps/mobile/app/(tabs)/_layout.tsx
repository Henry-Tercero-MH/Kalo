/**
 * Pestañas principales. Controla la sesión: sin usuario vuelve al login y tras un tiempo
 * sin uso pide el PIN otra vez. Arranca los disparadores de sincronización.
 */
import { leerParametro } from '@kalo/shared';
import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import { Icono } from '@/componentes/Icono';
import { semantico, tipografia } from '@/componentes/tema';
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
      if (Date.now() - useSesion.getState().ultimaActividad > minutos * 60_000) useSesion.getState().cerrar();
      else useSesion.getState().tocar();
    });
    return () => sub.remove();
  }, []);

  if (!usuario) return <Redirect href="/(auth)/login" />;

  const icono = (nombre: string) =>
    function IconoTab({ color }: { color: unknown }) {
      return <Icono nombre={nombre} color={String(color)} tamano={26} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: semantico.titulo,
        tabBarInactiveTintColor: semantico.textoSecundario,
        tabBarStyle: { height: 72, paddingTop: 6, borderTopWidth: 2, borderTopColor: semantico.bordeFuerte },
        tabBarLabelStyle: { fontFamily: tipografia.familias.cuerpoMedio, fontSize: 12, textTransform: 'uppercase' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.inicio'), tabBarIcon: icono('house') }} />
      <Tabs.Screen name="registrar" options={{ title: t('tabs.registrar'), tabBarIcon: icono('square-plus') }} />
      <Tabs.Screen name="mapa" options={{ title: t('tabs.mapa'), tabBarIcon: icono('map') }} />
      <Tabs.Screen name="sincronizar" options={{ title: t('tabs.sincronizar'), tabBarIcon: icono('refresh-cw') }} />
      <Tabs.Screen name="perfil" options={{ title: t('tabs.perfil'), tabBarIcon: icono('user-round') }} />
    </Tabs>
  );
}
