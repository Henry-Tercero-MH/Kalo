/**
 * Etapa actual del proyecto.
 *
 * Etapa 1 — Finca Las Rosas (hule): solo labores y asistencia. Los tableros (gerencia,
 * supervisión, sanidad), los módulos de banano y el modelo de sigatoka quedan congelados:
 * el código sigue en el repositorio, pero no se muestran en la app ni en el panel.
 *
 * Para descongelar un módulo, quítelo de `modulosCongelados`. Para volver a mostrar los
 * tableros de inicio por rol, ponga `tablerosCongelados: false`.
 */
import type { NombreTabla } from './tablas/registro';

export type Cultivo = 'hule' | 'banano';

export const ETAPA = {
  nombre: 'Etapa 1 · Labores y asistencia',
  finca: 'Finca Las Rosas',
  cultivo: 'hule' as Cultivo,
  /** Inicio de cada rol con indicadores y gráficas (gerente, supervisor, técnico, admin). */
  tablerosCongelados: true,
  modulosCongelados: new Set<string>([
    // Sanidad y modelo de sigatoka
    'plagas',
    'trampas',
    'fusarium',
    'detector_sigatoka',
    // Propios de banano
    'enfunde',
    'cosecha',
    'conteo_cintas',
    'pronostico',
    // Tableros y mapa (estado de plagas, cobertura)
    'mapa',
    'rutas',
    // Próximamente
    'agroquimicos',
    'bioseguridad',
    'seguridad_ocupacional',
    'emergencia',
    'nomina',
    'reporteria',
    'cumplimiento',
    'satelital',
  ]),
} as const;

export function moduloCongelado(codigo: string): boolean {
  return ETAPA.modulosCongelados.has(codigo);
}

/** Tablas que pertenecen solo a módulos congelados (se ocultan en Registros). */
export const TABLAS_CONGELADAS: ReadonlySet<NombreTabla> = new Set<NombreTabla>([
  'muestreos',
  'preaviso_sigatoka',
  'trampas',
  'lecturas_trampa',
  'alertas_fusarium',
  'enfunde',
  'cosecha',
  'rutas',
  'puntos_ruta',
  'cobertura_lote',
  'conteos_cinta',
]);

/** Los colores de cinta por semana solo aplican a banano. */
export const usaCinta = (): boolean => ETAPA.cultivo === 'banano';
