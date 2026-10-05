import { Redirect, Stack } from 'expo-router';
import { useSesion } from '@/permisos/sesion';

export default function ModulosLayout() {
  const usuario = useSesion((s) => s.usuario);
  if (!usuario) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
