import { marcarDuplicados, REGLAS_DUPLICADOS, type Crudo } from '../src/sync/duplicados-reglas';

const labor = (id: string, extra: Partial<Crudo> = {}): Crudo => ({
  id,
  _status: 'created',
  created_at: 1,
  trabajador_id: 't1',
  cuadrilla_id: 'c1',
  tipo_labor_id: 'deshoje',
  lote_id: 'L1',
  fecha: '2026-10-06',
  cantidad: 40,
  ...extra,
});
const reglas = REGLAS_DUPLICADOS.labores!;

describe('marcarDuplicados', () => {
  it('no envía la segunda labor igual guardada sin señal', () => {
    const d = marcarDuplicados(
      'labores',
      [labor('a', { created_at: 1 }), labor('b', { created_at: 2 })],
      reglas,
    );
    expect(d.map((x) => [x.id, x.originalId])).toEqual([['b', 'a']]);
  });

  it('si ya se envió una igual, el nuevo es el repetido', () => {
    const d = marcarDuplicados(
      'labores',
      [labor('nuevo', { created_at: 5 }), labor('enviado', { _status: 'synced', created_at: 9 })],
      reglas,
    );
    expect(d.map((x) => x.id)).toEqual(['nuevo']);
  });

  it('cantidades o trabajadores distintos no son repetidos', () => {
    const d = marcarDuplicados(
      'labores',
      [labor('a'), labor('b', { cantidad: 41 }), labor('c', { trabajador_id: 't2' })],
      reglas,
    );
    expect(d).toEqual([]);
  });

  it('nunca descarta registros ya enviados o editados', () => {
    const d = marcarDuplicados(
      'labores',
      [labor('a', { _status: 'synced' }), labor('b', { _status: 'updated', created_at: 3 })],
      reglas,
    );
    expect(d).toEqual([]);
  });

  it('asistencia: un trabajador por día', () => {
    const fila = (id: string, created_at: number): Crudo => ({
      id,
      _status: 'created',
      created_at,
      trabajador_id: 't1',
      fecha: '2026-10-06',
      presente: true,
    });
    const d = marcarDuplicados(
      'asistencia',
      [fila('x', 2), fila('y', 1)],
      REGLAS_DUPLICADOS.asistencia!,
    );
    expect(d.map((x) => x.id)).toEqual(['x']);
  });
});
