import { semanaIso } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useMemo } from 'react';
import { useConsulta } from '@/db/hooks';

/** Semana ISO actual con su color de cinta y factor (del calendario sincronizado). */
export function useSemanaActual() {
  const s = useMemo(() => semanaIso(new Date()), []);
  const semanas = useConsulta(
    'semanas',
    [Q.where('anio', s.anio), Q.where('numero', s.numero)],
    [s.anio, s.numero],
  );
  const colores = useConsulta('colores_cinta');
  const semana = semanas[0] ?? null;
  const color = colores.find((c) => c.id === semana?.color_cinta_id) ?? null;
  return { ...s, semana, color, colores: [...colores].sort((a, b) => a.orden - b.orden) };
}
