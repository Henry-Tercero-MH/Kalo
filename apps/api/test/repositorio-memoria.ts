/**
 * Implementación en memoria de RepositorioSync para pruebas del motor.
 */
import { REGISTRO_TABLAS, type FilaCruda, type NombreTabla } from '@kalo/shared';
import type {
  DispositivoSync,
  EntradaBitacora,
  RepositorioSync,
  TxSync,
  UsuarioSync,
} from '../src/sync/motor';

export class RepositorioMemoria implements RepositorioSync {
  tablas = new Map<NombreTabla, Map<string, FilaCruda>>();
  bitacora: EntradaBitacora[] = [];
  usuarios = new Map<string, UsuarioSync>();
  dispositivos = new Map<string, Record<string, unknown>>();
  private reloj = 1_000;

  /** Avanza el reloj del servidor (simula paso del tiempo). */
  avanzar(ms = 1000) {
    this.reloj += ms;
  }

  tabla(nombre: NombreTabla) {
    let t = this.tablas.get(nombre);
    if (!t) {
      t = new Map();
      this.tablas.set(nombre, t);
    }
    return t;
  }

  private tx(): TxSync {
    return {
      ahora: () => ++this.reloj,
      leerCambios: async (tabla, d: DispositivoSync, desde, historialDesde) => {
        const subida = REGISTRO_TABLAS[tabla].meta.direccion === 'ambas';
        return [...this.tabla(tabla).values()].filter(
          (f) =>
            (desde === null || Number(f.server_updated_at) > desde) &&
            (f.finca_id === null || f.finca_id === d.fincaId) &&
            (!subida || Number(f.created_at) >= historialDesde),
        );
      },
      obtener: async (tabla, ids) => {
        const m = new Map<string, FilaCruda>();
        for (const id of ids) {
          const f = this.tabla(tabla).get(id);
          if (f) m.set(id, { ...f });
        }
        return m;
      },
      insertar: async (tabla, fila) => {
        if (this.tabla(tabla).has(fila.id)) throw new Error('duplicado');
        this.tabla(tabla).set(fila.id, { ...fila });
      },
      actualizar: async (tabla, id, valores) => {
        const f = this.tabla(tabla).get(id)!;
        this.tabla(tabla).set(id, { ...f, ...(valores as FilaCruda) });
      },
      bitacora: async (e) => {
        this.bitacora.push(e);
      },
      usuarios: async (ids) => new Map(ids.filter((i) => this.usuarios.has(i)).map((i) => [i, this.usuarios.get(i)!])),
      puntoGuardado: async (fn) => fn(),
      actualizarDispositivo: async (id, valores) => {
        this.dispositivos.set(id, { ...this.dispositivos.get(id), ...valores });
      },
    };
  }

  lectura<T>(_finca: string, fn: (tx: TxSync) => Promise<T>) {
    return fn(this.tx());
  }

  escritura<T>(_finca: string, fn: (tx: TxSync) => Promise<T>) {
    return fn(this.tx());
  }
}
