/**
 * Sesión del modo demo: usuario + PIN contra los usuarios DEMO del almacén y perfil
 * equivalente a /v1/auth/yo (permisos tomados del rol, que se puede editar en Administración).
 */
import 'server-only';
import { modulosPara } from '@kalo/shared';
import type { PerfilUsuario } from '@/lib/servidor';
import { almacen, anotarBitacora, type Almacen } from './almacen';

/** Perfil del usuario (o null si no existe o está inactivo). */
export function perfilMock(alm: Almacen, usuarioId: string | null): PerfilUsuario | null {
  if (!usuarioId) return null;
  const u = alm.usuarios.find((x) => x.id === usuarioId);
  if (!u || !u.activo) return null;
  const rol = alm.roles.roles.find((r) => r.id === u.rol_id);
  if (!rol) return null;
  const permisos = [...rol.permisos].sort();
  const plataformas = rol.plataformas;
  const grabado = alm.perfiles[u.usuario] ?? {};
  return {
    ...grabado,
    id: u.id,
    nombre: u.nombre,
    usuario: u.usuario,
    rol: rol.codigo,
    fincaId: u.finca_id,
    empresaId: alm.catalogos.finca?.empresa_id,
    permisos,
    plataformas,
    // Los roles de campo (sin plataforma web) no ven módulos del panel (igual que la API).
    modulosWeb: plataformas.includes('web')
      ? modulosPara('web', new Set(permisos)).map((m) => m.codigo)
      : [],
  };
}

export type ResultadoLoginMock =
  { ok: true; perfil: PerfilUsuario } | { ok: false; status: number; error: string };

/** Valida usuario + PIN (solo roles con plataforma web pueden entrar al panel). */
export function iniciarSesionMock(cuerpo: unknown): ResultadoLoginMock {
  const { usuario, pin } = (cuerpo ?? {}) as { usuario?: unknown; pin?: unknown };
  if (typeof usuario !== 'string' || typeof pin !== 'string' || !/^\d{4}$/.test(pin))
    return { ok: false, status: 400, error: 'Indique usuario y PIN de 4 dígitos' };
  const alm = almacen();
  const u = alm.usuarios.find((x) => x.usuario === usuario.trim().toLowerCase());
  if (!u || alm.pines.get(u.id) !== pin)
    return { ok: false, status: 401, error: 'Usuario o PIN incorrecto' };
  const perfil = perfilMock(alm, u.id);
  if (!perfil) return { ok: false, status: 401, error: 'Usuario inactivo' };
  if (!perfil.plataformas.includes('web'))
    return { ok: false, status: 403, error: 'Su rol usa la app móvil, no el panel web.' };
  anotarBitacora(alm, { usuarioId: u.id, accion: 'login' });
  return { ok: true, perfil };
}
