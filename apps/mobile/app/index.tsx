import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { cargarConfiguracion } from '@/permisos/contexto';
import { useSesion } from '@/permisos/sesion';

/** Decide a dónde ir: configurar el dispositivo, iniciar sesión o el inicio. */
export default function Entrada() {
  const usuario = useSesion((s) => s.usuario);
  const [estado, setEstado] = useState<'cargando' | 'sin_configurar' | 'listo'>('cargando');
  useEffect(() => {
    void cargarConfiguracion().then((c) => setEstado(c ? 'listo' : 'sin_configurar'));
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
