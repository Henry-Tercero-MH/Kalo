/**
 * Respaldo cifrado de la base local para cuando un celular nunca logra sincronizar.
 * Se cifra con AES-256-GCM usando la clave del dispositivo (el servidor tiene una copia y
 * puede importarlo en Dispositivos → Importar respaldo).
 */
import { TABLAS_SUBIDA, type Cambios, type FilaCruda } from '@kalo/shared';
import { gcm } from '@noble/ciphers/aes';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/ciphers/utils';
import { Q } from '@nozbe/watermelondb';
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { coleccion } from '@/db/repositorio';
import { almacen } from '@/utils/almacen-seguro';

function aBase64(bytes: Uint8Array): string {
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return globalThis.btoa(binario);
}

export async function exportarRespaldo(): Promise<string> {
  const config = await almacen.configuracion();
  if (!config) throw new Error('Dispositivo no configurado');
  const changes: Cambios = {};
  for (const tabla of TABLAS_SUBIDA) {
    const filas = await coleccion(tabla).query(Q.where('_status', Q.oneOf(['created', 'updated']))).fetch();
    if (filas.length === 0) continue;
    changes[tabla] = {
      created: filas.map((f) => ({ ...(f._raw as unknown as FilaCruda) })),
      updated: [],
      deleted: [],
    };
  }
  const iv = Crypto.getRandomBytes(12);
  const cifrado = gcm(hexToBytes(config.claveRespaldo), iv).encrypt(utf8ToBytes(JSON.stringify({ changes, lastPulledAt: null })));
  const contenido = {
    formato: 'kalo-respaldo',
    version: 1,
    dispositivoId: config.dispositivoId,
    creadoEn: Date.now(),
    iv: bytesToHex(iv),
    datos: aBase64(cifrado),
  };
  const archivo = new File(Paths.cache, `respaldo-${config.dispositivoId.slice(0, 8)}-${Date.now()}.kalo.json`);
  archivo.write(JSON.stringify(contenido));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(archivo.uri, { mimeType: 'application/json', dialogTitle: 'Respaldo cifrado de Kalo Campo' });
  }
  return archivo.uri;
}
