/**
 * Carga datos ficticios (DEMO) para que el demo se vea completo.
 *   pnpm seed         → siembra si la base está vacía
 *   pnpm seed:reset   → borra todo y vuelve a sembrar
 */
import '../../lib/zona-horaria';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  areaHectareas,
  factoresDelAnio,
  fechaIso,
  hashGafete,
  inicioSemanaIso,
  MODULOS,
  PARAMETROS,
  PERMISOS_DECLARADOS,
  QR,
  recuadro,
  semanaIso,
  semanasEnAnio,
  sumarSemanas,
  type PoligonoGeoJson,
  type SemanaAnio,
} from '@kalo/shared';
import { sql } from 'drizzle-orm';
import { credencialesUsuario } from '../../modulos/admin';
import { crearBaseDatos, type BaseDatos } from '../cliente';
import * as e from '../esquema';
import { migrar } from '../migrar';
import {
  CENTRO_FINCA,
  CENTROS_COSTO_DEMO,
  COLORES_CINTA_EJEMPLO,
  FORMULARIO_MUESTREO,
  LABORES_DEMO,
  MOTIVOS_DEMO,
  PERMISOS_POR_ROL,
  PLAGAS_DEMO,
  ROLES_DEMO,
  USUARIOS_DEMO,
} from './datos';

const SEMANAS_REGISTROS = 8;
const SEMANAS_ENFUNDE = 20;
const ORIGEN = 'seed-DEMO';

/** Generador pseudoaleatorio con semilla (resultados reproducibles). */
function aleatorio(semilla = 20261005) {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = aleatorio();
const entre = (min: number, max: number) => min + azar() * (max - min);
const entero = (min: number, max: number) => Math.round(entre(min, max));

function comunes(fincaId: string | null, creadoPor: string | null, ms: number) {
  return {
    id: randomUUID(),
    created_at: ms,
    updated_at: ms,
    server_updated_at: Date.now(),
    device_id: ORIGEN,
    created_by: creadoPor,
    finca_id: fincaId,
  };
}

/** Polígono cuadrilátero levemente irregular (lotes ficticios). */
function poligonoLote(fila: number, columna: number): PoligonoGeoJson {
  const ancho = 0.0047; // ~ 500 m de este a oeste
  const alto = 0.0042; // ~ 465 m de norte a sur
  const x0 = CENTRO_FINCA.lng - ancho * 1.5 + columna * (ancho + 0.0004);
  const y0 = CENTRO_FINCA.lat + alto - fila * (alto + 0.0004);
  const j = () => entre(-0.0003, 0.0003);
  const p1: [number, number] = [x0 + j(), y0 + j()];
  return {
    type: 'Polygon',
    coordinates: [
      [
        p1,
        [x0 + ancho + j(), y0 + j()],
        [x0 + ancho + j(), y0 - alto + j()],
        [x0 + j(), y0 - alto + j()],
        p1,
      ],
    ],
  };
}

function puntoDentro(p: PoligonoGeoJson): { lat: number; lng: number } {
  const [minX, minY, maxX, maxY] = recuadro([p]);
  const m = 0.25;
  return {
    lng: minX + (maxX - minX) * entre(m, 1 - m),
    lat: minY + (maxY - minY) * entre(m, 1 - m),
  };
}

/** Milisegundos de un día de la semana ISO (0 = lunes) a cierta hora local aproximada. */
function momento(s: SemanaAnio, dia: number, hora = 8): number {
  const d = inicioSemanaIso(s.anio, s.numero);
  d.setUTCDate(d.getUTCDate() + dia);
  // Guatemala es UTC-6.
  d.setUTCHours(hora + 6, entero(0, 59), 0, 0);
  return d.getTime();
}
/** Fecha local de Guatemala (UTC-6) de una marca de tiempo. */
const fechaDe = (ms: number) => new Date(ms - 6 * 3_600_000).toISOString().slice(0, 10);

export async function sembrar(db: BaseDatos) {
  const ahora = Date.now();
  const semanaActual = semanaIso(new Date());

  // ─── Organización ────────────────────────────────────────────────────────
  const empresaId = randomUUID();
  await db
    .insert(e.empresas)
    .values({
      ...comunes(null, null, ahora),
      id: empresaId,
      nombre: 'Inversiones Kalo',
      codigo: 'KALO-DEMO',
    });

  const poligonos = Array.from({ length: 6 }, (_, i) => poligonoLote(Math.floor(i / 3), i % 3));
  const fincaId = randomUUID();
  await db.insert(e.fincas).values({
    ...comunes(null, null, ahora),
    id: fincaId,
    empresa_id: empresaId,
    nombre: 'Finca Demo',
    codigo: 'FINCA-DEMO',
    unidad_area: 'ha',
    centro_lat: CENTRO_FINCA.lat,
    centro_lng: CENTRO_FINCA.lng,
    bbox: recuadro(poligonos).map((v, i) => v + (i < 2 ? -0.003 : 0.003)),
  });

  const lotes = poligonos.map((poligono, i) => ({
    ...comunes(fincaId, null, ahora),
    codigo: String(i + 1).padStart(2, '0'),
    nombre: `Lote ${String(i + 1).padStart(2, '0')} DEMO`,
    hectareas: Math.round(areaHectareas(poligono) * 100) / 100,
    poblacion: 1600,
    poligono,
  }));
  await db.insert(e.lotes).values(lotes);

  // ─── Roles y permisos ────────────────────────────────────────────────────
  const permisos = PERMISOS_DECLARADOS.map((p) => ({
    ...comunes(null, null, ahora),
    codigo: p.codigo,
    modulo: p.modulo,
    accion: p.codigo.split(':')[1]!,
    descripcion: p.descripcion,
  }));
  await db.insert(e.permisos).values(permisos);
  const roles = ROLES_DEMO.map((r) => ({ ...comunes(null, null, ahora), ...r }));
  await db.insert(e.roles).values(roles);
  const rolPermisos = roles.flatMap((r) => {
    const asignados = PERMISOS_POR_ROL[r.codigo];
    return permisos
      .filter((p) => asignados === '*' || asignados.includes(p.codigo))
      .map((p) => ({ ...comunes(null, null, ahora), rol_id: r.id, permiso_id: p.id }));
  });
  await db.insert(e.rol_permisos).values(rolPermisos);

  // ─── Trabajadores, usuarios y cuadrillas ─────────────────────────────────
  const trabajadores = Array.from({ length: 16 }, (_, i) => ({
    ...comunes(fincaId, null, ahora),
    codigo: `T${String(i + 1).padStart(3, '0')}`,
    nombre: `Trabajador DEMO ${String(i + 1).padStart(2, '0')}`,
    // DPI de prueba (no reales): prefijo 0000.
    dpi: `0000 ${String(10001 + i).padStart(5, '0')} 0101`,
    // Centros de costo de prueba: la lista real la define la finca.
    centro_costo: CENTROS_COSTO_DEMO[i < 7 ? 0 : i < 14 ? 1 : 2]!,
    cuadrilla_id: null as string | null,
    activo: true,
  }));
  const usuarios = USUARIOS_DEMO.map((u) => ({
    ...comunes(fincaId, null, ahora),
    empresa_id: empresaId,
    usuario: u.usuario,
    nombre: u.nombre,
    rol_id: roles.find((r) => r.codigo === u.rol)!.id,
    ...credencialesUsuario(u.pin),
    gafete_hash: hashGafete(`${QR.gafete}DEMO-${u.usuario}`),
    trabajador_id: null as string | null,
    activo: true,
  }));
  const usuario = (codigo: string) => usuarios.find((u) => u.usuario === codigo)!;
  // La trabajadora del demo es también la primera trabajadora del listado.
  trabajadores[0]!.nombre = 'Teresa Trabajadora (DEMO)';
  usuario('trabajador').trabajador_id = trabajadores[0]!.id;

  const cuadrillas = ['Cuadrilla A DEMO', 'Cuadrilla B DEMO'].map((nombre) => ({
    ...comunes(fincaId, null, ahora),
    nombre,
    caporal_id: usuario('caporal').id,
  }));
  trabajadores.forEach((t, i) => (t.cuadrilla_id = cuadrillas[i < 8 ? 0 : 1]!.id));
  await db.insert(e.trabajadores).values(trabajadores);
  await db.insert(e.usuarios).values(usuarios);
  await db.insert(e.cuadrillas).values(cuadrillas);
  await db
    .insert(e.cuadrilla_miembros)
    .values(
      trabajadores.map((t) => ({
        ...comunes(fincaId, null, ahora),
        cuadrilla_id: t.cuadrilla_id!,
        trabajador_id: t.id,
      })),
    );

  // ─── Calendario: colores de cinta y semanas ──────────────────────────────
  const colores = COLORES_CINTA_EJEMPLO.map((c, i) => ({
    ...comunes(fincaId, null, ahora),
    ...c,
    orden: i + 1,
    pendiente_confirmar: true,
  }));
  await db.insert(e.colores_cinta).values(colores);
  const colorDe = (s: SemanaAnio) => {
    // Ciclo continuo de colores a partir de una semana de referencia.
    const indice = (s.anio * 53 + s.numero) % colores.length;
    return colores[indice]!;
  };
  const semanas = [];
  for (const anio of [semanaActual.anio - 1, semanaActual.anio, semanaActual.anio + 1]) {
    const total = semanasEnAnio(anio);
    const factores = factoresDelAnio(total);
    for (let numero = 1; numero <= total; numero++) {
      const inicio = inicioSemanaIso(anio, numero);
      const fin = new Date(inicio);
      fin.setUTCDate(fin.getUTCDate() + 6);
      semanas.push({
        ...comunes(fincaId, null, ahora),
        anio,
        numero,
        fecha_inicio: inicio.toISOString().slice(0, 10),
        fecha_fin: fin.toISOString().slice(0, 10),
        color_cinta_id: colorDe({ anio, numero }).id,
        factor: factores.get(numero)!,
      });
    }
  }
  await db.insert(e.semanas).values(semanas);

  // ─── Catálogos ───────────────────────────────────────────────────────────
  const plagas = PLAGAS_DEMO.map((p) => ({ ...comunes(fincaId, null, ahora), ...p, activo: true }));
  await db.insert(e.plagas).values(plagas);
  const tiposLabor = LABORES_DEMO.map((l) => ({
    ...comunes(fincaId, null, ahora),
    ...l,
    tarifa: null,
    activo: true,
  }));
  await db.insert(e.tipos_labor).values(tiposLabor);
  const trampas = Array.from({ length: 10 }, (_, i) => {
    const lote = lotes[i % lotes.length]!;
    const p = puntoDentro(lote.poligono);
    return {
      ...comunes(fincaId, null, ahora),
      lote_id: lote.id,
      codigo_qr: `${QR.trampa}T${String(i + 1).padStart(2, '0')}`,
      nombre: `Trampa T${String(i + 1).padStart(2, '0')} DEMO`,
      ...p,
      activa: true,
    };
  });
  await db.insert(e.trampas).values(trampas);

  await db.insert(e.parametros).values([
    ...Object.values(PARAMETROS).map((p) => ({
      ...comunes(fincaId, null, ahora),
      clave: p.clave,
      valor: p.valor as object,
      descripcion: p.descripcion,
      pendiente: p.pendiente,
    })),
    {
      ...comunes(fincaId, null, ahora),
      clave: 'datos_demo',
      valor: true,
      descripcion: 'La base contiene datos ficticios marcados como DEMO',
      pendiente: false,
    },
    {
      ...comunes(fincaId, null, ahora),
      clave: 'colores_cinta_pendientes',
      valor: true,
      descripcion: 'Los colores reales del ciclo de cintas están pendientes de confirmar',
      pendiente: true,
    },
  ]);
  await db
    .insert(e.modulos)
    .values(
      MODULOS.map((m) => ({
        ...comunes(null, null, ahora),
        codigo: m.codigo,
        nombre: m.nombre,
        activo: m.estado === 'activo',
        orden: m.orden,
      })),
    );
  const formularioId = randomUUID();
  await db.insert(e.definiciones_formulario).values({
    ...comunes(null, null, ahora),
    id: formularioId,
    codigo: FORMULARIO_MUESTREO.codigo,
    version: FORMULARIO_MUESTREO.version,
    titulo: FORMULARIO_MUESTREO.titulo,
    definicion: FORMULARIO_MUESTREO,
    activo: true,
  });

  // ─── Registros simulados ─────────────────────────────────────────────────
  const tecnico = usuario('tecnico').id;
  const caporal = usuario('caporal').id;
  const muestreos: (typeof e.muestreos.$inferInsert)[] = [];
  const preavisos: (typeof e.preaviso_sigatoka.$inferInsert)[] = [];
  const lecturas: (typeof e.lecturas_trampa.$inferInsert)[] = [];
  const enfundes: (typeof e.enfunde.$inferInsert)[] = [];
  const cosechas: (typeof e.cosecha.$inferInsert)[] = [];
  const labores: (typeof e.labores.$inferInsert)[] = [];
  const asistencia: (typeof e.asistencia.$inferInsert)[] = [];
  const rutas: (typeof e.rutas.$inferInsert)[] = [];
  const puntos: (typeof e.puntos_ruta.$inferInsert)[] = [];
  const sigatoka = plagas.find((p) => p.codigo === 'sigatoka_negra')!;

  for (let w = SEMANAS_ENFUNDE; w >= 1; w--) {
    const s = sumarSemanas(semanaActual, -w);
    const color = colorDe(s);
    for (const lote of lotes) {
      // Enfunde semanal: plantas × retorno / 52 aprox. (ficticio).
      const racimosSemana = Math.round((lote.poblacion * lote.hectareas * entre(1.7, 1.95)) / 52);
      const ms = momento(s, 1, 9);
      const p = puntoDentro(lote.poligono);
      enfundes.push({
        ...comunes(fincaId, caporal, ms),
        ...p,
        precision_gps: entre(3, 12),
        hora_gps: ms,
        lote_id: lote.id,
        fecha: fechaDe(ms),
        anio: s.anio,
        semana: s.numero,
        color_cinta_id: color.id,
        racimos: racimosSemana,
        cuadrilla_id: cuadrillas[0]!.id,
        trabajador_id: null,
      });
    }
  }

  for (let w = SEMANAS_REGISTROS; w >= 1; w--) {
    const s = sumarSemanas(semanaActual, -w);
    const tendencia = (SEMANAS_REGISTROS - w) / SEMANAS_REGISTROS;
    lotes.forEach((lote, li) => {
      // Muestreos: 3 plagas por lote y semana; el lote 04 empeora con sigatoka (para el mapa).
      for (const plaga of plagas
        .filter((x) => x.codigo !== 'fusarium_r4t')
        .slice(0, 3 + (li % 2))) {
        const ms = momento(s, 2, 8 + li);
        const base = plaga.umbral_alerta * entre(0.15, 0.7);
        const incidencia =
          plaga.id === sigatoka.id && li === 3
            ? plaga.umbral_alerta * (0.8 + tendencia * 0.6)
            : base;
        const revisadas = 50;
        const afectadas = Math.min(revisadas, Math.round((incidencia / 100) * revisadas));
        muestreos.push({
          ...comunes(fincaId, tecnico, ms),
          ...puntoDentro(lote.poligono),
          precision_gps: entre(3, 15),
          hora_gps: ms,
          lote_id: lote.id,
          plaga_id: plaga.id,
          fecha: fechaDe(ms),
          incidencia: Math.round(incidencia * 10) / 10,
          severidad:
            incidencia >= plaga.umbral_alerta
              ? 'alta'
              : incidencia >= plaga.umbral_alerta / 2
                ? 'media'
                : 'baja',
          respuestas: {
            plantas_revisadas: revisadas,
            plantas_afectadas: afectadas,
            severidad: 'baja',
            dano_fruta: false,
          },
          formulario_id: formularioId,
          formulario_version: 1,
          notas: 'DEMO',
        });
      }
      const msp = momento(s, 3, 10);
      preavisos.push({
        ...comunes(fincaId, tecnico, msp),
        ...puntoDentro(lote.poligono),
        precision_gps: entre(3, 10),
        hora_gps: msp,
        lote_id: lote.id,
        fecha: fechaDe(msp),
        anio: s.anio,
        semana: s.numero,
        plantas_muestreadas: 10,
        hoja_mas_joven_enferma: Math.round(entre(5, 9) * 10) / 10,
        estado_evolucion: Math.round(entre(200, 1400)),
        severidad: Math.round(entre(5, 25) * 10) / 10,
        notas: 'DEMO',
      });

      // Cosecha de la cohorte enfundada 12 semanas antes.
      const cohorte = sumarSemanas(s, -12);
      const enfunde = enfundes.find(
        (x) => x.lote_id === lote.id && x.anio === cohorte.anio && x.semana === cohorte.numero,
      );
      if (enfunde) {
        const msc = momento(s, 4, 7);
        const perdidos = entero(0, Math.round(enfunde.racimos * 0.03));
        cosechas.push({
          ...comunes(fincaId, caporal, msc),
          ...puntoDentro(lote.poligono),
          precision_gps: entre(3, 10),
          hora_gps: msc,
          lote_id: lote.id,
          fecha: fechaDe(msc),
          anio: s.anio,
          semana: s.numero,
          color_cinta_id: enfunde.color_cinta_id,
          racimos_cosechados: Math.round(enfunde.racimos * entre(0.95, 0.985)) - perdidos,
          racimos_perdidos: perdidos,
          motivo_perdida: perdidos > 0 ? 'Viento / caída (DEMO)' : null,
          cuadrilla_id: cuadrillas[1]!.id,
          estado_validacion: w > 2 ? 'validado' : 'pendiente',
          validado_por: w > 2 ? usuario('supervisor').id : null,
          validado_en: w > 2 ? msc + 86_400_000 : null,
          motivo_rechazo: null,
        });
      }
    });

    for (const t of trampas) {
      const ms = momento(s, 1, 14);
      lecturas.push({
        ...comunes(fincaId, tecnico, ms),
        lat: t.lat,
        lng: t.lng,
        precision_gps: entre(3, 8),
        hora_gps: ms,
        trampa_id: t.id,
        lote_id: t.lote_id,
        fecha: fechaDe(ms),
        cantidad: entero(0, 18),
        notas: null,
      });
    }

    // Asistencia de lunes a viernes y labores por trabajador.
    for (let dia = 0; dia < 5; dia++) {
      for (const t of trabajadores) {
        const ms = momento(s, dia, 6);
        const presente = azar() > 0.08;
        asistencia.push({
          ...comunes(fincaId, caporal, ms),
          lat: CENTRO_FINCA.lat,
          lng: CENTRO_FINCA.lng,
          precision_gps: 8,
          hora_gps: ms,
          trabajador_id: t.id,
          cuadrilla_id: t.cuadrilla_id,
          fecha: fechaDe(ms),
          presente,
          hora_entrada: presente ? ms : null,
          centro_costo: t.centro_costo,
          motivo_ausencia: presente ? null : MOTIVOS_DEMO[entero(0, MOTIVOS_DEMO.length - 1)]!,
          nota_ausencia: null,
        });
        if (!presente || dia % 2 === 1) continue;
        const tipo = tiposLabor[entero(1, 4)]!;
        const lote = lotes[entero(0, lotes.length - 1)]!;
        const msl = momento(s, dia, 13);
        labores.push({
          ...comunes(fincaId, caporal, msl),
          ...puntoDentro(lote.poligono),
          precision_gps: entre(3, 12),
          hora_gps: msl,
          tipo_labor_id: tipo.id,
          lote_id: lote.id,
          trabajador_id: t.id,
          cuadrilla_id: t.cuadrilla_id,
          fecha: fechaDe(msl),
          cantidad:
            tipo.unidad === 'hectareas' ? Math.round(entre(0.5, 2) * 10) / 10 : entero(60, 180),
          notas: null,
          estado_validacion: w > 2 ? 'validado' : 'pendiente',
          validado_por: w > 2 ? usuario('supervisor').id : null,
          validado_en: w > 2 ? msl + 86_400_000 : null,
          motivo_rechazo: null,
        });
      }
    }

    // Recorrido GPS del técnico por dos lotes (zigzag dentro del lote).
    agregarRecorridos(
      s,
      [lotes[(SEMANAS_REGISTROS - w) % 6]!, lotes[(SEMANAS_REGISTROS - w + 3) % 6]!],
      2,
    );
  }

  // Recorridos de la semana actual (lunes) para que el mapa muestre cobertura vigente.
  agregarRecorridos(semanaActual, [lotes[0]!, lotes[3]!], 0);

  function agregarRecorridos(s: SemanaAnio, lotesRuta: typeof lotes, dia: number) {
    for (const lote of lotesRuta) {
      const inicio = Math.min(momento(s, dia, 7), Date.now() - 3_600_000);
      const rutaId = randomUUID();
      const [minX, minY, maxX, maxY] = recuadro([lote.poligono]);
      const pasadas = 6;
      const pts: { lat: number; lng: number }[] = [];
      for (let k = 0; k < pasadas; k++) {
        const lat = minY + ((maxY - minY) * (k + 0.5)) / pasadas;
        const ida = k % 2 === 0;
        for (let q = 0; q <= 12; q++) {
          const f = 0.08 + (0.84 * q) / 12;
          pts.push({
            lat: lat + entre(-0.00004, 0.00004),
            lng: ida ? minX + (maxX - minX) * f : maxX - (maxX - minX) * f,
          });
        }
      }
      pts.forEach((p, k) =>
        puntos.push({
          ...comunes(fincaId, tecnico, inicio + k * 20_000),
          ruta_id: rutaId,
          lat: p.lat,
          lng: p.lng,
          precision_gps: entre(3, 12),
          hora_gps: inicio + k * 20_000,
          secuencia: k,
        }),
      );
      rutas.push({
        ...comunes(fincaId, tecnico, inicio),
        id: rutaId,
        usuario_id: tecnico,
        orden_trabajo_id: null,
        lote_id: lote.id,
        tarea: 'Muestreo de plagas',
        inicio,
        fin: inicio + pts.length * 20_000,
        estado: 'finalizada',
        distancia_m: Math.round(pts.length * 40),
        puntos: pts.length,
      });
    }
  }

  const insertarEnLotes = async <T>(tabla: Parameters<BaseDatos['insert']>[0], filas: T[]) => {
    for (let i = 0; i < filas.length; i += 500) {
      await db.insert(tabla).values(filas.slice(i, i + 500) as never);
    }
  };
  await insertarEnLotes(e.muestreos, muestreos);
  await insertarEnLotes(e.preaviso_sigatoka, preavisos);
  await insertarEnLotes(e.lecturas_trampa, lecturas);
  await insertarEnLotes(e.enfunde, enfundes);
  await insertarEnLotes(e.cosecha, cosechas);
  await insertarEnLotes(e.asistencia, asistencia);
  await insertarEnLotes(e.labores, labores);
  await insertarEnLotes(e.rutas, rutas);
  await insertarEnLotes(e.puntos_ruta, puntos);

  // Alertas de Fusarium en estado «Sospecha».
  const msf = momento(sumarSemanas(semanaActual, -1), 3, 11);
  await db.insert(e.alertas_fusarium).values({
    ...comunes(fincaId, usuario('trabajador').id, msf),
    ...puntoDentro(lotes[4]!.poligono),
    precision_gps: 6,
    hora_gps: msf,
    lote_id: lotes[4]!.id,
    fecha: fechaDe(msf),
    sintomas: ['amarillamiento_hojas_viejas', 'marchitez'],
    estado: 'sospecha',
    notas: 'Reporte DEMO',
    estado_validacion: 'pendiente',
  });

  // Órdenes de trabajo de la semana.
  const hoy = fechaIso();
  await db.insert(e.ordenes_trabajo).values([
    {
      ...comunes(fincaId, usuario('supervisor').id, ahora),
      titulo: 'Muestreo semanal de sigatoka — Lote 04 (DEMO)',
      descripcion: 'Revisar 50 plantas y registrar preaviso.',
      modulo: 'plagas',
      lote_id: lotes[3]!.id,
      asignado_a: tecnico,
      asignado_por: usuario('supervisor').id,
      fecha: hoy,
      estado: 'pendiente',
    },
    {
      ...comunes(fincaId, usuario('supervisor').id, ahora),
      titulo: 'Lectura de trampas T01–T10 (DEMO)',
      descripcion: null,
      modulo: 'trampas',
      lote_id: null,
      asignado_a: tecnico,
      asignado_por: usuario('supervisor').id,
      fecha: hoy,
      estado: 'pendiente',
    },
    {
      ...comunes(fincaId, usuario('supervisor').id, ahora),
      titulo: 'Enfunde Lote 02 (DEMO)',
      descripcion: 'Cinta de la semana.',
      modulo: 'enfunde',
      lote_id: lotes[1]!.id,
      asignado_a: caporal,
      asignado_por: usuario('supervisor').id,
      fecha: hoy,
      estado: 'pendiente',
    },
    {
      ...comunes(fincaId, usuario('supervisor').id, ahora),
      titulo: 'Deshoje Lote 01 (DEMO)',
      descripcion: null,
      modulo: 'labores',
      lote_id: lotes[0]!.id,
      asignado_a: usuario('trabajador').id,
      asignado_por: usuario('supervisor').id,
      fecha: hoy,
      estado: 'pendiente',
    },
  ]);

  return {
    fincaId,
    lotes: lotes.length,
    muestreos: muestreos.length,
    enfundes: enfundes.length,
    cosechas: cosechas.length,
    puntos: puntos.length,
    puntosIds: puntos.map((p) => p.id!),
  };
}

export async function vaciar(db: BaseDatos) {
  const tablas = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'spatial_ref_sys'`,
  );
  const nombres = [...tablas].map((t) => `"${t.tablename}"`).join(', ');
  if (nombres) await db.execute(sql.raw(`TRUNCATE ${nombres} CASCADE`));
}

async function principal() {
  const url = process.env.DATABASE_URL ?? 'postgres://kalo:kalo_demo@localhost:5432/kalo_campo';
  const reset = process.argv.includes('--reset');
  await migrar(url);
  const { db, cliente } = crearBaseDatos(url);
  try {
    const [{ n }] = (await db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM empresas`,
    )) as unknown as [{ n: number }];
    if (Number(n) > 0 && !reset) {
      console.info('La base ya tiene datos. Use «pnpm seed:reset» para borrar y volver a sembrar.');
      return;
    }
    if (reset) {
      await vaciar(db);
      console.info('Base vaciada.');
    }
    const r = await sembrar(db);
    console.info('Calculando cobertura de las rutas sembradas…');
    const { recalcularPorPuntos } = await import('../../cobertura/servicio');
    await recalcularPorPuntos(db, r.puntosIds);
    console.info(
      `Datos DEMO cargados: ${r.lotes} lotes, ${r.muestreos} muestreos, ${r.enfundes} enfundes, ${r.cosechas} cosechas, ${r.puntos} puntos GPS.`,
    );
  } finally {
    await cliente.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  principal().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
