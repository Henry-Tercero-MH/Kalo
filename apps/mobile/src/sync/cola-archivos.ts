/**
 * Cola de archivos aparte de los datos: fotos comprimidas y notas de voz suben por URL
 * prefirmada cuando el registro ya llegó al servidor. Reintenta en cada sincronización.
 */
import { Q } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';
import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';
import { coleccion } from '@/db/repositorio';
import { almacen } from '@/utils/almacen-seguro';
import { apiDispositivo } from './api';
import { useEstadoSync } from './estado';

const consultaPendientes = () =>
  coleccion('archivos').query(
    Q.where('deleted_at', null),
    Q.where('estado_subida', Q.notEq('subido')),
    Q.where('uri_local', Q.notEq(null)),
  );

export const contarArchivosPendientes = () => consultaPendientes().fetchCount();

export async function procesarColaArchivos(): Promise<void> {
  const prefs = await almacen.preferencias();
  const red = await NetInfo.fetch();
  if (!red.isConnected) return;
  if (prefs.archivosSoloWifi && red.type !== 'wifi') return;

  // Solo archivos cuyo registro ya está sincronizado (el servidor los conoce).
  const pendientes = (await consultaPendientes().fetch()).filter((a) => a._raw._status === 'synced');
  const estado = useEstadoSync.getState();
  let actual = 0;
  for (const archivo of pendientes) {
    actual++;
    estado.fijar({ progresoArchivos: { actual, total: pendientes.length } });
    const f = archivo.fila as unknown as { id: string; uri_local: string; mime: string };
    try {
      const { url, clave } = await apiDispositivo<{ url: string; clave: string }>(`/v1/archivos/${f.id}/subida`, { method: 'POST', body: {} });
      const r = await uploadAsync(url, f.uri_local, {
        httpMethod: 'PUT',
        uploadType: FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': f.mime },
      });
      if (r.status < 200 || r.status >= 300) throw new Error(`Subida rechazada (${r.status})`);
      await apiDispositivo(`/v1/archivos/${f.id}/confirmar`, { method: 'POST', body: { clave } });
      await archivo.database.write(() =>
        archivo.update((m) => {
          m._setRaw('estado_subida', 'subido');
          m._setRaw('clave_s3', clave);
          m._setRaw('updated_at', Date.now());
        }),
      );
    } catch (e) {
      // Se reintenta en la próxima sincronización; los demás archivos siguen.
      console.warn(`[archivos] ${f.id}`, e);
    }
  }
  estado.fijar({ progresoArchivos: null });
}
