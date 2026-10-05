import {
  columnasDesdeRespuestas,
  fechaIso,
  semanaIso,
  type DefinicionFormulario,
  type Respuestas,
} from '@kalo/shared';
import { crear, type ContextoEscritura } from '@/db/repositorio';
import { columnasGps, type Ubicacion } from '@/gps/ubicacion';
import { adjuntarArchivos, type ArchivoLocal } from '@/utils/archivos';

/** Incidencia (%) = plantas afectadas / plantas revisadas. */
export function calcularIncidencia(r: Respuestas): number {
  const revisadas = Number(r.plantas_revisadas ?? 0);
  const afectadas = Number(r.plantas_afectadas ?? 0);
  if (!revisadas) return 0;
  return Math.round(Math.min(100, (afectadas / revisadas) * 100) * 10) / 10;
}

export async function guardarMuestreo(
  d: {
    loteId: string;
    plagaId: string;
    definicion: DefinicionFormulario;
    formularioId: string | null;
    respuestas: Respuestas;
    ubicacion: Ubicacion | null;
    fotos: ArchivoLocal[];
    notaVoz: ArchivoLocal | null;
    notas: string;
  },
  ctx: ContextoEscritura,
) {
  const columnas = columnasDesdeRespuestas(d.definicion, d.respuestas);
  const severidad = ['baja', 'media', 'alta'].includes(String(columnas.severidad))
    ? (columnas.severidad as 'baja' | 'media' | 'alta')
    : 'baja';
  const registro = await crear(
    'muestreos',
    {
      lote_id: d.loteId,
      plaga_id: d.plagaId,
      fecha: fechaIso(),
      incidencia:
        typeof columnas.incidencia === 'number'
          ? columnas.incidencia
          : calcularIncidencia(d.respuestas),
      severidad,
      respuestas: JSON.stringify(d.respuestas),
      formulario_id: d.formularioId,
      // Cada registro guarda la versión del formulario con que se creó.
      formulario_version: d.definicion.version,
      notas: d.notas.trim() || null,
      ...columnasGps(d.ubicacion),
    },
    ctx,
  );
  await adjuntarArchivos(
    [...d.fotos, ...(d.notaVoz ? [d.notaVoz] : [])],
    { tabla: 'muestreos', id: registro.id },
    ctx,
  );
  return registro;
}

export async function guardarPreaviso(
  d: {
    loteId: string;
    plantas: number;
    hmje: number;
    ee: number;
    severidad: number;
    notas: string;
    ubicacion: Ubicacion | null;
  },
  ctx: ContextoEscritura,
) {
  const s = semanaIso(new Date());
  return crear(
    'preaviso_sigatoka',
    {
      lote_id: d.loteId,
      fecha: fechaIso(),
      anio: s.anio,
      semana: s.numero,
      plantas_muestreadas: d.plantas,
      hoja_mas_joven_enferma: d.hmje,
      estado_evolucion: d.ee,
      severidad: d.severidad,
      notas: d.notas.trim() || null,
      ...columnasGps(d.ubicacion),
    },
    ctx,
  );
}
