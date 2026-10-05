import { TABLAS_SUBIDA } from '@kalo/shared';
import { Database, Q } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { esquema } from '../src/db/esquema';
import { migraciones } from '../src/db/migraciones';
import { MODELOS } from '../src/db/modelos';
import { cargarPullEnBase, marcarTodoSincronizado } from '../src/demo/carga';
import datosReales from '../src/demo/datos-demo.json';
import { ajustarFechasDemo, type PullDemo } from '../src/demo/fechas';

// LokiJS deja un autoguardado con setInterval: se limpia al final para que jest termine.
const intervalos: ReturnType<typeof setInterval>[] = [];
const setIntervalOriginal = globalThis.setInterval;
beforeAll(() => {
  globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => {
    const id = setIntervalOriginal(...args);
    intervalos.push(id);
    return id;
  }) as typeof setInterval;
});
afterAll(() => {
  globalThis.setInterval = setIntervalOriginal;
  intervalos.forEach((id) => clearInterval(id));
});

function baseEnMemoria() {
  const adapter = new LokiJSAdapter({
    schema: esquema,
    migrations: migraciones,
    dbName: `prueba-${Math.random()}`,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  });
  return new Database({ adapter, modelClasses: MODELOS });
}

const pendientes = (db: Database) =>
  Promise.all(
    TABLAS_SUBIDA.map((t) =>
      db
        .get(t)
        .query(Q.where('_status', Q.oneOf(['created', 'updated'])))
        .fetchCount(),
    ),
  ).then((n) => n.reduce((a, b) => a + b, 0));

describe('carga del modo demo en LokiJS', () => {
  it('carga los datos DEMO como sincronizados y simula la sincronización', async () => {
    const db = baseEnMemoria();
    const datos = ajustarFechasDemo(datosReales as unknown as PullDemo);
    await cargarPullEnBase(db, datos);

    for (const [tabla, c] of Object.entries(datos.changes)) {
      expect(await db.get(tabla).query().fetchCount()).toBe(c.created.length);
    }
    expect(await pendientes(db)).toBe(0);

    // Registro nuevo sin red → pendiente; «sincronizar» en demo → sincronizado.
    const lote = datos.changes.lotes!.created[0]!;
    await db.write(() =>
      db.get('lecturas_trampa').create((r) => {
        r._setRaw('lote_id', lote.id as string);
        r._setRaw('fecha', '2026-10-05');
        r._setRaw('cantidad', 3);
      }),
    );
    expect(await pendientes(db)).toBe(1);
    await marcarTodoSincronizado(db);
    expect(await pendientes(db)).toBe(0);
  });
});
