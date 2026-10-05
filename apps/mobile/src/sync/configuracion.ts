/**
 * Configuración inicial del dispositivo (una sola vez, con señal):
 * login del supervisor → registro del celular → primera descarga → mapa sin conexión.
 */
import { bytesToHex } from '@noble/ciphers/utils';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { CONFIG } from '@/config';
import { database } from '@/db/database';
import { fijarModoDemo } from '@/demo/modo';
import { descargarMapaFinca } from '@/gps/mapas-offline';
import { almacen } from '@/utils/almacen-seguro';
import { nuevoId } from '@/utils/ids';
import { apiPublica } from './api';
import { sincronizar } from './motor';
import { useEstadoSync } from './estado';

interface RespuestaLogin {
  accessToken: string;
}

interface RespuestaRegistro {
  accessToken: string;
  refreshToken: string;
  expiraEn: number;
  finca: { id: string; nombre: string; bbox: [number, number, number, number] } | null;
}

export async function configurarDispositivo(
  datos: { apiUrl: string; usuario: string; pin: string; nombre: string },
  progresoMapa?: (porcentaje: number) => void,
): Promise<void> {
  const apiUrl = datos.apiUrl.trim().replace(/\/+$/, '');
  const login = await apiPublica<RespuestaLogin>(apiUrl, '/v1/auth/login', {
    usuario: datos.usuario.trim().toLowerCase(),
    pin: datos.pin,
  });
  // Si venía del modo demo, se descartan los datos DEMO y su identidad de dispositivo.
  const veniaDeDemo = await almacen.modoDemo();
  const existente = veniaDeDemo ? null : await almacen.configuracion();
  const dispositivoId = existente?.dispositivoId ?? nuevoId();
  const claveRespaldo = existente?.claveRespaldo ?? bytesToHex(Crypto.getRandomBytes(32));
  const registro = await apiPublica<RespuestaRegistro>(
    apiUrl,
    '/v1/dispositivos/registrar',
    {
      id: dispositivoId,
      nombre: datos.nombre.trim() || Device.deviceName || 'Celular de campo',
      modelo: [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || undefined,
      sistema: `${Platform.OS} ${Device.osVersion ?? ''}`.trim(),
      versionApp: CONFIG.versionApp,
      claveRespaldo,
    },
    login.accessToken,
  );
  if (!registro.finca) throw new Error('El usuario no tiene finca asignada');
  if (veniaDeDemo) {
    await database.write(() => database.unsafeResetDatabase());
    await almacen.borrarTodo();
  }
  fijarModoDemo(false);
  await almacen.guardarTokens({
    accessToken: registro.accessToken,
    refreshToken: registro.refreshToken,
    expiraEn: registro.expiraEn,
  });
  await almacen.guardarConfiguracion({
    apiUrl,
    dispositivoId,
    fincaId: registro.finca.id,
    fincaNombre: registro.finca.nombre,
    bbox: registro.finca.bbox,
    claveRespaldo,
    configuradoEn: Date.now(),
  });
  // Primera descarga: usuarios, permisos, lotes, catálogos y formularios.
  await sincronizar('inicio');
  const { ultimoError } = useEstadoSync.getState();
  if (ultimoError) throw new Error(ultimoError);
  // El mapa base es opcional: si falla, la app sigue funcionando con los polígonos locales.
  try {
    await descargarMapaFinca(registro.finca.bbox, progresoMapa);
  } catch (e) {
    console.warn('No se pudo descargar el mapa sin conexión', e);
  }
}
