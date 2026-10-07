/**
 * Almacén en memoria del modo demo (sin API).
 *
 * Se inicializa desde los fixtures DEMO grabados en `src/mock/datos/*.json` (ver
 * `scripts/grabar-mock.mjs`) y vive en el proceso del servidor de Next como singleton en
 * `globalThis` (sobrevive a las recargas en desarrollo). Las mutaciones del panel lo modifican;
 * al reiniciar el servidor todo vuelve al estado de los fixtures.
 */
import 'server-only';
import { randomUUID } from 'node:crypto';
import { claveSemana, sumarSemanas } from '@kalo/shared';
import adminJson from './datos/admin.json';
import catalogosJson from './datos/catalogos.json';
import dispositivosJson from './datos/dispositivos.json';
import grabacionJson from './datos/grabacion.json';
import mapaJson from './datos/mapa.json';
import perfilesJson from './datos/perfiles.json';
import pronosticoJson from './datos/pronostico.json';
import registrosJson from './datos/registros.json';
import trampasQrJson from './datos/trampas-qr.json';
import validacionJson from './datos/validacion.json';

export type Fila = Record<string, unknown> & { id: string };

export interface RolAdmin extends Fila {
  codigo: string;
  nombre: string;
  plataformas: string[];
  permisos: string[];
}

export interface UsuarioAdmin extends Fila {
  usuario: string;
  nombre: string;
  rol_id: string;
  finca_id: string;
  activo: boolean;
  trabajador_id: string | null;
  tiene_gafete: boolean;
}

export interface Conflicto extends Fila {
  tabla: string;
  registro_id: string;
  usuario_id: string | null;
  created_at: number;
  resuelto_por: string | null;
  resuelto_en: number | null;
  datos: { campos: { campo: string }[]; resultado: Record<string, unknown> };
}

export interface CatalogosMock {
  finca: (Fila & { empresa_id: string; nombre: string }) | null;
  lotes: Fila[];
  plagas: Fila[];
  colores: Fila[];
  semanas: Fila[];
  usuarios: Fila[];
  roles: Fila[];
  trabajadores: Fila[];
  cuadrillas: Fila[];
  tiposLabor: Fila[];
  trampas: Fila[];
  flags: Fila[];
  parametros: Fila[];
  modulos: unknown[];
}

export interface FilaEcuacionGrabada extends Fila {
  codigo: string;
  nombre: string;
  recobroObservado: number | null;
}

export interface EcuacionGrabada {
  semanaActual: { anio: number; numero: number };
  factorSemanaActual: number;
  factorPromedioAnual: number;
  retorno: number;
  recobroReferencia: number;
  lotes: FilaEcuacionGrabada[];
}

export interface PronosticoSemanal {
  semanas: unknown[];
  [clave: string]: unknown;
}

export interface Almacen {
  /** Momento de la grabación de los fixtures (ms). */
  grabadoEn: number;
  /** Semanas que se adelantaron las fechas de los fixtures para que sigan siendo recientes. */
  desfaseSemanas: number;
  catalogos: CatalogosMock;
  /** Universo de registros por tabla (sin filtros), ordenado como lo devuelve la API. */
  registros: Record<string, Fila[]>;
  mapa: Record<'lotes' | 'rutas' | 'cobertura' | 'registros', GeoJSON.FeatureCollection>;
  ecuacion: EcuacionGrabada;
  /** Pronóstico semanal grabado por clave `horizonte` o `horizonte:loteId`. */
  semanal: Record<string, PronosticoSemanal>;
  conflictos: Conflicto[];
  dispositivos: Fila[];
  usuarios: UsuarioAdmin[];
  roles: { permisos: Fila[]; roles: RolAdmin[] };
  formularios: Fila[];
  bitacora: Fila[];
  /** Perfiles (/v1/auth/yo) grabados por nombre de usuario. */
  perfiles: Record<string, Record<string, unknown>>;
  /** PIN de cada usuario (por id). Solo DEMO. */
  pines: Map<string, string>;
  pdfTrampas: { contentType: string; nombre: string; base64: string };
}

/** PIN de los usuarios DEMO del seed (README). Los roles de campo no entran al panel. */
export const PINES_DEMO: Record<string, string> = {
  admin: '1111',
  gerente: '2222',
  supervisor: '3333',
  tecnico: '4444',
  caporal: '5555',
  caporal2: '7777',
};

const SEMANA_MS = 7 * 86_400_000;
const CLAVES_HORA = new Set([
  'created_at',
  'updated_at',
  'server_updated_at',
  'hora_gps',
  'hora_entrada',
  'inicio',
  'fin',
  'validado_en',
  'ultimo_sync',
  'resuelto_en',
]);
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Adelanta en semanas completas las fechas y horas de los datos (registros, mapa, pronóstico,
 * bitácora…) para que los filtros por defecto («últimos 30 días») sigan mostrando datos aunque
 * los fixtures se hayan grabado hace tiempo. Los catálogos (calendario) no se tocan.
 */
function desplazar(valor: unknown, semanas: number): void {
  if (Array.isArray(valor)) {
    for (const v of valor) desplazar(v, semanas);
    return;
  }
  if (!valor || typeof valor !== 'object') return;
  const o = valor as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'number' && CLAVES_HORA.has(k) && v > 1e12) o[k] = v + semanas * SEMANA_MS;
    else if (
      typeof v === 'string' &&
      (k === 'fecha' || k === 'ultima_fecha' || k.startsWith('fecha_')) &&
      FECHA.test(v)
    )
      o[k] = sumarDias(v, semanas * 7);
    else if (v && typeof v === 'object') desplazar(v, semanas);
  }
  const claveNumero = typeof o.semana === 'number' ? 'semana' : 'numero';
  if (typeof o.anio === 'number' && typeof o[claveNumero] === 'number') {
    const s = sumarSemanas({ anio: o.anio, numero: o[claveNumero] as number }, semanas);
    o.anio = s.anio;
    o[claveNumero] = s.numero;
    if (typeof o.clave === 'string' && /^\d{4}-S\d{2}$/.test(o.clave)) o.clave = claveSemana(s);
  }
}

function crearAlmacen(): Almacen {
  const c = <T>(x: unknown) => structuredClone(x) as T;
  const admin = c<{
    usuarios: UsuarioAdmin[];
    roles: Almacen['roles'];
    formularios: Fila[];
    bitacora: Fila[];
  }>(adminJson);
  const pronostico = c<{ ecuacion: EcuacionGrabada; semanal: Almacen['semanal'] }>(pronosticoJson);
  const alm: Almacen = {
    grabadoEn: grabacionJson.grabadoEn,
    desfaseSemanas: Math.max(0, Math.floor((Date.now() - grabacionJson.grabadoEn) / SEMANA_MS)),
    catalogos: c<CatalogosMock>(catalogosJson),
    registros: c<Almacen['registros']>(registrosJson),
    mapa: c<Almacen['mapa']>(mapaJson),
    ecuacion: pronostico.ecuacion,
    semanal: pronostico.semanal,
    conflictos: c<{ conflictos: Conflicto[] }>(validacionJson).conflictos,
    dispositivos: c<Fila[]>(dispositivosJson),
    usuarios: admin.usuarios,
    roles: admin.roles,
    formularios: admin.formularios,
    bitacora: admin.bitacora,
    perfiles: c<Almacen['perfiles']>(perfilesJson),
    pines: new Map(),
    pdfTrampas: trampasQrJson,
  };
  for (const u of alm.usuarios) {
    const pin = PINES_DEMO[u.usuario];
    if (pin) alm.pines.set(u.id, pin);
  }
  if (alm.desfaseSemanas > 0) {
    for (const datos of [
      alm.registros,
      alm.mapa,
      alm.ecuacion,
      alm.semanal,
      alm.conflictos,
      alm.dispositivos,
      alm.bitacora,
    ])
      desplazar(datos, alm.desfaseSemanas);
  }
  return alm;
}

const raiz = globalThis as typeof globalThis & { __kaloAlmacenMock?: Almacen };

/** Almacén único del proceso (se crea en la primera petición). */
export function almacen(): Almacen {
  raiz.__kaloAlmacenMock ??= crearAlmacen();
  return raiz.__kaloAlmacenMock;
}

/** Agrega una entrada a la bitácora DEMO (más reciente primero, como la API). */
export function anotarBitacora(
  alm: Almacen,
  e: {
    usuarioId: string;
    accion: string;
    tabla?: string | null;
    registroId?: string | null;
    dispositivoId?: string | null;
    datos?: unknown;
  },
) {
  alm.bitacora.unshift({
    id: randomUUID(),
    finca_id: alm.catalogos.finca?.id ?? null,
    usuario_id: e.usuarioId,
    dispositivo_id: e.dispositivoId ?? null,
    accion: e.accion,
    tabla: e.tabla ?? null,
    registro_id: e.registroId ?? null,
    datos: e.datos ?? null,
    requiere_revision: false,
    resuelto_por: null,
    resuelto_en: null,
    created_at: Date.now(),
  });
}
