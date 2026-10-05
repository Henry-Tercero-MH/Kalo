/**
 * Fotos y notas de voz: se guardan en el teléfono y entran a la cola de archivos.
 * Fotos comprimidas: lado mayor ≤ foto_max_px (1.600 px) y calidad foto_calidad (0,7).
 *
 * En el navegador no hay sistema de archivos (expo-file-system): se usa directamente el
 * URI que devuelve el selector (data:/blob:), comprimido si ImageManipulator lo logra, con
 * tamaño aproximado. Nada de esto debe impedir guardar el registro.
 */
import { leerParametro, type NombreTabla } from '@kalo/shared';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { consultar, crear, type ContextoEscritura } from '@/db/repositorio';
import { esWeb } from '@/demo/entorno';
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

/** Tamaño aproximado (bytes) de un URI del navegador (data: o blob:). */
async function tamanoWeb(uri: string): Promise<number> {
  if (uri.startsWith('data:')) {
    const coma = uri.indexOf(',');
    return Math.round(((uri.length - coma - 1) * 3) / 4);
  }
  try {
    return (await (await fetch(uri)).blob()).size;
  } catch {
    return 0;
  }
}

/**
 * Convierte un blob: del navegador en data: para que el archivo siga disponible después de
 * recargar la página (los blob: mueren con la pestaña). Si falla, devuelve el original.
 */
async function aDataUriWeb(uri: string): Promise<string> {
  if (!uri.startsWith('blob:')) return uri;
  try {
    const blob = await (await fetch(uri)).blob();
    return await new Promise<string>((ok, mal) => {
      const lector = new FileReader();
      lector.onload = () => ok(String(lector.result));
      lector.onerror = () => mal(lector.error);
      lector.readAsDataURL(blob);
    });
  } catch {
    return uri;
  }
}

/** Mueve un archivo temporal a la carpeta de la app; si no se puede, deja el original. */
function moverACarpeta(uriTemporal: string, extension: string): { uri: string; tamano: number } {
  try {
    const destino = new File(carpeta(), `${nuevoId()}.${extension}`);
    new File(uriTemporal).move(destino);
    return { uri: destino.uri, tamano: destino.size ?? 0 };
  } catch (e) {
    console.warn('No se pudo mover el archivo a la carpeta de la app', e);
    let tamano = 0;
    try {
      tamano = new File(uriTemporal).size ?? 0;
    } catch {
      // tamaño desconocido
    }
    return { uri: uriTemporal, tamano };
  }
}

/** Abre la cámara, comprime y guarda la foto en el teléfono. */
export async function tomarFoto(): Promise<ArchivoLocal | null> {
  if (!esWeb) {
    // En el navegador el selector de archivos/cámara no requiere este permiso.
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) return null;
  }
  const r = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: esWeb ? 0.7 : 1,
    exif: false,
  });
  if (r.canceled || !r.assets[0]) return null;
  const original = r.assets[0];

  let foto = { uri: original.uri, ancho: original.width, alto: original.height };
  let comprimida = false;
  try {
    const params = await consultar('parametros');
    const maxPx = Number(leerParametro(params, 'foto_max_px')) || 1600;
    const calidad = Number(leerParametro(params, 'foto_calidad')) || 0.7;
    const mayor = Math.max(original.width, original.height);
    const contexto = ImageManipulator.manipulate(original.uri);
    if (mayor > maxPx) {
      contexto.resize(original.width >= original.height ? { width: maxPx } : { height: maxPx });
    }
    const imagen = await contexto.renderAsync();
    const resultado = await imagen.saveAsync({ compress: calidad, format: SaveFormat.JPEG });
    foto = { uri: resultado.uri, ancho: resultado.width, alto: resultado.height };
    comprimida = true;
  } catch (e) {
    // Sin compresión: se conserva la foto original.
    console.warn('No se pudo comprimir la foto', e);
  }

  if (esWeb) {
    const uri = await aDataUriWeb(foto.uri);
    return {
      uri,
      tipo: 'foto',
      mime: comprimida ? 'image/jpeg' : (original.mimeType ?? 'image/jpeg'),
      tamano: original.fileSize && !comprimida ? original.fileSize : await tamanoWeb(uri),
      ancho: foto.ancho,
      alto: foto.alto,
    };
  }
  const guardada = moverACarpeta(foto.uri, 'jpg');
  return {
    uri: guardada.uri,
    tipo: 'foto',
    mime: comprimida ? 'image/jpeg' : (original.mimeType ?? 'image/jpeg'),
    tamano: guardada.tamano || original.fileSize || 0,
    ancho: foto.ancho,
    alto: foto.alto,
  };
}

/** Mueve una grabación de audio a la carpeta de archivos de la app. */
export async function guardarAudio(uriTemporal: string): Promise<ArchivoLocal> {
  if (esWeb) {
    // MediaRecorder del navegador: normalmente audio/webm en un blob:.
    const uri = await aDataUriWeb(uriTemporal);
    const mime = /^data:([^;,]+)/.exec(uri)?.[1] ?? 'audio/webm';
    return { uri, tipo: 'audio', mime, tamano: await tamanoWeb(uri) };
  }
  const guardado = moverACarpeta(uriTemporal, 'm4a');
  return { uri: guardado.uri, tipo: 'audio', mime: 'audio/mp4', tamano: guardado.tamano };
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
