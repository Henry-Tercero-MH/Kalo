import { z } from 'zod';
import { columnasDe } from './columnas';
import { type NombreTabla } from './registro';
import type { DefColumna } from './tipos';

function zodColumna(c: DefColumna): z.ZodType {
  let base: z.ZodType;
  switch (c.tipo) {
    case 'numero': {
      let n = z.number().finite();
      if (c.entero) n = n.int();
      if (c.min !== undefined) n = n.min(c.min);
      if (c.max !== undefined) n = n.max(c.max);
      base = n;
      break;
    }
    case 'booleano':
      base = z.boolean();
      break;
    case 'json':
      base = z.string().refine(
        (v) => {
          try {
            JSON.parse(v);
            return true;
          } catch {
            return false;
          }
        },
        { message: 'JSON inválido' },
      );
      break;
    default:
      base = c.valores ? z.enum(c.valores as [string, ...string[]]) : z.string().max(10_000);
  }
  return c.opcional ? base.nullable().optional() : base;
}

const cache = new Map<NombreTabla, z.ZodObject>();

/**
 * Esquema Zod de una fila cruda de la tabla, generado desde el registro.
 * Los campos desconocidos (`_status`, `_changed`, columnas locales) se descartan.
 */
export function esquemaFila(tabla: NombreTabla): z.ZodObject {
  const enCache = cache.get(tabla);
  if (enCache) return enCache;
  const forma: Record<string, z.ZodType> = { id: z.string().min(1).max(64) };
  for (const [nombre, col] of Object.entries(columnasDe(tabla))) {
    forma[nombre] = zodColumna(col);
  }
  const esquema = z.object(forma);
  cache.set(tabla, esquema);
  return esquema;
}
