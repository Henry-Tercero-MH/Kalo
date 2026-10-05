/**
 * Disparadores de sincronización: al abrir la app, al recuperar red, cada N minutos con red,
 * en segundo plano (expo-background-task) y con el botón «Sincronizar ahora».
 */
import { leerParametro } from '@kalo/shared';
import NetInfo from '@react-native-community/netinfo';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import { consultar } from '@/db/repositorio';
import { useEstadoSync } from './estado';
import { refrescarContadores, sincronizar } from './motor';

export const TAREA_SYNC_FONDO = 'kalo-sync-fondo';

TaskManager.defineTask(TAREA_SYNC_FONDO, async () => {
  try {
    await sincronizar('fondo');
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function iniciarDisparadores(): Promise<() => void> {
  let conectadoAntes = false;
  const quitarRed = NetInfo.addEventListener((s) => {
    const conectado = Boolean(s.isConnected);
    useEstadoSync.getState().fijar({ conectado, wifi: s.type === 'wifi' });
    if (conectado && !conectadoAntes) void sincronizar('red');
    conectadoAntes = conectado;
  });
  const quitarApp = AppState.addEventListener('change', (e) => {
    if (e === 'active') void sincronizar('inicio');
  });

  const params = await consultar('parametros');
  const minutos = Number(leerParametro(params, 'sync_intervalo_min')) || 15;
  const intervalo = setInterval(() => void sincronizar('intervalo'), minutos * 60_000);

  try {
    await BackgroundTask.registerTaskAsync(TAREA_SYNC_FONDO, { minimumInterval: minutos });
  } catch (e) {
    console.warn('No se pudo registrar la sincronización en segundo plano', e);
  }

  await refrescarContadores();
  void sincronizar('inicio');

  return () => {
    quitarRed();
    quitarApp.remove();
    clearInterval(intervalo);
  };
}
