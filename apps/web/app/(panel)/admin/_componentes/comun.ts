'use client';

/** Piezas que comparten las secciones de administración (catálogos y plataforma). */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { claseControlCompacto, claseEncabezadoTabla } from '@/componentes/ui';
import { api } from '@/lib/api';

export const th = claseEncabezadoTabla;

/** Celda numérica editable de las tablas de catálogos. */
export const celdaNum = `w-28 text-right tabular ${claseControlCompacto}`;

/** Guarda un cambio de catálogo y recarga los catálogos. */
export function useGuardar() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (v: { ruta: string; method?: string; body: unknown }) =>
      api(v.ruta, { method: v.method ?? 'PATCH', body: v.body }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['catalogos'] }),
  });
}
