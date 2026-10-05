/**
 * Estado de la red. En el celular usa NetInfo; en el navegador usa navigator.onLine y los
 * eventos online/offline (NetInfo en web depende de una prueba contra un servidor externo
 * que puede estar bloqueado y marcar «sin señal» aunque haya conexión).
 */
import NetInfo from '@react-native-community/netinfo';
import { esWeb } from '@/demo/entorno';

export interface EstadoRed {
  conectado: boolean;
  wifi: boolean;
}

const enLinea = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

export async function leerRed(): Promise<EstadoRed> {
  if (esWeb) return { conectado: enLinea(), wifi: false };
  try {
    const r = await NetInfo.fetch();
    return { conectado: Boolean(r.isConnected), wifi: r.type === 'wifi' };
  } catch {
    // Si NetInfo falla se asume conectado: la sincronización informará el error real.
    return { conectado: true, wifi: false };
  }
}

export function escucharRed(fn: (r: EstadoRed) => void): () => void {
  if (esWeb) {
    const avisar = () => fn({ conectado: enLinea(), wifi: false });
    globalThis.addEventListener?.('online', avisar);
    globalThis.addEventListener?.('offline', avisar);
    avisar();
    return () => {
      globalThis.removeEventListener?.('online', avisar);
      globalThis.removeEventListener?.('offline', avisar);
    };
  }
  try {
    return NetInfo.addEventListener((s) => fn({ conectado: Boolean(s.isConnected), wifi: s.type === 'wifi' }));
  } catch (e) {
    console.warn('No se pudo escuchar el estado de la red', e);
    return () => {};
  }
}
