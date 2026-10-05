/**
 * Hooks reactivos: la interfaz se actualiza sola cuando cambia la base local
 * (incluido lo que llega al sincronizar).
 */
import type { Fila, NombreTabla } from '@kalo/shared';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import { useEffect, useMemo, useState } from 'react';
import { coleccion, vivos } from './repositorio';

export function useConsulta<T extends NombreTabla>(
  tabla: T,
  condiciones: Clause[] = [],
  dependencias: unknown[] = [],
): Fila<T>[] {
  const [filas, setFilas] = useState<Fila<T>[]>([]);
  const query = useMemo(
    () => coleccion(tabla).query(vivos(), ...condiciones),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabla, ...dependencias],
  );
  useEffect(() => {
    // observeWithColumns: también reacciona a cambios de valores, no solo altas/bajas.
    const sub = query.observeWithColumns(['updated_at', 'server_updated_at', 'deleted_at']).subscribe((rs) =>
      setFilas(rs.map((r) => r.fila as Fila<T>)),
    );
    return () => sub.unsubscribe();
  }, [query]);
  return filas;
}

export function useConteo(tabla: NombreTabla, condiciones: Clause[] = [], dependencias: unknown[] = []): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const sub = coleccion(tabla)
      .query(vivos(), ...condiciones)
      .observeCount()
      .subscribe(setN);
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabla, ...dependencias]);
  return n;
}
