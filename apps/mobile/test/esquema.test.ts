import { columnasDe, NOMBRES_TABLAS, resolverConflictoLocal } from '@kalo/shared';
import { esquema, VERSION_ESQUEMA } from '../src/db/esquema';

describe('esquema local de WatermelonDB', () => {
  it('incluye todas las tablas del registro compartido', () => {
    expect(Object.keys(esquema.tables).sort()).toEqual([...NOMBRES_TABLAS].sort());
    expect(esquema.version).toBe(VERSION_ESQUEMA);
  });

  it('cada columna del registro existe con el tipo correcto', () => {
    for (const tabla of NOMBRES_TABLAS) {
      const local = esquema.tables[tabla]!.columns;
      for (const [nombre, def] of Object.entries(columnasDe(tabla))) {
        const c = local[nombre];
        expect(c).toBeDefined();
        const tipo = def.tipo === 'numero' ? 'number' : def.tipo === 'booleano' ? 'boolean' : 'string';
        expect(c!.type).toBe(tipo);
        expect(Boolean(c!.isOptional)).toBe(Boolean(def.opcional));
      }
    }
  });
});

describe('resolución de conflictos en el celular', () => {
  it('conserva los campos editados localmente y la versión base', () => {
    const local = { id: 'x', racimos_cosechados: 110, racimos_perdidos: 1, server_updated_at: 100, _status: 'updated', _changed: 'racimos_cosechados' };
    const remoto = { id: 'x', racimos_cosechados: 120, racimos_perdidos: 4, server_updated_at: 200 };
    const r = resolverConflictoLocal(local, remoto as typeof local);
    expect(r.racimos_cosechados).toBe(110);
    expect(r.racimos_perdidos).toBe(4);
    expect(r.server_updated_at).toBe(100);
    expect(r._status).toBe('updated');
  });
});
