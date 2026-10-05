/**
 * Motor de formularios dinámicos.
 *
 * Las definiciones viven en `definiciones_formulario` (JSON versionado) y se descargan al
 * sincronizar: agregar un campo NO requiere publicar una versión nueva de la app.
 * Cada registro guarda la versión del formulario con la que se creó.
 */
import { z } from 'zod';

export const TIPOS_CAMPO = [
  'opcion',
  'multiopcion',
  'numero',
  'entero',
  'texto',
  'booleano',
  'escala',
] as const;

const esquemaOpcion = z.object({ valor: z.string().min(1), etiqueta: z.string().min(1) });

const esquemaCondicion = z.object({
  campo: z.string().min(1),
  /** Se muestra si el campo es igual a alguno de estos valores. */
  igualA: z.array(z.union([z.string(), z.number(), z.boolean()])).min(1),
});

export const esquemaCampo = z
  .object({
    id: z
      .string()
      .regex(/^[a-z][a-z0-9_]*$/, 'Use minúsculas, números y guion bajo (p. ej. hojas_afectadas)'),
    tipo: z.enum(TIPOS_CAMPO),
    etiqueta: z.string().min(1),
    ayuda: z.string().optional(),
    requerido: z.boolean().default(false),
    opciones: z.array(esquemaOpcion).optional(),
    /** Fuente de opciones dinámicas: catálogo sincronizado. */
    catalogo: z.enum(['plagas', 'lotes']).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    unidad: z.string().optional(),
    visibleSi: esquemaCondicion.optional(),
    /** Columna del registro donde además se copia el valor (p. ej. `incidencia`). */
    columna: z.string().optional(),
  })
  .superRefine((c, ctx) => {
    if ((c.tipo === 'opcion' || c.tipo === 'multiopcion') && !c.opciones?.length && !c.catalogo) {
      ctx.addIssue({ code: 'custom', message: `El campo ${c.id} necesita opciones o catálogo` });
    }
    if (c.tipo === 'escala' && (c.min === undefined || c.max === undefined)) {
      ctx.addIssue({ code: 'custom', message: `La escala ${c.id} necesita min y max` });
    }
  });

export const esquemaDefinicionFormulario = z
  .object({
    codigo: z.string().min(1),
    version: z.number().int().positive(),
    titulo: z.string().min(1),
    campos: z.array(esquemaCampo).min(1),
  })
  .superRefine((d, ctx) => {
    const ids = new Set<string>();
    for (const c of d.campos) {
      if (ids.has(c.id)) ctx.addIssue({ code: 'custom', message: `Campo repetido: ${c.id}` });
      if (c.visibleSi && !ids.has(c.visibleSi.campo)) {
        ctx.addIssue({
          code: 'custom',
          message: `La condición de ${c.id} debe referirse a un campo anterior`,
        });
      }
      ids.add(c.id);
    }
  });

export type CampoFormulario = z.infer<typeof esquemaCampo>;
export type DefinicionFormulario = z.infer<typeof esquemaDefinicionFormulario>;
export type ValorRespuesta = string | number | boolean | string[] | null;
export type Respuestas = Record<string, ValorRespuesta>;

export function esVisible(campo: CampoFormulario, respuestas: Respuestas): boolean {
  if (!campo.visibleSi) return true;
  const valor = respuestas[campo.visibleSi.campo];
  if (Array.isArray(valor)) return valor.some((v) => campo.visibleSi!.igualA.includes(v));
  return valor !== null && valor !== undefined && campo.visibleSi.igualA.includes(valor);
}

export function camposVisibles(def: DefinicionFormulario, respuestas: Respuestas) {
  return def.campos.filter((c) => esVisible(c, respuestas));
}

export function estaVacio(v: ValorRespuesta | undefined): boolean {
  return v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
}

/** Valida una respuesta individual; devuelve el mensaje de error o null. */
export function validarCampo(c: CampoFormulario, v: ValorRespuesta | undefined): string | null {
  if (estaVacio(v)) return c.requerido ? 'Este dato es obligatorio' : null;
  switch (c.tipo) {
    case 'numero':
    case 'entero':
    case 'escala': {
      if (typeof v !== 'number' || !Number.isFinite(v)) return 'Ingrese un número';
      if (c.tipo === 'entero' && !Number.isInteger(v)) return 'Ingrese un número entero';
      if (c.min !== undefined && v < c.min) return `El mínimo es ${c.min}`;
      if (c.max !== undefined && v > c.max) return `El máximo es ${c.max}`;
      return null;
    }
    case 'booleano':
      return typeof v === 'boolean' ? null : 'Seleccione Sí o No';
    case 'multiopcion':
      if (!Array.isArray(v)) return 'Seleccione al menos una opción';
      if (c.opciones && v.some((x) => !c.opciones!.some((o) => o.valor === x))) {
        return 'Opción no válida';
      }
      return null;
    case 'opcion':
      if (typeof v !== 'string') return 'Seleccione una opción';
      if (c.opciones && !c.opciones.some((o) => o.valor === v)) return 'Opción no válida';
      return null;
    default:
      return typeof v === 'string' ? null : 'Texto no válido';
  }
}

/** Valida todas las respuestas visibles. Devuelve un mapa campo → error. */
export function validarRespuestas(
  def: DefinicionFormulario,
  respuestas: Respuestas,
): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const c of camposVisibles(def, respuestas)) {
    const e = validarCampo(c, respuestas[c.id]);
    if (e) errores[c.id] = e;
  }
  return errores;
}

/** Quita respuestas de campos ocultos (para no guardar datos inconsistentes). */
export function limpiarRespuestas(def: DefinicionFormulario, respuestas: Respuestas): Respuestas {
  const visibles = new Set(camposVisibles(def, respuestas).map((c) => c.id));
  return Object.fromEntries(Object.entries(respuestas).filter(([k]) => visibles.has(k)));
}

/** Valores que el formulario copia a columnas del registro (p. ej. incidencia, severidad). */
export function columnasDesdeRespuestas(
  def: DefinicionFormulario,
  respuestas: Respuestas,
): Record<string, ValorRespuesta> {
  const salida: Record<string, ValorRespuesta> = {};
  for (const c of def.campos) {
    if (c.columna && respuestas[c.id] !== undefined) salida[c.columna] = respuestas[c.id]!;
  }
  return salida;
}
