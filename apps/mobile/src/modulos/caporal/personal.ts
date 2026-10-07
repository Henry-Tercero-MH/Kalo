/**
 * Personal a cargo del usuario: los trabajadores de las cuadrillas donde él es el caporal.
 * El caporal no elige cuadrilla; ve directamente a su gente. Si el usuario no tiene
 * cuadrillas propias (p. ej. el administrador), se muestra todo el personal de la finca.
 */
import { Q } from '@nozbe/watermelondb';
import { useMemo } from 'react';
import { useConsulta } from '@/db/hooks';
import { useSesion } from '@/permisos/sesion';

export function usePersonalACargo() {
  const usuario = useSesion((s) => s.usuario);
  const cuadrillas = useConsulta('cuadrillas');
  const miembros = useConsulta('cuadrilla_miembros');
  const trabajadores = useConsulta('trabajadores', [Q.where('activo', true)]);
  return useMemo(() => {
    const propias = cuadrillas.filter((c) => c.caporal_id === usuario?.id);
    const ids = new Set((propias.length > 0 ? propias : cuadrillas).map((c) => c.id));
    /** Cuadrilla de cada trabajador (se guarda en sus registros para los reportes). */
    const cuadrillaDe: Record<string, string> = {};
    for (const m of miembros)
      if (ids.has(m.cuadrilla_id)) cuadrillaDe[m.trabajador_id] = m.cuadrilla_id;
    const lista = trabajadores
      .filter((tr) => tr.id in cuadrillaDe)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
    return { lista, cuadrillaDe, propio: propias.length > 0 };
  }, [cuadrillas, miembros, trabajadores, usuario?.id]);
}
