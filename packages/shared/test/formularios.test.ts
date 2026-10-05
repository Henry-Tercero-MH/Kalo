import { describe, expect, it } from 'vitest';
import {
  camposVisibles,
  columnasDesdeRespuestas,
  esquemaDefinicionFormulario,
  limpiarRespuestas,
  validarRespuestas,
} from '../src';

const def = esquemaDefinicionFormulario.parse({
  codigo: 'muestreo_plagas',
  version: 2,
  titulo: 'Muestreo',
  campos: [
    { id: 'plantas', tipo: 'entero', etiqueta: 'Plantas revisadas', requerido: true, min: 1 },
    {
      id: 'incidencia',
      tipo: 'numero',
      etiqueta: 'Incidencia',
      requerido: true,
      min: 0,
      max: 100,
      columna: 'incidencia',
    },
    {
      id: 'hay_dano',
      tipo: 'booleano',
      etiqueta: '¿Daño en fruta?',
      requerido: true,
    },
    {
      id: 'tipo_dano',
      tipo: 'opcion',
      etiqueta: 'Tipo de daño',
      requerido: true,
      opciones: [
        { valor: 'leve', etiqueta: 'Leve' },
        { valor: 'grave', etiqueta: 'Grave' },
      ],
      visibleSi: { campo: 'hay_dano', igualA: [true] },
    },
  ],
});

describe('formularios dinámicos', () => {
  it('muestra campos condicionales', () => {
    expect(camposVisibles(def, { hay_dano: false }).map((c) => c.id)).not.toContain('tipo_dano');
    expect(camposVisibles(def, { hay_dano: true }).map((c) => c.id)).toContain('tipo_dano');
  });

  it('valida requeridos, tipos y límites solo en campos visibles', () => {
    expect(validarRespuestas(def, { plantas: 0, incidencia: 120, hay_dano: false })).toEqual({
      plantas: 'El mínimo es 1',
      incidencia: 'El máximo es 100',
    });
    expect(validarRespuestas(def, { plantas: 10, incidencia: 5, hay_dano: true })).toEqual({
      tipo_dano: 'Este dato es obligatorio',
    });
    expect(
      validarRespuestas(def, { plantas: 10, incidencia: 5, hay_dano: true, tipo_dano: 'leve' }),
    ).toEqual({});
  });

  it('limpia respuestas de campos ocultos y copia columnas', () => {
    const r = { plantas: 10, incidencia: 5, hay_dano: false, tipo_dano: 'grave' };
    expect(limpiarRespuestas(def, r)).not.toHaveProperty('tipo_dano');
    expect(columnasDesdeRespuestas(def, r)).toEqual({ incidencia: 5 });
  });

  it('rechaza definiciones inválidas', () => {
    expect(() =>
      esquemaDefinicionFormulario.parse({
        codigo: 'x',
        version: 1,
        titulo: 'X',
        campos: [{ id: 'a', tipo: 'opcion', etiqueta: 'A' }],
      }),
    ).toThrow();
  });
});
