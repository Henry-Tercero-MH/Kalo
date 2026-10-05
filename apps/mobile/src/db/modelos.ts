/**
 * Modelos de WatermelonDB generados desde el registro.
 *
 * En lugar de una clase con decoradores por tabla, cada modelo expone su fila cruda tipada
 * (`fila`). Así agregar una tabla nueva no exige escribir un modelo: basta con el registro.
 * Ver docs/decisiones.md.
 */
import { NOMBRES_TABLAS, type Fila, type NombreTabla } from '@kalo/shared';
import { Model } from '@nozbe/watermelondb';

export class ModeloBase<T extends NombreTabla = NombreTabla> extends Model {
  /** Fila con las columnas del registro (JSON como string, fechas en ms). */
  get fila(): Fila<T> {
    return this._raw as unknown as Fila<T>;
  }
}

export const MODELOS = NOMBRES_TABLAS.map((tabla) => {
  const Clase = class extends ModeloBase {
    static override table = tabla;
  };
  Object.defineProperty(Clase, 'name', { value: `Modelo_${tabla}` });
  return Clase;
});
