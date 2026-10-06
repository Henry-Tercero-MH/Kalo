/**
 * Registros repetidos antes de enviar: si un registro nuevo (aún no enviado) tiene los mismos
 * datos clave que otro del mismo día —ya enviado o anterior en la cola—, no se envía y se
 * descarta del teléfono. Pasa, por ejemplo, al guardar dos veces la misma labor sin señal.
 *
 * Solo se descartan registros con `_status = 'created'`: nunca llegaron al servidor, así que
 * quitarlos no deja nada a medias. Los editados (`updated`) siempre se envían.
 */
import type { NombreTabla } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import { coleccion, vivos } from '@/db/repositorio';
import {
  marcarDuplicados,
  REGLAS_DUPLICADOS,
  type Crudo,
  type Duplicado,
} from './duplicados-reglas';

export { REGLAS_DUPLICADOS, type Duplicado } from './duplicados-reglas';

/** Busca duplicados entre los registros pendientes de envío. */
export async function buscarDuplicados(): Promise<Duplicado[]> {
  const encontrados: Duplicado[] = [];
  for (const [tabla, columnas] of Object.entries(REGLAS_DUPLICADOS) as [
    NombreTabla,
    readonly string[],
  ][]) {
    const nuevos = await coleccion(tabla).query(vivos(), Q.where('_status', 'created')).fetch();
    if (nuevos.length === 0) continue;
    // Solo hace falta comparar con los días que tienen registros nuevos.
    const fechas = [...new Set(nuevos.map((r) => String((r._raw as unknown as Crudo).fecha)))];
    const delDia = await coleccion(tabla)
      .query(vivos(), Q.where('fecha', Q.oneOf(fechas)))
      .fetch();
    encontrados.push(
      ...marcarDuplicados(
        tabla,
        delDia.map((r) => r._raw as unknown as Crudo),
        columnas,
      ),
    );
  }
  return encontrados;
}

/** Quita del teléfono los duplicados (nunca se enviaron). Devuelve cuántos quitó. */
export async function descartarDuplicados(duplicados: Duplicado[]): Promise<number> {
  if (duplicados.length === 0) return 0;
  await database.write(async () => {
    const registros = await Promise.all(duplicados.map((d) => coleccion(d.tabla).find(d.id)));
    await database.batch(...registros.map((r) => r.prepareDestroyPermanently()));
  });
  return duplicados.length;
}
