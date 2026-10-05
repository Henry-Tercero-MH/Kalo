import { leerParametro as leer, type ClaveParametro, type ValorParametro } from '@kalo/shared';

export interface ParametroFila {
  clave: string;
  valor: unknown;
}

/** Lee un parámetro (jsonb ya parseado) con respaldo al valor por defecto. */
export function leerParametro<K extends ClaveParametro>(
  filas: readonly ParametroFila[],
  clave: K,
): ValorParametro<K> {
  return leer(
    filas.map((f) => ({ clave: f.clave, valor: JSON.stringify(f.valor) })),
    clave,
  );
}
