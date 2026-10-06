/**
 * Sesión del usuario en el celular (funciona sin señal).
 * Los permisos se calculan desde las tablas sincronizadas (roles, rol_permisos, permisos) y
 * los feature flags; nunca están fijos en el código.
 */
import {
  hashGafete,
  leerParametro,
  modulosPara,
  permisosDeRol,
  ROLES,
  verificarPinOffline,
  type Fila,
  type ManifiestoModulo,
} from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { create } from 'zustand';
import { consultar } from '@/db/repositorio';
import { fijarEnvioManual } from '@/sync/envio-manual';
import { almacen } from '@/utils/almacen-seguro';

export interface UsuarioActivo {
  id: string;
  usuario: string;
  nombre: string;
  rolId: string;
  rolCodigo: string;
  rolNombre: string;
  trabajadorId: string | null;
  fincaId: string;
}

interface EstadoSesion {
  usuario: UsuarioActivo | null;
  permisos: Set<string>;
  flagsInactivos: Set<string>;
  ultimaActividad: number;
  iniciar: (u: Fila<'usuarios'>) => Promise<void>;
  recargarPermisos: () => Promise<void>;
  cerrar: () => void;
  tocar: () => void;
}

async function calcularPermisos(rolId: string) {
  const [rolPermisos, permisos, flags] = await Promise.all([
    consultar('rol_permisos'),
    consultar('permisos'),
    consultar('feature_flags'),
  ]);
  const inactivos = new Set(
    flags.filter((f) => !f.activo && (!f.rol_id || f.rol_id === rolId)).map((f) => f.codigo),
  );
  return { permisos: permisosDeRol(rolId, rolPermisos, permisos), inactivos };
}

export const useSesion = create<EstadoSesion>((set, get) => ({
  usuario: null,
  permisos: new Set(),
  flagsInactivos: new Set(),
  ultimaActividad: Date.now(),
  async iniciar(u) {
    const [rol] = await consultar('roles', Q.where('id', u.rol_id));
    const { permisos, inactivos } = await calcularPermisos(u.rol_id);
    // El caporal envía lo tomado sin señal con «Enviar datos» (ver sync/envio-manual.ts).
    fijarEnvioManual(rol?.codigo === ROLES.caporal);
    set({
      usuario: {
        id: u.id,
        usuario: u.usuario,
        nombre: u.nombre,
        rolId: u.rol_id,
        rolCodigo: rol?.codigo ?? '',
        rolNombre: rol?.nombre ?? '',
        trabajadorId: u.trabajador_id,
        fincaId: u.finca_id ?? '',
      },
      permisos,
      flagsInactivos: inactivos,
      ultimaActividad: Date.now(),
    });
  },
  async recargarPermisos() {
    const u = get().usuario;
    if (!u) return;
    const { permisos, inactivos } = await calcularPermisos(u.rolId);
    set({ permisos, flagsInactivos: inactivos });
  },
  cerrar: () => {
    fijarEnvioManual(false);
    set({ usuario: null, permisos: new Set(), flagsInactivos: new Set() });
  },
  tocar: () => set({ ultimaActividad: Date.now() }),
}));

export function useModulosMovil(): ManifiestoModulo[] {
  const { permisos, flagsInactivos } = useSesion();
  return modulosPara('movil', permisos, flagsInactivos);
}

export type ResultadoLogin =
  { ok: true } | { ok: false; motivo: 'incorrecto' | 'bloqueado'; minutos?: number };

async function registrarFallo(): Promise<ResultadoLogin> {
  const params = await consultar('parametros');
  const max = Number(leerParametro(params, 'login_intentos_max')) || 5;
  const intentos = await almacen.intentos();
  const fallidos = intentos.fallidos + 1;
  if (fallidos >= max) {
    await almacen.guardarIntentos({ fallidos: 0, bloqueadoHasta: Date.now() + 5 * 60_000 });
    return { ok: false, motivo: 'bloqueado', minutos: 5 };
  }
  await almacen.guardarIntentos({ fallidos, bloqueadoHasta: 0 });
  return { ok: false, motivo: 'incorrecto' };
}

async function verificarBloqueo(): Promise<ResultadoLogin | null> {
  const { bloqueadoHasta } = await almacen.intentos();
  if (bloqueadoHasta > Date.now()) {
    return {
      ok: false,
      motivo: 'bloqueado',
      minutos: Math.ceil((bloqueadoHasta - Date.now()) / 60_000),
    };
  }
  return null;
}

/** Inicio de sesión sin señal: compara el PIN con el hash PBKDF2 descargado. */
export async function iniciarConPin(usuario: string, pin: string): Promise<ResultadoLogin> {
  const bloqueo = await verificarBloqueo();
  if (bloqueo) return bloqueo;
  const [u] = await consultar(
    'usuarios',
    Q.where('usuario', usuario.trim().toLowerCase()),
    Q.where('activo', true),
  );
  // Se ejecuta el hash aunque no exista el usuario (tiempo constante).
  const ok = verificarPinOffline(pin, u?.pin_offline_sal ?? '00', u?.pin_offline_hash ?? '');
  if (!u || !ok) return registrarFallo();
  await almacen.guardarIntentos({ fallidos: 0, bloqueadoHasta: 0 });
  await useSesion.getState().iniciar(u);
  return { ok: true };
}

export async function iniciarConGafete(codigo: string): Promise<ResultadoLogin> {
  const bloqueo = await verificarBloqueo();
  if (bloqueo) return bloqueo;
  const [u] = await consultar(
    'usuarios',
    Q.where('gafete_hash', hashGafete(codigo)),
    Q.where('activo', true),
  );
  if (!u) return registrarFallo();
  await useSesion.getState().iniciar(u);
  return { ok: true };
}
