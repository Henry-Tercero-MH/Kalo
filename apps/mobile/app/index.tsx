import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { USA_API } from '@/config';
import { configurarDemo } from '@/demo/activacion';
import { cargarConfiguracion } from '@/permisos/contexto';
import { useSesion } from '@/permisos/sesion';

/** Decide a dónde ir: configurar el dispositivo, iniciar sesión o el inicio. */
export default function Entrada() {
  const usuario = useSesion((s) => s.usuario);
  const [estado, setEstado] = useState<'cargando' | 'sin_configurar' | 'listo'>('cargando');
  useEffect(() => {
    void (async () => {
      let c = await cargarConfiguracion();
      // Modo mock: el teléfono se prepara solo con los datos DEMO, sin pedir servidor.
      if (!USA_API && (!c || c.apiUrl !== 'demo')) {
        try {
          await configurarDemo();
        } catch (e) {
          // Registros reales sin enviar: se conserva la configuración actual.
          console.warn('No se pudieron cargar los datos DEMO', e);
        }
        c = await cargarConfiguracion();
      }
      setEstado(c ? 'listo' : 'sin_configurar');
    })();
  }, []);
  if (estado === 'cargando') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (estado === 'sin_configurar') return <Redirect href="/(auth)/configurar" />;
  return <Redirect href={usuario ? '/(tabs)' : '/(auth)/login'} />;
}
