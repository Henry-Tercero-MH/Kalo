'use client';

import type { ManifiestoModulo } from '@kalo/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from './api';

interface ConId {
  id: string;
}
export interface Lote extends ConId {
  codigo: string;
  nombre: string;
  hectareas: number;
  poblacion: number;
  poligono: unknown;
}
export interface Plaga extends ConId {
  codigo: string;
  nombre: string;
  nombre_cientifico: string | null;
  tipo: string;
  umbral_alerta: number;
  activo: boolean;
}
export interface ColorCinta extends ConId {
  nombre: string;
  hex: string;
  orden: number;
  pendiente_confirmar: boolean;
}
export interface Semana extends ConId {
  anio: number;
  numero: number;
  fecha_inicio: string;
  fecha_fin: string;
  color_cinta_id: string;
  factor: number;
}
export interface Usuario extends ConId {
  usuario: string;
  nombre: string;
  rol_id: string;
  activo: boolean;
  trabajador_id: string | null;
}
export interface Rol extends ConId {
  codigo: string;
  nombre: string;
  plataformas: string[];
}
export interface Trabajador extends ConId {
  codigo: string;
  nombre: string;
  dpi: string;
  cuadrilla_id: string | null;
  activo: boolean;
}
export interface Cuadrilla extends ConId {
  nombre: string;
  caporal_id: string | null;
}
export interface TipoLabor extends ConId {
  codigo: string;
  nombre: string;
  unidad: string;
  tarifa: number | null;
  activo: boolean;
}
export interface Trampa extends ConId {
  codigo_qr: string;
  nombre: string;
  lote_id: string;
  lat: number;
  lng: number;
  activa: boolean;
}
export interface Parametro extends ConId {
  clave: string;
  valor: unknown;
  descripcion: string;
  pendiente: boolean;
}
export interface Flag extends ConId {
  codigo: string;
  rol_id: string | null;
  activo: boolean;
}

export interface Catalogos {
  finca: {
    id: string;
    nombre: string;
    bbox: [number, number, number, number];
    unidad_area: string;
  } | null;
  lotes: Lote[];
  plagas: Plaga[];
  colores: ColorCinta[];
  semanas: Semana[];
  usuarios: Usuario[];
  roles: Rol[];
  trabajadores: Trabajador[];
  cuadrillas: Cuadrilla[];
  tiposLabor: TipoLabor[];
  trampas: Trampa[];
  flags: Flag[];
  parametros: Parametro[];
  modulos: ManifiestoModulo[];
}

export function useCatalogos() {
  return useQuery({
    queryKey: ['catalogos'],
    queryFn: () => api<Catalogos>('/catalogos'),
    staleTime: 60_000,
  });
}

/** Resuelve ids a nombres para mostrar en tablas. */
export function useNombres() {
  const { data } = useCatalogos();
  return useMemo(() => {
    const m = <T extends ConId>(xs: T[] | undefined, f: (x: T) => string) =>
      new Map((xs ?? []).map((x) => [x.id, f(x)]));
    const lotes = m(data?.lotes, (l) => `${l.codigo} · ${l.nombre}`);
    const plagas = m(data?.plagas, (p) => p.nombre);
    const usuarios = m(data?.usuarios, (u) => u.nombre);
    const trabajadores = m(data?.trabajadores, (t) => t.nombre);
    const cuadrillas = m(data?.cuadrillas, (c) => c.nombre);
    const tipos = m(data?.tiposLabor, (t) => t.nombre);
    const trampas = m(data?.trampas, (t) => t.codigo_qr.replace('KALO-TRAMPA:', ''));
    const colores = new Map((data?.colores ?? []).map((c) => [c.id, c]));
    return {
      lotes,
      plagas,
      usuarios,
      trabajadores,
      cuadrillas,
      tipos,
      trampas,
      colores,
      catalogos: data,
    };
  }, [data]);
}
