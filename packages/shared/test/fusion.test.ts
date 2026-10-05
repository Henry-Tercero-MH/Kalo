import { describe, expect, it } from 'vitest';
import { fusionarRegistro, type FilaCruda } from '../src';

const base: FilaCruda = {
  id: 'c1',
  racimos_cosechados: 100,
  racimos_perdidos: 2,
  motivo_perdida: null,
  created_at: 1000,
  updated_at: 1000,
  server_updated_at: 1500,
  estado_validacion: 'pendiente',
};

describe('fusión de registros (último cambio gana, campo por campo)', () => {
  it('sin cambios concurrentes aplica los campos del celular', () => {
    const r = fusionarRegistro(
      base,
      { ...base, racimos_cosechados: 120, updated_at: 2000, _changed: 'racimos_cosechados' },
      1600,
    );
    expect(r.conflicto).toBe(false);
    expect(r.fila.racimos_cosechados).toBe(120);
    expect(r.cambiados).toEqual(['racimos_cosechados']);
  });

  it('con cambio concurrente en campos distintos conserva ambos', () => {
    const servidor = { ...base, racimos_perdidos: 5, updated_at: 1800, server_updated_at: 1900 };
    const r = fusionarRegistro(
      servidor,
      { ...base, racimos_cosechados: 120, updated_at: 1700, _changed: 'racimos_cosechados' },
      1600,
    );
    expect(r.fila.racimos_cosechados).toBe(100); // el servidor es más reciente…
    expect(r.fila.racimos_perdidos).toBe(5);
    expect(r.conflicto).toBe(true);
    expect(r.camposEnConflicto[0]).toMatchObject({ campo: 'racimos_cosechados', ganador: 'servidor' });
  });

  it('con cambio concurrente gana el celular si su updated_at es mayor', () => {
    const servidor = { ...base, racimos_perdidos: 5, updated_at: 1800, server_updated_at: 1900 };
    const r = fusionarRegistro(
      servidor,
      { ...base, racimos_cosechados: 130, updated_at: 2500, _changed: 'racimos_cosechados' },
      1600,
    );
    expect(r.fila.racimos_cosechados).toBe(130);
    expect(r.fila.racimos_perdidos).toBe(5); // no lo tocó el celular
    expect(r.fila.updated_at).toBe(2500);
    expect(r.conflicto).toBe(true);
  });

  it('el celular no puede cambiar columnas del servidor', () => {
    const r = fusionarRegistro(
      { ...base, estado_validacion: 'validado' },
      { ...base, estado_validacion: 'pendiente', validado_por: 'yo', updated_at: 3000 },
      1600,
    );
    expect(r.fila.estado_validacion).toBe('validado');
    expect(r.fila.validado_por).toBeUndefined();
  });
});
