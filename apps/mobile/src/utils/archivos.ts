/**
 * Fotos y notas de voz: se guardan en el teléfono y entran a la cola de archivos.
 * Fotos comprimidas: lado mayor ≤ foto_max_px (1.600 px) y calidad foto_calidad (0,7).
 */
import { leerParametro, type NombreTabla } from '@kalo/shared';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { consultar, crear, type ContextoEscritura } from '@/db/repositorio';
import { nuevoId } from './ids';

const carpeta = () => {
  const d = new Directory(Paths.document, 'archivos');
  if (!d.exists) d.create({ intermediates: true });
  return d;
};

export interface ArchivoLocal {
  uri: string;
  tipo: 'foto' | 'audio';
  mime: string;
  tamano: number;
  ancho?: number;
  alto?: number;
}

/** Abre la cámara, comprime y guarda la foto en el teléfono. */
export async function tomarFoto(): Promise<ArchivoLocal | null> {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) return null;
  const r = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 1,
    exif: false,
  });
  if (r.canceled || !r.assets[0]) return null;
  const original = r.assets[0];
  const params = await consultar('parametros');
  const maxPx = Number(leerParametro(params, 'foto_max_px'));
  const calidad = Number(leerParametro(params, 'foto_calidad'));
  const mayor = Math.max(original.width, original.height);
  const contexto = ImageManipulator.manipulate(original.uri);
  if (mayor > maxPx) {
    contexto.resize(original.width >= original.height ? { width: maxPx } : { height: maxPx });
  }
  const imagen = await contexto.renderAsync();
  const resultado = await imagen.saveAsync({ compress: calidad, format: SaveFormat.JPEG });
  const destino = new File(carpeta(), `${nuevoId()}.jpg`);
  new File(resultado.uri).move(destino);
  return {
    uri: destino.uri,
    tipo: 'foto',
    mime: 'image/jpeg',
    tamano: destino.size ?? 0,
    ancho: resultado.width,
    alto: resultado.height,
  };
}

/** Mueve una grabación de audio a la carpeta de archivos de la app. */
export function guardarAudio(uriTemporal: string): ArchivoLocal {
  const destino = new File(carpeta(), `${nuevoId()}.m4a`);
  new File(uriTemporal).move(destino);
  return { uri: destino.uri, tipo: 'audio', mime: 'audio/mp4', tamano: destino.size ?? 0 };
}

/** Registra los archivos de un registro en la tabla `archivos` (cola de subida). */
export async function adjuntarArchivos(
  archivos: ArchivoLocal[],
  registro: { tabla: NombreTabla; id: string },
  ctx: ContextoEscritura,
) {
  for (const a of archivos) {
    await crear(
      'archivos',
      {
        tipo: a.tipo,
        mime: a.mime,
        tamano_bytes: a.tamano,
        ancho: a.ancho ?? null,
        alto: a.alto ?? null,
        registro_tabla: registro.tabla,
        registro_id: registro.id,
        estado_subida: 'pendiente',
        clave_s3: null,
        uri_local: a.uri,
      },
      ctx,
    );
  }
}
