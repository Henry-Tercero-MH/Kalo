import { describe, expect, it } from 'vitest';
import { MODULOS, PERMISOS_DECLARADOS, modulosPara, permisosDeRol, tienePermiso } from '../src';

describe('permisos', () => {
  it('evalúa permisos exactos y comodines', () => {
    const p = new Set(['cosecha:crear', 'labores:*']);
    expect(tienePermiso(p, 'cosecha:crear')).toBe(true);
    expect(tienePermiso(p, 'cosecha:validar')).toBe(false);
    expect(tienePermiso(p, 'labores:validar')).toBe(true);
    expect(tienePermiso(new Set(['*:*']), 'admin:usuarios')).toBe(true);
  });

  it('resuelve permisos de un rol desde las tablas sincronizadas', () => {
    const permisos = [
      { id: 'p1', codigo: 'cosecha:crear' },
      { id: 'p2', codigo: 'labores:crear' },
      { id: 'p3', codigo: 'admin:usuarios', deleted_at: 1 },
    ];
    const rolPermisos = [
      { rol_id: 'caporal', permiso_id: 'p1' },
      { rol_id: 'caporal', permiso_id: 'p2', deleted_at: 5 },
      { rol_id: 'caporal', permiso_id: 'p3' },
      { rol_id: 'otro', permiso_id: 'p2' },
    ];
    expect([...permisosDeRol('caporal', rolPermisos, permisos)]).toEqual(['cosecha:crear']);
  });

  it('un caporal solo ve los módulos de su rol', () => {
    const caporal = new Set([
      'labores:ver',
      'labores:crear',
      'enfunde:ver',
      'enfunde:crear',
      'cosecha:ver',
      'cosecha:crear',
      'fusarium:crear',
      'perfil:usar',
      'ordenes:ver',
    ]);
    const codigos = modulosPara('movil', caporal).map((m) => m.codigo);
    expect(codigos).toContain('cosecha');
    expect(codigos).toContain('labores');
    expect(codigos).toContain('fusarium');
    expect(codigos).not.toContain('plagas');
    expect(codigos).not.toContain('trampas');
    expect(codigos).not.toContain('mapa');
  });

  it('los feature flags apagan módulos', () => {
    const p = new Set(['cosecha:ver']);
    expect(modulosPara('movil', p, new Set(['cosecha'])).map((m) => m.codigo)).not.toContain(
      'cosecha',
    );
  });

  it('todos los permisos declarados tienen la forma modulo:accion y son únicos', () => {
    const codigos = PERMISOS_DECLARADOS.map((x) => x.codigo);
    for (const c of codigos) expect(c).toMatch(/^[a-z_]+:[a-z_]+$/);
    expect(new Set(codigos).size).toBe(codigos.length);
    expect(new Set(MODULOS.map((m) => m.codigo)).size).toBe(MODULOS.length);
  });
});
