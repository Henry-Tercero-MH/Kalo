/**
 * Registro de módulos (manifiestos).
 *
 * La app móvil y el panel web arman su menú leyendo este registro, filtrado por los
 * permisos del usuario (que vienen de la base de datos) y por los feature flags.
 * Agregar un módulo = agregar su manifiesto aquí + su carpeta en la app/panel.
 * Ver docs/modulos.md.
 */
import type { NombreTabla } from './tablas/registro';

export type Plataforma = 'movil' | 'web';
export type EstadoModulo = 'activo' | 'proximamente';

export interface ManifiestoModulo {
  codigo: string;
  nombre: string;
  descripcion: string;
  /** Nombre de icono de Lucide (kebab-case), igual en lucide-react y lucide-react-native. */
  icono: string;
  plataformas: readonly Plataforma[];
  /** Permiso necesario para ver el módulo en el menú. `null` = siempre visible. */
  permisoVer: string | null;
  /** Permisos que el módulo define (se siembran en la tabla `permisos`). */
  permisos: readonly { codigo: string; descripcion: string }[];
  tablas: readonly NombreTabla[];
  rutaMovil?: string;
  rutaWeb?: string;
  estado: EstadoModulo;
  orden: number;
}

const p = (codigo: string, descripcion: string) => ({ codigo, descripcion });

export const MODULOS = [
  // ─── Móvil ──────────────────────────────────────────────────────────────
  {
    codigo: 'plagas',
    nombre: 'Plagas y enfermedades',
    descripcion: 'Muestreo por lote y preaviso de sigatoka',
    icono: 'bug',
    plataformas: ['movil', 'web'],
    permisoVer: 'plagas:ver',
    permisos: [
      p('plagas:ver', 'Ver muestreos y preavisos'),
      p('plagas:crear', 'Registrar muestreos y preavisos'),
      p('plagas:editar', 'Editar muestreos y preavisos'),
    ],
    tablas: ['muestreos', 'preaviso_sigatoka'],
    rutaMovil: '/modulos/plagas',
    rutaWeb: '/registros/muestreos',
    estado: 'activo',
    orden: 10,
  },
  {
    codigo: 'trampas',
    nombre: 'Trampas de picudo',
    descripcion: 'Escanear QR de la trampa y registrar capturas',
    icono: 'scan-qr-code',
    plataformas: ['movil', 'web'],
    permisoVer: 'trampas:ver',
    permisos: [
      p('trampas:ver', 'Ver lecturas de trampas'),
      p('trampas:crear', 'Registrar lecturas de trampas'),
      p('trampas:editar', 'Editar lecturas de trampas'),
    ],
    tablas: ['trampas', 'lecturas_trampa'],
    rutaMovil: '/modulos/trampas',
    rutaWeb: '/registros/lecturas_trampa',
    estado: 'activo',
    orden: 20,
  },
  {
    codigo: 'fusarium',
    nombre: 'Alerta de Fusarium',
    descripcion: 'Reportar sospecha de Fusarium R4T con foto y GPS',
    icono: 'triangle-alert',
    plataformas: ['movil', 'web'],
    permisoVer: 'fusarium:crear',
    permisos: [
      p('fusarium:ver', 'Ver alertas de Fusarium'),
      p('fusarium:crear', 'Reportar alertas de Fusarium'),
      p('fusarium:editar', 'Editar alertas de Fusarium'),
      p('fusarium:gestionar', 'Cambiar el estado de una alerta'),
    ],
    tablas: ['alertas_fusarium'],
    rutaMovil: '/modulos/fusarium',
    rutaWeb: '/alertas',
    estado: 'activo',
    orden: 30,
  },
  {
    codigo: 'enfunde',
    nombre: 'Enfunde',
    descripcion: 'Racimos enfundados por lote con la cinta de la semana',
    icono: 'package',
    plataformas: ['movil', 'web'],
    permisoVer: 'enfunde:ver',
    permisos: [
      p('enfunde:ver', 'Ver enfunde'),
      p('enfunde:crear', 'Registrar enfunde'),
      p('enfunde:editar', 'Editar enfunde'),
    ],
    tablas: ['enfunde'],
    rutaMovil: '/modulos/enfunde',
    rutaWeb: '/registros/enfunde',
    estado: 'activo',
    orden: 40,
  },
  {
    codigo: 'cosecha',
    nombre: 'Cosecha',
    descripcion: 'Racimos cosechados y perdidos por lote y color de cinta',
    icono: 'tractor',
    plataformas: ['movil', 'web'],
    permisoVer: 'cosecha:ver',
    permisos: [
      p('cosecha:ver', 'Ver cosecha'),
      p('cosecha:crear', 'Registrar cosecha'),
      p('cosecha:editar', 'Editar cosecha'),
      p('cosecha:validar', 'Validar o rechazar cosecha'),
    ],
    tablas: ['cosecha'],
    rutaMovil: '/modulos/cosecha',
    rutaWeb: '/registros/cosecha',
    estado: 'activo',
    orden: 50,
  },
  {
    codigo: 'labores',
    nombre: 'Labores y asistencia',
    descripcion: 'Asistencia y tareas por trabajador o cuadrilla',
    icono: 'users',
    plataformas: ['movil', 'web'],
    permisoVer: 'labores:ver',
    permisos: [
      p('labores:ver', 'Ver labores y asistencia'),
      p('labores:crear', 'Registrar labores y asistencia'),
      p('labores:editar', 'Editar labores y asistencia'),
      p('labores:validar', 'Validar o rechazar labores'),
    ],
    tablas: ['asistencia', 'labores'],
    rutaMovil: '/modulos/labores',
    rutaWeb: '/registros/labores',
    estado: 'activo',
    orden: 60,
  },
  {
    codigo: 'rutas',
    nombre: 'Rutas GPS',
    descripcion: 'Grabar el recorrido de una tarea y ver la cobertura del lote',
    icono: 'route',
    plataformas: ['movil', 'web'],
    permisoVer: 'rutas:crear',
    permisos: [p('rutas:ver', 'Ver rutas y cobertura'), p('rutas:crear', 'Grabar rutas')],
    tablas: ['rutas', 'puntos_ruta', 'cobertura_lote'],
    rutaMovil: '/modulos/rutas',
    rutaWeb: '/mapa',
    estado: 'activo',
    orden: 70,
  },
  {
    codigo: 'ordenes',
    nombre: 'Mis tareas',
    descripcion: 'Órdenes de trabajo asignadas',
    icono: 'clipboard-list',
    plataformas: ['movil', 'web'],
    permisoVer: 'ordenes:ver',
    permisos: [
      p('ordenes:ver', 'Ver órdenes de trabajo'),
      p('ordenes:crear', 'Asignar órdenes de trabajo'),
      p('ordenes:actualizar', 'Actualizar el estado de una orden'),
    ],
    tablas: ['ordenes_trabajo'],
    rutaMovil: '/modulos/ordenes',
    rutaWeb: '/registros/ordenes_trabajo',
    estado: 'activo',
    orden: 80,
  },
  {
    codigo: 'produccion',
    nombre: 'Mi producción',
    descripcion: 'Producción propia registrada',
    icono: 'chart-column',
    plataformas: ['movil'],
    permisoVer: 'produccion:ver_propia',
    permisos: [p('produccion:ver_propia', 'Ver su propia producción')],
    tablas: ['labores'],
    rutaMovil: '/modulos/produccion',
    estado: 'activo',
    orden: 90,
  },
  // ─── Preparados (estructura y pantalla «Próximamente») ──────────────────
  {
    codigo: 'conteo_cintas',
    nombre: 'Conteo de cintas con cámara',
    descripcion: 'Conteo automático de cintas por foto (servicio de visión)',
    icono: 'camera',
    plataformas: ['movil'],
    permisoVer: 'conteo_cintas:crear',
    permisos: [p('conteo_cintas:crear', 'Registrar conteos de cinta')],
    tablas: ['conteos_cinta'],
    rutaMovil: '/modulos/proximamente/conteo_cintas',
    estado: 'proximamente',
    orden: 200,
  },
  {
    codigo: 'detector_sigatoka',
    nombre: 'Detector de sigatoka por foto',
    descripcion: 'Estimación de severidad a partir de una foto de la hoja',
    icono: 'scan-search',
    plataformas: ['movil'],
    permisoVer: 'plagas:crear',
    permisos: [],
    tablas: [],
    rutaMovil: '/modulos/proximamente/detector_sigatoka',
    estado: 'proximamente',
    orden: 210,
  },
  {
    codigo: 'agroquimicos',
    nombre: 'Aplicaciones de agroquímicos',
    descripcion: 'Registro de aplicaciones y periodos de reingreso',
    icono: 'spray-can',
    plataformas: ['movil'],
    permisoVer: 'labores:crear',
    permisos: [],
    tablas: [],
    rutaMovil: '/modulos/proximamente/agroquimicos',
    estado: 'proximamente',
    orden: 220,
  },
  {
    codigo: 'bioseguridad',
    nombre: 'Bioseguridad',
    descripcion: 'Control de ingreso y desinfección',
    icono: 'shield-check',
    plataformas: ['movil'],
    permisoVer: 'perfil:usar',
    permisos: [],
    tablas: [],
    rutaMovil: '/modulos/proximamente/bioseguridad',
    estado: 'proximamente',
    orden: 230,
  },
  {
    codigo: 'seguridad_ocupacional',
    nombre: 'Seguridad ocupacional',
    descripcion: 'Incidentes y equipo de protección',
    icono: 'hard-hat',
    plataformas: ['movil'],
    permisoVer: 'perfil:usar',
    permisos: [],
    tablas: [],
    rutaMovil: '/modulos/proximamente/seguridad_ocupacional',
    estado: 'proximamente',
    orden: 240,
  },
  {
    codigo: 'emergencia',
    nombre: 'Botón de emergencia',
    descripcion: 'Aviso inmediato con ubicación',
    icono: 'siren',
    plataformas: ['movil'],
    permisoVer: 'perfil:usar',
    permisos: [],
    tablas: [],
    rutaMovil: '/modulos/proximamente/emergencia',
    estado: 'proximamente',
    orden: 250,
  },
  // ─── Comunes del celular ────────────────────────────────────────────────
  {
    codigo: 'perfil',
    nombre: 'Perfil',
    descripcion: 'Sesión, cambio de usuario y consentimiento',
    icono: 'user-round',
    plataformas: ['movil'],
    permisoVer: null,
    permisos: [p('perfil:usar', 'Usar la app móvil')],
    tablas: ['consentimientos'],
    estado: 'activo',
    orden: 900,
  },
  {
    codigo: 'archivos',
    nombre: 'Archivos',
    descripcion: 'Fotos y notas de voz',
    icono: 'image',
    plataformas: [],
    permisoVer: null,
    permisos: [p('archivos:crear', 'Adjuntar fotos y notas de voz')],
    tablas: ['archivos'],
    estado: 'activo',
    orden: 901,
  },
  // ─── Web ────────────────────────────────────────────────────────────────
  {
    codigo: 'mapa',
    nombre: 'Mapa de la finca',
    descripcion: 'Lotes por estado de plagas y rutas recorridas',
    icono: 'map',
    plataformas: ['web'],
    permisoVer: 'mapa:ver',
    permisos: [p('mapa:ver', 'Ver el mapa de la finca')],
    tablas: [],
    rutaWeb: '/mapa',
    estado: 'activo',
    orden: 1,
  },
  {
    codigo: 'registros',
    nombre: 'Registros',
    descripcion: 'Tablas por módulo con filtros y exportación',
    icono: 'table',
    plataformas: ['web'],
    permisoVer: 'registros:ver',
    permisos: [
      p('registros:ver', 'Ver tablas de registros'),
      p('registros:exportar', 'Exportar registros a Excel y CSV'),
    ],
    tablas: [],
    rutaWeb: '/registros',
    estado: 'activo',
    orden: 2,
  },
  {
    codigo: 'pronostico',
    nombre: 'Pronóstico',
    descripcion: 'Ecuación productiva y pronóstico semanal de cajas',
    icono: 'calculator',
    plataformas: ['web'],
    permisoVer: 'pronostico:ver',
    permisos: [p('pronostico:ver', 'Ver ecuación productiva y pronóstico')],
    tablas: [],
    rutaWeb: '/pronostico',
    estado: 'activo',
    orden: 3,
  },
  {
    codigo: 'validacion',
    nombre: 'Validación',
    descripcion: 'Bandeja del supervisor y conflictos de sincronización',
    icono: 'list-checks',
    plataformas: ['web'],
    permisoVer: 'validacion:ver',
    permisos: [
      p('validacion:ver', 'Ver la bandeja de validación'),
      p('conflictos:resolver', 'Resolver conflictos de sincronización'),
    ],
    tablas: [],
    rutaWeb: '/validacion',
    estado: 'activo',
    orden: 4,
  },
  {
    codigo: 'admin',
    nombre: 'Administración',
    descripcion: 'Usuarios, roles, catálogos, calendario y parámetros',
    icono: 'settings',
    plataformas: ['web'],
    permisoVer: 'admin:catalogos',
    permisos: [
      p('admin:usuarios', 'Administrar usuarios'),
      p('admin:roles', 'Administrar roles y permisos'),
      p('admin:catalogos', 'Administrar lotes, plagas, labores y calendario'),
      p('admin:parametros', 'Editar parámetros y feature flags'),
      p('admin:formularios', 'Editar definiciones de formulario'),
    ],
    tablas: [],
    rutaWeb: '/admin',
    estado: 'activo',
    orden: 6,
  },
  {
    codigo: 'dispositivos',
    nombre: 'Dispositivos',
    descripcion: 'Último sincronizado, versión y pendientes',
    icono: 'smartphone',
    plataformas: ['web'],
    permisoVer: 'dispositivos:ver',
    permisos: [
      p('dispositivos:ver', 'Ver dispositivos'),
      p('dispositivos:gestionar', 'Bloquear o borrar dispositivos de forma remota'),
    ],
    tablas: [],
    rutaWeb: '/dispositivos',
    estado: 'activo',
    orden: 7,
  },
  {
    codigo: 'sincronizacion',
    nombre: 'Sincronización',
    descripcion: 'Registros pendientes y envío al servidor',
    icono: 'refresh-cw',
    plataformas: [],
    permisoVer: null,
    permisos: [p('sincronizacion:usar', 'Sincronizar el dispositivo')],
    tablas: [],
    estado: 'activo',
    orden: 902,
  },
  ...(
    [
      ['nomina', 'Expedientes y nómina', 'wallet'],
      ['reporteria', 'Reportería', 'file-chart-column'],
      ['cumplimiento', 'Cumplimiento', 'badge-check'],
      ['satelital', 'Imágenes satelitales', 'satellite'],
    ] as const
  ).map(
    ([codigo, nombre, icono], i): ManifiestoModulo => ({
      codigo,
      nombre,
      descripcion: 'Próximamente',
      icono,
      plataformas: ['web'],
      permisoVer: 'registros:ver',
      permisos: [],
      tablas: [],
      rutaWeb: `/proximamente/${codigo}`,
      estado: 'proximamente',
      orden: 100 + i,
    }),
  ),
] as const satisfies readonly ManifiestoModulo[];

/** Todos los permisos declarados por los módulos (para sembrar la tabla `permisos`). */
export const PERMISOS_DECLARADOS = MODULOS.flatMap((m) =>
  m.permisos.map((perm) => ({ ...perm, modulo: m.codigo })),
);

export function modulosPara(
  plataforma: Plataforma,
  permisos: ReadonlySet<string>,
  flagsInactivos: ReadonlySet<string> = new Set(),
): ManifiestoModulo[] {
  return (MODULOS as readonly ManifiestoModulo[])
    .filter((m) => m.plataformas.includes(plataforma))
    .filter((m) => !flagsInactivos.has(m.codigo))
    .filter((m) => m.permisoVer === null || permisos.has(m.permisoVer))
    .sort((a, b) => a.orden - b.orden);
}
