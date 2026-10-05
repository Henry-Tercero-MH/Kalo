/**
 * Enrutador del modo demo: responde las mismas rutas /v1/... que usa el panel, desde el almacén
 * en memoria, con los mismos permisos y validaciones básicas que la API.
 */
import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  ecuacionProductiva,
  esquemaAccionDispositivo,
  esquemaDefinicionBase,
  esquemaDefinicionFormulario,
  esquemaEstadoFusarium,
  esquemaFeatureFlag,
  esquemaFiltrosRegistros,
  esquemaLote,
  esquemaOrdenTrabajo,
  esquemaParametroEdicion,
  esquemaPlaga,
  esquemaResolverConflicto,
  esquemaRolPermisos,
  esquemaSemanaEdicion,
  esquemaTipoLabor,
  esquemaUsuarioEdicion,
  esquemaUsuarioNuevo,
  esquemaValidarRegistro,
  MODULOS,
  REGISTRO_TABLAS,
  TABLAS_CRITICAS,
  tienePermiso,
  type FiltrosRegistros,
  type NombreTabla,
} from '@kalo/shared';
import type { PerfilUsuario } from '@/lib/servidor';
import {
  almacen,
  anotarBitacora,
  type Almacen,
  type CatalogosMock,
  type Fila,
  type UsuarioAdmin,
} from './almacen';
import { exportarRegistros } from './exportar';
import { perfilMock } from './sesion';

export interface RespuestaMock {
  status: number;
  json?: unknown;
  bytes?: Uint8Array;
  headers?: Record<string, string>;
}

class ErrorMock extends Error {
  constructor(
    public status: number,
    message: string,
    public codigo: string,
  ) {
    super(message);
  }
}
const prohibido = () => new ErrorMock(403, 'No tiene permiso para esta acción', 'PROHIBIDO');
const noEncontrado = (m = 'No encontrado') => new ErrorMock(404, m, 'NO_ENCONTRADO');
const invalida = (m: string) => new ErrorMock(400, m, 'SOLICITUD_INVALIDA');

interface EsquemaValidable {
  safeParse(x: unknown):
    | { success: true; data: unknown }
    | {
        success: false;
        error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] };
      };
}

/** Valida el cuerpo con el esquema compartido (igual que la API). */
function validar<T>(esquema: EsquemaValidable, datos: unknown): T {
  const r = esquema.safeParse(datos ?? {});
  if (!r.success)
    throw invalida(
      r.error.issues.map((i) => `${i.path.map(String).join('.')}: ${i.message}`).join('; '),
    );
  return r.data as T;
}

interface Contexto {
  p: string[];
  q: URLSearchParams;
  cuerpo: unknown;
  u: PerfilUsuario;
  permisos: ReadonlySet<string>;
  alm: Almacen;
}
type Manejador = (c: Contexto) => unknown | Promise<unknown>;
/** [método, patrón, permiso requerido (null = solo sesión), manejador] */
type Ruta = [string, RegExp, string | null, Manejador];

// ─── Registros ──────────────────────────────────────────────────────────────

/** Tablas consultables y el permiso de lectura de cada una (igual que la API). */
const TABLAS_REGISTROS: Partial<Record<NombreTabla, string>> = Object.fromEntries(
  MODULOS.flatMap((m) =>
    m.tablas
      .filter((t) => REGISTRO_TABLAS[t].meta.direccion === 'ambas')
      .map((t) => [t, m.permisos.find((p) => p.codigo.endsWith(':ver'))?.codigo ?? m.permisoVer]),
  ).filter(([t]) => !['puntos_ruta', 'archivos', 'consentimientos'].includes(t as string)),
);

const PERMISO_VALIDAR: Partial<Record<NombreTabla, string>> = {
  cosecha: 'cosecha:validar',
  labores: 'labores:validar',
  alertas_fusarium: 'fusarium:gestionar',
};

function verificarAcceso(permisos: ReadonlySet<string>, tabla: string): NombreTabla {
  if (!(tabla in TABLAS_REGISTROS)) throw noEncontrado('Módulo sin tabla de registros');
  const permiso = TABLAS_REGISTROS[tabla as NombreTabla];
  if (!tienePermiso(permisos, 'registros:ver') || (permiso && !tienePermiso(permisos, permiso)))
    throw prohibido();
  return tabla as NombreTabla;
}

const tablaDe = (alm: Almacen, tabla: string) => (alm.registros[tabla] ??= []);

function consultar(alm: Almacen, tabla: string, f: FiltrosRegistros): Fila[] {
  const filas = tablaDe(alm, tabla).filter((x) => !x.deleted_at);
  const conFecha = filas.some((x) => 'fecha' in x);
  const n = (v: unknown) => Number(v ?? 0);
  return filas
    .filter((x) => {
      if (conFecha) {
        const fecha = String(x.fecha ?? '');
        if (f.desde && fecha < f.desde) return false;
        if (f.hasta && fecha > f.hasta) return false;
      } else {
        if (f.desde && n(x.created_at) < new Date(f.desde).getTime()) return false;
        if (f.hasta && n(x.created_at) > new Date(f.hasta).getTime() + 86_399_999) return false;
      }
      if (f.lote_id && 'lote_id' in x && x.lote_id !== f.lote_id) return false;
      if (f.usuario_id && x.created_by !== f.usuario_id) return false;
      if (f.estado_validacion && 'estado_validacion' in x)
        return x.estado_validacion === f.estado_validacion;
      return true;
    })
    .sort((a, b) => {
      const pa = conFecha ? String(a.fecha ?? '') : n(a.created_at);
      const pb = conFecha ? String(b.fecha ?? '') : n(b.created_at);
      if (pa !== pb) return pa < pb ? 1 : -1;
      return n(b.created_at) - n(a.created_at);
    })
    .slice(0, f.limite);
}

function filtros(q: URLSearchParams): FiltrosRegistros {
  const crudo = Object.fromEntries(
    [...q.entries()].filter(([k, v]) => v !== '' && k !== 'formato'),
  );
  return validar<FiltrosRegistros>(esquemaFiltrosRegistros, crudo);
}

function buscar(alm: Almacen, tabla: string, id: string): Fila {
  const fila = tablaDe(alm, tabla).find((x) => x.id === id);
  if (!fila) throw noEncontrado('Registro no encontrado');
  return fila;
}

// ─── Catálogos de administración ────────────────────────────────────────────

const CATALOGOS_ADMIN: Record<
  string,
  | {
      clave: keyof CatalogosMock;
      tabla: string;
      esquema: EsquemaValidable & { partial: () => EsquemaValidable };
    }
  | { clave: keyof CatalogosMock; tabla: string; esquema: null }
> = {
  lotes: { clave: 'lotes', tabla: 'lotes', esquema: esquemaLote },
  plagas: { clave: 'plagas', tabla: 'plagas', esquema: esquemaPlaga },
  'tipos-labor': { clave: 'tiposLabor', tabla: 'tipos_labor', esquema: esquemaTipoLabor },
  'colores-cinta': { clave: 'colores', tabla: 'colores_cinta', esquema: null },
};

/** Validación del color de cinta (la API usa un esquema local equivalente). */
function validarColor(cuerpo: unknown, parcial: boolean): Record<string, unknown> {
  const c = (cuerpo ?? {}) as Record<string, unknown>;
  const reglas: Record<string, (v: unknown) => boolean> = {
    nombre: (v) => typeof v === 'string' && v.trim().length > 0,
    hex: (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v),
    orden: (v) => Number.isInteger(v),
    pendiente_confirmar: (v) => typeof v === 'boolean',
  };
  const salida: Record<string, unknown> = {};
  for (const [k, ok] of Object.entries(reglas)) {
    if (!(k in c)) {
      if (!parcial) throw invalida(`${k}: requerido`);
      continue;
    }
    if (!ok(c[k])) throw invalida(`${k}: valor inválido`);
    salida[k] = c[k];
  }
  return salida;
}

function validarCatalogo(ruta: string, cuerpo: unknown, parcial: boolean) {
  const { esquema } = CATALOGOS_ADMIN[ruta]!;
  if (!esquema) return validarColor(cuerpo, parcial);
  return validar<Record<string, unknown>>(parcial ? esquema.partial() : esquema, cuerpo);
}

/** Refleja en el mapa los cambios de hectáreas/población de un lote. */
function sincronizarLoteMapa(alm: Almacen, id: string, cambios: Record<string, unknown>) {
  const f = alm.mapa.lotes.features.find((x) => x.properties?.id === id);
  if (!f?.properties) return;
  for (const k of ['codigo', 'nombre', 'hectareas', 'poblacion'])
    if (k in cambios) f.properties[k] = cambios[k];
}

// ─── Archivos ───────────────────────────────────────────────────────────────

const FOTO_DEMO = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">' +
    '<rect width="320" height="240" fill="#E9E7E3"/>' +
    '<rect x="8" y="8" width="304" height="224" fill="none" stroke="#111111" stroke-width="4"/>' +
    '<text x="160" y="132" text-anchor="middle" font-family="Archivo, Arial, sans-serif" ' +
    'font-size="34" font-weight="800" fill="#111111">FOTO DEMO</text></svg>',
)}`;
/** Tablas con evidencia fotográfica de ejemplo en modo demo. */
const TABLAS_CON_FOTO = new Set(['alertas_fusarium', 'cosecha', 'muestreos']);

// ─── Rutas ──────────────────────────────────────────────────────────────────

const ahora = () => Date.now();

const RUTAS: Ruta[] = [
  ['GET', /^\/auth\/yo$/, null, ({ u }) => u],
  ['GET', /^\/catalogos$/, null, ({ alm }) => alm.catalogos],

  // Registros
  [
    'GET',
    /^\/registros$/,
    null,
    ({ permisos }) =>
      Object.entries(TABLAS_REGISTROS)
        .filter(([, p]) => !p || tienePermiso(permisos, p))
        .map(([tabla]) => ({
          tabla,
          etiqueta: REGISTRO_TABLAS[tabla as NombreTabla].meta.etiqueta,
        })),
  ],
  [
    'GET',
    /^\/registros\/([^/]+)$/,
    null,
    ({ alm, p, q, permisos }) => consultar(alm, verificarAcceso(permisos, p[0]!), filtros(q)),
  ],
  [
    'GET',
    /^\/registros\/([^/]+)\/exportar$/,
    'registros:exportar',
    async ({ alm, p, q, permisos }): Promise<RespuestaMock> => {
      const tabla = verificarAcceso(permisos, p[0]!);
      const formato = q.get('formato') === 'csv' ? 'csv' : 'xlsx';
      const filas = consultar(alm, tabla, { ...filtros(q), limite: 5000 });
      return exportarRegistros(tabla, filas, alm.catalogos, formato);
    },
  ],
  [
    'GET',
    /^\/archivos$/,
    'registros:ver',
    ({ alm, q }) => {
      const tabla = q.get('registro_tabla') ?? '';
      const id = q.get('registro_id') ?? '';
      if (!TABLAS_CON_FOTO.has(tabla) || !tablaDe(alm, tabla).some((x) => x.id === id)) return [];
      return [
        {
          id: `${id}-foto-demo`,
          tipo: 'foto',
          mime: 'image/svg+xml',
          estado_subida: 'subido',
          created_at: ahora(),
          url: FOTO_DEMO,
        },
      ];
    },
  ],
  [
    'GET',
    /^\/trampas\/qr\.pdf$/,
    'trampas:ver',
    ({ alm }): RespuestaMock => ({
      status: 200,
      bytes: new Uint8Array(Buffer.from(alm.pdfTrampas.base64, 'base64')),
      headers: {
        'content-type': alm.pdfTrampas.contentType,
        'content-disposition': `inline; filename="${alm.pdfTrampas.nombre}"`,
      },
    }),
  ],

  // Mapa
  [
    'GET',
    /^\/mapa\/(lotes|rutas|cobertura|registros)$/,
    'mapa:ver',
    ({ alm, p }) => alm.mapa[p[0] as keyof Almacen['mapa']],
  ],

  // Pronóstico
  [
    'GET',
    /^\/pronostico\/ecuacion$/,
    'pronostico:ver',
    ({ alm, q }) => {
      const num = (k: string, max?: number) => {
        const v = q.get(k);
        if (v === null || v === '') return undefined;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || (max !== undefined && n > max))
          throw invalida(`${k}: valor inválido`);
        return n;
      };
      const e = alm.ecuacion;
      const retorno = num('retorno') ?? e.retorno;
      const recobroFijo = num('recobro', 1);
      const factor = num('factor') ?? e.factorPromedioAnual;
      const observados = new Map(e.lotes.map((l) => [l.id, l.recobroObservado]));
      const lotes = alm.catalogos.lotes
        .filter((l) => !l.deleted_at)
        .slice()
        .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)))
        .map((l) => {
          const observado = observados.get(l.id) ?? null;
          const recobro = recobroFijo ?? observado ?? e.recobroReferencia;
          const r = ecuacionProductiva({
            poblacion: Number(l.poblacion),
            retorno,
            recobro,
            factor,
          });
          return {
            id: l.id,
            codigo: l.codigo,
            nombre: l.nombre,
            hectareas: l.hectareas,
            ...r,
            recobroObservado: observado,
            cajasLoteAnio: Math.round(r.cajasHaAnio * Number(l.hectareas)),
          };
        });
      return { ...e, retorno, lotes };
    },
  ],
  [
    'GET',
    /^\/pronostico\/semanal$/,
    'pronostico:ver',
    ({ alm, q }) => {
      const h = Number(q.get('horizonte') ?? 8);
      if (!Number.isInteger(h) || h < 1 || h > 26) throw invalida('horizonte: valor inválido');
      const lote = q.get('lote_id');
      const sufijo = lote ? `:${lote}` : '';
      const exacto = alm.semanal[`${h}${sufijo}`];
      if (exacto) return exacto;
      // Otros horizontes: se recorta el más largo grabado.
      const largo = alm.semanal[`16${sufijo}`];
      if (!largo) throw noEncontrado('Pronóstico no disponible en modo demo');
      return { ...largo, semanas: largo.semanas.slice(0, h) };
    },
  ],
  [
    'POST',
    /^\/pronostico\/guardar$/,
    'pronostico:ver',
    ({ alm, u }) => {
      anotarBitacora(alm, { usuarioId: u.id, accion: 'crear', tabla: 'pronosticos' });
      return { ok: true, generadoEn: ahora() };
    },
  ],

  // Validación
  [
    'GET',
    /^\/validacion\/pendientes$/,
    'validacion:ver',
    ({ alm, permisos }) => {
      const salida: Record<string, Fila[]> = {};
      for (const tabla of TABLAS_CRITICAS) {
        const permiso = PERMISO_VALIDAR[tabla];
        if (permiso && !tienePermiso(permisos, permiso)) continue;
        salida[tabla] = tablaDe(alm, tabla)
          .filter((x) => x.estado_validacion === 'pendiente' && !x.deleted_at)
          .sort((a, b) => Number(a.created_at) - Number(b.created_at))
          .slice(0, 500);
      }
      return salida;
    },
  ],
  [
    'GET',
    /^\/validacion\/conflictos$/,
    'validacion:ver',
    ({ alm, q }) => {
      const todos = ['true', '1'].includes(q.get('incluir_resueltos') ?? '');
      return alm.conflictos
        .filter((c) => todos || !c.resuelto_en)
        .sort((a, b) => b.created_at - a.created_at);
    },
  ],
  [
    'POST',
    /^\/validacion\/conflictos\/([^/]+)\/resolver$/,
    'conflictos:resolver',
    ({ alm, p, cuerpo, u }) => {
      const c = alm.conflictos.find((x) => x.id === p[0]);
      if (!c) throw noEncontrado('Conflicto no encontrado');
      if (c.resuelto_en) throw invalida('El conflicto ya fue resuelto');
      const datos = validar<{ valores: Record<string, unknown>; nota?: string }>(
        esquemaResolverConflicto,
        cuerpo,
      );
      const def = REGISTRO_TABLAS[c.tabla as NombreTabla];
      if (!def) throw invalida('Tabla desconocida');
      const permitidas = Object.keys(def.columnas);
      const valores = Object.fromEntries(
        Object.entries(datos.valores).filter(([k]) => permitidas.includes(k)),
      );
      const t = ahora();
      const fila = tablaDe(alm, c.tabla).find((x) => x.id === c.registro_id);
      if (fila) Object.assign(fila, valores, { updated_at: t, server_updated_at: t });
      c.resuelto_por = u.id;
      c.resuelto_en = t;
      const enBitacora = alm.bitacora.find((x) => x.id === c.id);
      if (enBitacora) Object.assign(enBitacora, { resuelto_por: u.id, resuelto_en: t });
      anotarBitacora(alm, {
        usuarioId: u.id,
        accion: 'resolver_conflicto',
        tabla: c.tabla,
        registroId: c.registro_id,
        datos: { conflicto: c.id, valores, nota: datos.nota },
      });
      return { ok: true };
    },
  ],
  [
    'POST',
    /^\/validacion\/([^/]+)\/([^/]+)$/,
    null,
    ({ alm, p, cuerpo, u, permisos }) => {
      const tabla = p[0] as NombreTabla;
      const permiso = PERMISO_VALIDAR[tabla];
      if (!permiso) throw noEncontrado('La tabla no requiere validación');
      if (!tienePermiso(permisos, permiso)) throw prohibido();
      const d = validar<{ decision: 'validado' | 'rechazado'; motivo?: string }>(
        esquemaValidarRegistro,
        cuerpo,
      );
      if (d.decision === 'rechazado' && !d.motivo) throw invalida('Indique el motivo del rechazo');
      const fila = buscar(alm, tabla, p[1]!);
      const t = ahora();
      Object.assign(fila, {
        estado_validacion: d.decision,
        validado_por: u.id,
        validado_en: t,
        motivo_rechazo: d.decision === 'rechazado' ? d.motivo : null,
        server_updated_at: t,
      });
      anotarBitacora(alm, {
        usuarioId: u.id,
        accion: d.decision === 'validado' ? 'validar' : 'rechazar',
        tabla,
        registroId: fila.id,
        datos: { motivo: d.motivo },
      });
      return { ok: true };
    },
  ],

  // Alertas de Fusarium
  [
    'GET',
    /^\/alertas$/,
    'fusarium:ver',
    ({ alm }) =>
      tablaDe(alm, 'alertas_fusarium')
        .filter((x) => !x.deleted_at)
        .sort((a, b) => Number(b.created_at) - Number(a.created_at))
        .slice(0, 500),
  ],
  [
    'PATCH',
    /^\/alertas\/([^/]+)$/,
    'fusarium:gestionar',
    ({ alm, p, cuerpo, u }) => {
      const d = validar<{ estado: string; notas?: string }>(esquemaEstadoFusarium, cuerpo);
      const fila = buscar(alm, 'alertas_fusarium', p[0]!);
      const t = ahora();
      Object.assign(fila, {
        estado: d.estado,
        ...(d.notas !== undefined ? { notas: d.notas } : {}),
        updated_at: t,
        server_updated_at: t,
      });
      const punto = alm.mapa.registros.features.find((f) => f.properties?.id === fila.id);
      if (punto?.properties) punto.properties.detalle = `Fusarium: ${d.estado}`;
      anotarBitacora(alm, {
        usuarioId: u.id,
        accion: 'editar',
        tabla: 'alertas_fusarium',
        registroId: fila.id,
        datos: { estado: d.estado },
      });
      return { ok: true };
    },
  ],

  // Órdenes de trabajo
  [
    'GET',
    /^\/ordenes$/,
    'ordenes:ver',
    ({ alm }) =>
      tablaDe(alm, 'ordenes_trabajo')
        .filter((x) => !x.deleted_at)
        .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
        .slice(0, 500),
  ],
  [
    'POST',
    /^\/ordenes$/,
    'ordenes:crear',
    ({ alm, cuerpo, u }) => {
      const d = validar<Record<string, unknown>>(esquemaOrdenTrabajo, cuerpo);
      const t = ahora();
      const fila: Fila = {
        id: randomUUID(),
        created_at: t,
        updated_at: t,
        server_updated_at: t,
        deleted_at: null,
        device_id: null,
        created_by: u.id,
        finca_id: u.fincaId,
        titulo: d.titulo,
        descripcion: d.descripcion ?? null,
        modulo: d.modulo,
        lote_id: d.lote_id ?? null,
        asignado_a: d.asignado_a,
        asignado_por: u.id,
        fecha: d.fecha,
        estado: 'pendiente',
      };
      tablaDe(alm, 'ordenes_trabajo').unshift(fila);
      anotarBitacora(alm, {
        usuarioId: u.id,
        accion: 'crear',
        tabla: 'ordenes_trabajo',
        registroId: fila.id,
      });
      return { id: fila.id };
    },
  ],

  // Dispositivos y respaldos
  [
    'GET',
    /^\/dispositivos$/,
    'dispositivos:ver',
    ({ alm }) =>
      alm.dispositivos
        .slice()
        .sort((a, b) => Number(b.ultimo_sync ?? 0) - Number(a.ultimo_sync ?? 0)),
  ],
  [
    'PATCH',
    /^\/dispositivos\/([^/]+)$/,
    'dispositivos:gestionar',
    ({ alm, p, cuerpo, u }) => {
      const d = validar<{ estado: string }>(esquemaAccionDispositivo, cuerpo);
      const disp = alm.dispositivos.find((x) => x.id === p[0]);
      if (!disp) throw noEncontrado('Dispositivo no encontrado');
      disp.estado = d.estado;
      disp.updated_at = ahora();
      anotarBitacora(alm, {
        usuarioId: u.id,
        dispositivoId: disp.id,
        accion: d.estado === 'borrado_solicitado' ? 'borrado_remoto' : 'editar',
        tabla: 'dispositivos',
        registroId: disp.id,
        datos: { estado: d.estado },
      });
      return { ok: true, estado: disp.estado };
    },
  ],
  [
    'POST',
    /^\/respaldos\/importar$/,
    'dispositivos:gestionar',
    () => {
      throw new ErrorMock(
        409,
        'En modo demo (sin API) no se importan respaldos: inicie el panel con KALO_DATOS=api.',
        'NO_DISPONIBLE_EN_DEMO',
      );
    },
  ],

  // Administración: usuarios
  ['GET', /^\/admin\/usuarios$/, 'admin:usuarios', ({ alm }) => alm.usuarios],
  [
    'POST',
    /^\/admin\/usuarios$/,
    'admin:usuarios',
    ({ alm, cuerpo, u }) => {
      const d = validar<{
        usuario: string;
        nombre: string;
        rol_id: string;
        finca_id: string;
        pin: string;
        trabajador_id?: string | null;
      }>(esquemaUsuarioNuevo, cuerpo);
      if (alm.usuarios.some((x) => x.usuario === d.usuario))
        throw invalida('Ese nombre de usuario ya existe');
      if (!alm.roles.roles.some((r) => r.id === d.rol_id)) throw invalida('Rol desconocido');
      const t = ahora();
      const nuevo: UsuarioAdmin = {
        id: randomUUID(),
        usuario: d.usuario,
        nombre: d.nombre,
        rol_id: d.rol_id,
        finca_id: d.finca_id,
        activo: true,
        trabajador_id: d.trabajador_id ?? null,
        tiene_gafete: false,
      };
      alm.usuarios.push(nuevo);
      alm.usuarios.sort((a, b) => a.nombre.localeCompare(b.nombre));
      alm.catalogos.usuarios.push({
        id: nuevo.id,
        usuario: nuevo.usuario,
        nombre: nuevo.nombre,
        rol_id: nuevo.rol_id,
        activo: true,
        trabajador_id: nuevo.trabajador_id,
        created_at: t,
        updated_at: t,
      });
      alm.pines.set(nuevo.id, d.pin);
      anotarBitacora(alm, {
        usuarioId: u.id,
        accion: 'crear',
        tabla: 'usuarios',
        registroId: nuevo.id,
      });
      return { id: nuevo.id };
    },
  ],
  [
    'PATCH',
    /^\/admin\/usuarios\/([^/]+)$/,
    'admin:usuarios',
    ({ alm, p, cuerpo, u }) => {
      const { pin, ...datos } = validar<Record<string, unknown> & { pin?: string }>(
        esquemaUsuarioEdicion,
        cuerpo,
      );
      const usuario = alm.usuarios.find((x) => x.id === p[0]);
      if (!usuario) throw noEncontrado('Usuario no encontrado');
      if (datos.rol_id && !alm.roles.roles.some((r) => r.id === datos.rol_id))
        throw invalida('Rol desconocido');
      Object.assign(usuario, datos);
      const enCatalogo = alm.catalogos.usuarios.find((x) => x.id === usuario.id);
      if (enCatalogo) Object.assign(enCatalogo, datos, { updated_at: ahora() });
      if (pin) alm.pines.set(usuario.id, pin);
      anotarBitacora(alm, {
        usuarioId: u.id,
        accion: 'editar',
        tabla: 'usuarios',
        registroId: usuario.id,
        datos: { ...datos, pin: pin ? '(cambiado)' : undefined },
      });
      return { ok: true };
    },
  ],
  [
    'POST',
    /^\/admin\/usuarios\/([^/]+)\/gafete$/,
    'admin:usuarios',
    ({ alm, p }) => {
      const usuario = alm.usuarios.find((x) => x.id === p[0]);
      if (!usuario) throw noEncontrado('Usuario no encontrado');
      usuario.tiene_gafete = true;
      return { codigo: `KALO-GAFETE:${usuario.id}:${randomBytes(12).toString('hex')}` };
    },
  ],

  // Administración: roles y permisos
  ['GET', /^\/admin\/roles$/, 'admin:roles', ({ alm }) => alm.roles],
  [
    'PUT',
    /^\/admin\/roles\/([^/]+)\/permisos$/,
    'admin:roles',
    ({ alm, p, cuerpo, u }) => {
      const d = validar<{ permisos: string[] }>(esquemaRolPermisos, cuerpo);
      const rol = alm.roles.roles.find((r) => r.id === p[0]);
      if (!rol) throw noEncontrado('Rol no encontrado');
      const validos = new Set(alm.roles.permisos.map((x) => String(x.codigo)));
      rol.permisos = [...new Set(d.permisos)].filter((x) => validos.has(x));
      anotarBitacora(alm, {
        usuarioId: u.id,
        accion: 'editar',
        tabla: 'rol_permisos',
        registroId: rol.id,
        datos: { permisos: d.permisos },
      });
      return { ok: true };
    },
  ],

  // Administración: catálogos simples
  [
    'POST',
    /^\/admin\/(lotes|plagas|tipos-labor|colores-cinta)$/,
    'admin:catalogos',
    ({ alm, p, cuerpo, u }) => {
      const def = CATALOGOS_ADMIN[p[0]!]!;
      const datos = validarCatalogo(p[0]!, cuerpo, false);
      const t = ahora();
      const fila: Fila = {
        id: randomUUID(),
        ...datos,
        created_at: t,
        updated_at: t,
        server_updated_at: t,
        deleted_at: null,
        created_by: u.id,
        finca_id: u.fincaId,
      };
      (alm.catalogos[def.clave] as Fila[]).push(fila);
      anotarBitacora(alm, {
        usuarioId: u.id,
        accion: 'crear',
        tabla: def.tabla,
        registroId: fila.id,
      });
      return { id: fila.id };
    },
  ],
  [
    'PATCH',
    /^\/admin\/(lotes|plagas|tipos-labor|colores-cinta)\/([^/]+)$/,
    'admin:catalogos',
    ({ alm, p, cuerpo, u }) => {
      const def = CATALOGOS_ADMIN[p[0]!]!;
      const datos = validarCatalogo(p[0]!, cuerpo, true);
      const fila = (alm.catalogos[def.clave] as Fila[]).find((x) => x.id === p[1]);
      if (!fila) throw noEncontrado();
      const t = ahora();
      Object.assign(fila, datos, { updated_at: t, server_updated_at: t });
      if (def.clave === 'lotes') sincronizarLoteMapa(alm, fila.id, datos);
      anotarBitacora(alm, {
        usuarioId: u.id,
        accion: 'editar',
        tabla: def.tabla,
        registroId: fila.id,
        datos,
      });
      return { ok: true };
    },
  ],
  [
    'PATCH',
    /^\/admin\/semanas\/([^/]+)$/,
    'admin:catalogos',
    ({ alm, p, cuerpo, u }) => {
      const d = validar<Record<string, unknown>>(esquemaSemanaEdicion, cuerpo);
      const semana = alm.catalogos.semanas.find((x) => x.id === p[0]);
      if (!semana) throw noEncontrado('Semana no encontrada');
      const t = ahora();
      Object.assign(semana, d, { updated_at: t, server_updated_at: t });
      anotarBitacora(alm, {
        usuarioId: u.id,
        accion: 'editar',
        tabla: 'semanas',
        registroId: semana.id,
        datos: d,
      });
      return { ok: true };
    },
  ],

  // Administración: parámetros y módulos
  [
    'PATCH',
    /^\/admin\/parametros\/([^/]+)$/,
    'admin:parametros',
    ({ alm, p, cuerpo, u }) => {
      const d = validar<{ valor: unknown }>(esquemaParametroEdicion, cuerpo);
      const param = alm.catalogos.parametros.find((x) => x.id === p[0]);
      if (!param) throw noEncontrado('Parámetro no encontrado');
      const t = ahora();
      Object.assign(param, { valor: d.valor, updated_at: t, server_updated_at: t });
      anotarBitacora(alm, {
        usuarioId: u.id,
        accion: 'editar',
        tabla: 'parametros',
        registroId: param.id,
        datos: d,
      });
      return { ok: true };
    },
  ],
  [
    'PUT',
    /^\/admin\/feature-flags$/,
    'admin:parametros',
    ({ alm, cuerpo, u }) => {
      const d = validar<{ codigo: string; rol_id?: string | null; activo: boolean }>(
        esquemaFeatureFlag,
        cuerpo,
      );
      const rol = d.rol_id ?? null;
      const t = ahora();
      const existente = alm.catalogos.flags.find(
        (f) => f.codigo === d.codigo && (f.rol_id ?? null) === rol,
      );
      if (existente)
        Object.assign(existente, {
          activo: d.activo,
          deleted_at: null,
          updated_at: t,
          server_updated_at: t,
        });
      else
        alm.catalogos.flags.push({
          id: randomUUID(),
          codigo: d.codigo,
          rol_id: rol,
          activo: d.activo,
          finca_id: u.fincaId,
          created_at: t,
          updated_at: t,
          server_updated_at: t,
          deleted_at: null,
          created_by: u.id,
        });
      anotarBitacora(alm, { usuarioId: u.id, accion: 'editar', tabla: 'feature_flags', datos: d });
      return { ok: true };
    },
  ],

  // Administración: formularios dinámicos
  [
    'GET',
    /^\/admin\/formularios$/,
    'admin:formularios',
    ({ alm }) =>
      alm.formularios
        .filter((f) => !f.deleted_at)
        .sort(
          (a, b) =>
            String(a.codigo).localeCompare(String(b.codigo)) ||
            Number(b.version) - Number(a.version),
        ),
  ],
  [
    'POST',
    /^\/admin\/formularios$/,
    'admin:formularios',
    ({ alm, cuerpo, u }) => {
      const base = validar<{ codigo: string }>(
        esquemaDefinicionBase.omit({ version: true }),
        cuerpo,
      );
      const previas = alm.formularios.filter((f) => f.codigo === base.codigo);
      const version = Math.max(0, ...previas.map((f) => Number(f.version))) + 1;
      const definicion = validar<{ codigo: string; titulo: string }>(esquemaDefinicionFormulario, {
        ...base,
        version,
      });
      const t = ahora();
      for (const f of previas.filter((x) => x.activo))
        Object.assign(f, { activo: false, updated_at: t, server_updated_at: t });
      const fila: Fila = {
        id: randomUUID(),
        created_at: t,
        updated_at: t,
        server_updated_at: t,
        deleted_at: null,
        device_id: null,
        created_by: u.id,
        finca_id: null,
        codigo: definicion.codigo,
        version,
        titulo: definicion.titulo,
        definicion,
        activo: true,
      };
      alm.formularios.push(fila);
      anotarBitacora(alm, {
        usuarioId: u.id,
        accion: 'crear',
        tabla: 'definiciones_formulario',
        registroId: fila.id,
        datos: { codigo: definicion.codigo, version },
      });
      return { id: fila.id, version };
    },
  ],

  // Administración: bitácora
  [
    'GET',
    /^\/admin\/bitacora$/,
    'admin:usuarios',
    ({ alm, q }) => {
      const limite = Math.min(1000, Math.max(1, Number(q.get('limite') ?? 200) || 200));
      return alm.bitacora
        .slice()
        .sort((a, b) => Number(b.created_at) - Number(a.created_at))
        .slice(0, limite);
    },
  ],
];

/**
 * Responde una petición del panel en modo demo.
 * @param ruta ruta bajo /v1 (p. ej. `/registros/cosecha`)
 * @param usuario perfil del usuario de la sesión (null = sin sesión → 401)
 */
export async function responderMock(
  metodo: string,
  ruta: string,
  query: URLSearchParams,
  cuerpo: unknown,
  usuario: PerfilUsuario | null,
): Promise<RespuestaMock> {
  const error = (status: number, mensaje: string, codigo: string): RespuestaMock => ({
    status,
    json: { error: mensaje, codigo },
  });
  if (!usuario) return error(401, 'Sesión inválida o vencida', 'NO_AUTORIZADO');
  const alm = almacen();
  // El perfil se recalcula en cada petición: los cambios de rol o permisos aplican al instante.
  const u = perfilMock(alm, usuario.id);
  if (!u) return error(401, 'Sesión inválida o vencida', 'NO_AUTORIZADO');
  const permisos = new Set(u.permisos);
  const limpia = `/${ruta.replace(/^\/+|\/+$/g, '')}`;
  let rutaConocida = false;
  for (const [m, patron, permiso, manejar] of RUTAS) {
    const coincide = patron.exec(limpia);
    if (!coincide) continue;
    rutaConocida = true;
    if (m !== metodo.toUpperCase()) continue;
    try {
      if (permiso && !tienePermiso(permisos, permiso)) throw prohibido();
      const p = coincide.slice(1).map(decodeURIComponent);
      const r = await manejar({ p, q: query, cuerpo, u, permisos, alm });
      if (r && typeof r === 'object' && 'status' in r && ('bytes' in r || 'json' in r))
        return r as RespuestaMock;
      return { status: 200, json: r };
    } catch (e) {
      if (e instanceof ErrorMock) return error(e.status, e.message, e.codigo);
      console.error('[modo demo]', metodo, limpia, e);
      return error(500, 'Error interno del modo demo', 'ERROR_INTERNO');
    }
  }
  return rutaConocida
    ? error(405, 'Método no permitido', 'METODO_NO_PERMITIDO')
    : error(404, `Ruta no disponible en modo demo: ${limpia}`, 'NO_ENCONTRADO');
}
