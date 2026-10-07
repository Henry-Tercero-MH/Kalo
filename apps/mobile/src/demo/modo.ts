/**
 * Modo demo: la app funciona con los datos DEMO precargados, sin servidor.
 * La sincronización se simula (los registros pasan a «sincronizado» tras una espera).
 *
 * Contrato:
 *  - `esModoDemo()`  → true si el dispositivo se configuró con «Probar demo».
 *  - `activarModoDemo()` / `desactivarModoDemo()` lo persisten (almacén del dispositivo).
 *  - `DATOS_DEMO` es un pull inicial (formato de /v1/sync/pull) exportado del seed con
 *    `pnpm --filter @kalo/api demo:movil`.
 */
import { USA_API } from '@/config';
import datos from './datos-demo.json';

export const DATOS_DEMO = datos as unknown as {
  generado: string;
  finca: { id: string; nombre: string; bbox: [number, number, number, number] };
  timestamp: number;
  changes: Record<
    string,
    { created: Record<string, unknown>[]; updated: unknown[]; deleted: string[] }
  >;
};

export const DISPOSITIVO_DEMO_ID = '00000000-0000-4000-8000-00000000d3e0';

let activo = false;

/** Se fija al cargar la configuración (ver permisos/contexto.ts). */
export function fijarModoDemo(valor: boolean) {
  activo = valor;
}

export function esModoDemo(): boolean {
  // Sin API (modo mock) la app siempre trabaja con los datos DEMO.
  return activo || !USA_API;
}

/**
 * PIN de cada usuario DEMO (los mismos del seed y del README). Solo se muestran en modo demo
 * para que quien prueba la app pueda entrar sin buscarlos.
 */
export const PINES_DEMO: Readonly<Record<string, string>> = {
  admin: '1111',
  gerente: '2222',
  supervisor: '3333',
  tecnico: '4444',
  caporal: '5555',
};
