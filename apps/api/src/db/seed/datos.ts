/**
 * Datos ficticios del demo. TODO lo que se siembra está marcado como DEMO.
 * Nada de esto son cifras reales de producción.
 */
import { ROLES, type CodigoRol } from '@kalo/shared';

/** Ubicación aproximada de una zona bananera de Guatemala (Morales, Izabal). Ficticio. */
export const CENTRO_FINCA = { lat: 15.472, lng: -88.812 };

/** Usuarios del demo (un usuario por rol). PIN documentado en el README. */
export const USUARIOS_DEMO: { usuario: string; nombre: string; rol: CodigoRol; pin: string }[] = [
  { usuario: 'admin', nombre: 'Ana Administradora (DEMO)', rol: ROLES.administrador, pin: '1111' },
  { usuario: 'gerente', nombre: 'Gerardo Gerente (DEMO)', rol: ROLES.gerente, pin: '2222' },
  { usuario: 'supervisor', nombre: 'Sofía Supervisora (DEMO)', rol: ROLES.supervisor, pin: '3333' },
  { usuario: 'tecnico', nombre: 'Tomás Técnico de Sanidad (DEMO)', rol: ROLES.tecnico_sanidad, pin: '4444' },
  { usuario: 'caporal', nombre: 'Carlos Caporal (DEMO)', rol: ROLES.caporal, pin: '5555' },
  { usuario: 'trabajador', nombre: 'Teresa Trabajadora (DEMO)', rol: ROLES.trabajador, pin: '6666' },
];

export const ROLES_DEMO: { codigo: CodigoRol; nombre: string; plataformas: string[] }[] = [
  { codigo: ROLES.administrador, nombre: 'Administrador', plataformas: ['web'] },
  { codigo: ROLES.gerente, nombre: 'Gerente', plataformas: ['web'] },
  { codigo: ROLES.supervisor, nombre: 'Supervisor', plataformas: ['web', 'movil'] },
  { codigo: ROLES.tecnico_sanidad, nombre: 'Técnico de sanidad', plataformas: ['movil'] },
  { codigo: ROLES.caporal, nombre: 'Caporal', plataformas: ['movil'] },
  { codigo: ROLES.trabajador, nombre: 'Trabajador', plataformas: ['movil'] },
];

const VER_TODO = [
  'plagas:ver',
  'trampas:ver',
  'fusarium:ver',
  'enfunde:ver',
  'cosecha:ver',
  'labores:ver',
  'rutas:ver',
  'ordenes:ver',
  'mapa:ver',
  'registros:ver',
  'pronostico:ver',
];

/**
 * Asignación inicial de permisos por rol. Después se edita desde el panel
 * (Administración → Roles): la fuente de verdad es la base de datos.
 */
export const PERMISOS_POR_ROL: Record<CodigoRol, string[] | '*'> = {
  administrador: '*',
  gerente: [...VER_TODO, 'registros:exportar', 'dispositivos:ver', 'validacion:ver'],
  supervisor: [
    ...VER_TODO,
    'registros:exportar',
    'validacion:ver',
    'conflictos:resolver',
    'cosecha:validar',
    'labores:validar',
    'fusarium:gestionar',
    'ordenes:crear',
    'ordenes:actualizar',
    'dispositivos:ver',
    'sincronizacion:usar',
    'perfil:usar',
    'archivos:crear',
    'rutas:crear',
    'fusarium:crear',
  ],
  tecnico_sanidad: [
    'plagas:ver',
    'plagas:crear',
    'plagas:editar',
    'trampas:ver',
    'trampas:crear',
    'trampas:editar',
    'fusarium:crear',
    'fusarium:ver',
    'rutas:crear',
    'rutas:ver',
    'ordenes:ver',
    'ordenes:actualizar',
    'perfil:usar',
    'sincronizacion:usar',
    'archivos:crear',
  ],
  caporal: [
    'labores:ver',
    'labores:crear',
    'labores:editar',
    'enfunde:ver',
    'enfunde:crear',
    'enfunde:editar',
    'cosecha:ver',
    'cosecha:crear',
    'cosecha:editar',
    'fusarium:crear',
    'rutas:crear',
    'ordenes:ver',
    'ordenes:actualizar',
    'perfil:usar',
    'sincronizacion:usar',
    'archivos:crear',
  ],
  trabajador: [
    'ordenes:ver',
    'ordenes:actualizar',
    'produccion:ver_propia',
    'fusarium:crear',
    'perfil:usar',
    'sincronizacion:usar',
    'archivos:crear',
  ],
};

/** Colores de cinta de EJEMPLO. Los reales están pendientes de confirmar por la finca. */
export const COLORES_CINTA_EJEMPLO = [
  { nombre: 'Azul', hex: '#1f5fbf' },
  { nombre: 'Rojo', hex: '#c62828' },
  { nombre: 'Café', hex: '#6d4c41' },
  { nombre: 'Negro', hex: '#212121' },
  { nombre: 'Verde', hex: '#2e7d32' },
  { nombre: 'Amarillo', hex: '#f9c80e' },
  { nombre: 'Blanco', hex: '#f5f5f5' },
  { nombre: 'Morado', hex: '#6a1b9a' },
  { nombre: 'Naranja', hex: '#ef6c00' },
  { nombre: 'Gris', hex: '#9e9e9e' },
];

/** Catálogo de plagas con umbrales de EJEMPLO (incidencia %), editables en el panel. */
export const PLAGAS_DEMO = [
  { codigo: 'sigatoka_negra', nombre: 'Sigatoka negra', nombre_cientifico: 'Pseudocercospora fijiensis', tipo: 'enfermedad', umbral_alerta: 15 },
  { codigo: 'picudo_negro', nombre: 'Picudo negro', nombre_cientifico: 'Cosmopolites sordidus', tipo: 'plaga', umbral_alerta: 10 },
  { codigo: 'nematodos', nombre: 'Nematodos', nombre_cientifico: 'Radopholus similis', tipo: 'plaga', umbral_alerta: 20 },
  { codigo: 'cochinilla', nombre: 'Cochinilla', nombre_cientifico: 'Dysmicoccus spp.', tipo: 'plaga', umbral_alerta: 8 },
  { codigo: 'trips', nombre: 'Trips', nombre_cientifico: 'Chaetanaphothrips spp.', tipo: 'plaga', umbral_alerta: 12 },
  { codigo: 'fusarium_r4t', nombre: 'Fusarium R4T', nombre_cientifico: 'Fusarium oxysporum f. sp. cubense R4T', tipo: 'enfermedad', umbral_alerta: 0.1 },
] as const;

/** Catálogo de labores. Tarifas pendientes de definir (null). */
export const LABORES_DEMO = [
  { codigo: 'enfunde', nombre: 'Enfunde', unidad: 'racimos' },
  { codigo: 'deshoje', nombre: 'Deshoje', unidad: 'plantas' },
  { codigo: 'deshije', nombre: 'Deshije', unidad: 'plantas' },
  { codigo: 'cosecha', nombre: 'Cosecha', unidad: 'racimos' },
  { codigo: 'apuntalamiento', nombre: 'Apuntalamiento', unidad: 'plantas' },
  { codigo: 'fertilizacion', nombre: 'Fertilización', unidad: 'hectareas' },
] as const;

/** Formulario dinámico de muestreo de plagas (versión 1). */
export const FORMULARIO_MUESTREO = {
  codigo: 'muestreo_plagas',
  version: 1,
  titulo: 'Muestreo de plagas y enfermedades',
  campos: [
    {
      id: 'plantas_revisadas',
      tipo: 'entero',
      etiqueta: '¿Cuántas plantas revisó?',
      requerido: true,
      min: 1,
      max: 500,
      unidad: 'plantas',
    },
    {
      id: 'plantas_afectadas',
      tipo: 'entero',
      etiqueta: '¿Cuántas plantas tenían la plaga?',
      requerido: true,
      min: 0,
      max: 500,
      unidad: 'plantas',
    },
    {
      id: 'severidad',
      tipo: 'opcion',
      etiqueta: 'Severidad observada',
      requerido: true,
      columna: 'severidad',
      opciones: [
        { valor: 'baja', etiqueta: 'BAJA' },
        { valor: 'media', etiqueta: 'MEDIA' },
        { valor: 'alta', etiqueta: 'ALTA' },
      ],
    },
    {
      id: 'dano_fruta',
      tipo: 'booleano',
      etiqueta: '¿Hay daño en la fruta?',
      requerido: true,
    },
    {
      id: 'tipo_dano',
      tipo: 'opcion',
      etiqueta: 'Tipo de daño en fruta',
      requerido: true,
      visibleSi: { campo: 'dano_fruta', igualA: [true] },
      opciones: [
        { valor: 'manchas', etiqueta: 'Manchas' },
        { valor: 'deformacion', etiqueta: 'Deformación' },
        { valor: 'pudricion', etiqueta: 'Pudrición' },
      ],
    },
  ],
};
