#!/usr/bin/env node
/**
 * Graba los fixtures del modo demo del panel (apps/web/src/mock/datos/*.json) desde la API real.
 *
 * Uso (con la API levantada y los datos DEMO sembrados):
 *   node apps/web/scripts/grabar-mock.mjs [--api http://localhost:4000] [--sin-actividad] [--forzar-actividad]
 *
 * Antes de grabar, si la bandeja de conflictos está vacía, genera actividad realista contra la API:
 * registra dos celulares (con el supervisor), sube una cosecha nueva y dos ediciones concurrentes
 * de esa cosecha desde los dos celulares, para que aparezca un conflicto de sincronización.
 *
 * Todos los datos grabados son de DEMOSTRACIÓN (DEMO): no corresponden a producción real.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opcion = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
};
const API = (opcion('--api') ?? process.env.API_URL_INTERNA ?? 'http://localhost:4000').replace(
  /\/$/,
  '',
);
const SIN_ACTIVIDAD = args.includes('--sin-actividad');
const FORZAR_ACTIVIDAD = args.includes('--forzar-actividad');
const DESTINO = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'mock', 'datos');

/** Usuarios DEMO del panel (los PIN están en el README; son ficticios). */
const USUARIOS_PANEL = { admin: '1111', gerente: '2222', supervisor: '3333' };

async function pedir(ruta, { token, metodo = 'GET', cuerpo, binario = false } = {}) {
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  if (!r.ok) {
    const texto = await r.text().catch(() => '');
    throw new Error(`${metodo} ${ruta} → ${r.status} ${texto.slice(0, 300)}`);
  }
  return binario ? Buffer.from(await r.arrayBuffer()) : r.json();
}

const login = (usuario, pin) =>
  pedir('/v1/auth/login', { metodo: 'POST', cuerpo: { usuario, pin } });

function guardar(nombre, datos) {
  const ruta = join(DESTINO, nombre);
  writeFileSync(ruta, `${JSON.stringify(datos, null, 1)}\n`);
  console.log(`  ✓ ${nombre} (${(JSON.stringify(datos).length / 1024).toFixed(1)} KB)`);
}

/** Semana ISO (misma regla que @kalo/shared). */
function semanaIso(fecha) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return {
    anio: d.getUTCFullYear(),
    numero: Math.ceil(((d.getTime() - inicio.getTime()) / 86_400_000 + 1) / 7),
  };
}
const fechaIso = (f = new Date()) =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

/** Dos celulares, una cosecha nueva y dos ediciones concurrentes → un conflicto en la bandeja. */
async function generarActividad(supervisor) {
  console.log('Generando actividad DEMO (2 celulares, 1 cosecha, 1 conflicto)…');
  // La cosecha la registra un caporal (el supervisor no tiene cosecha:crear); el celular
  // lo configura el supervisor y lo comparten varios usuarios, como en campo.
  const caporal = await login('caporal', '5555');
  const registrar = (nombre, modelo) =>
    pedir('/v1/dispositivos/registrar', {
      token: supervisor.accessToken,
      metodo: 'POST',
      cuerpo: {
        id: randomUUID(),
        nombre,
        modelo,
        sistema: 'Android 14',
        versionApp: '0.1.0',
        claveRespaldo: randomBytes(32).toString('hex'),
      },
    });
  const a = await registrar('Celular cuadrilla 1 (DEMO)', 'Samsung Galaxy A15');
  const b = await registrar('Celular cuadrilla 2 (DEMO)', 'Motorola Moto G24');
  const pull = (d, desde) =>
    pedir(`/v1/sync/pull?last_pulled_at=${desde ?? 'null'}`, { token: d.accessToken });
  const push = (d, changes, lastPulledAt, estado) =>
    pedir('/v1/sync/push', {
      token: d.accessToken,
      metodo: 'POST',
      cuerpo: { changes, lastPulledAt, ...(estado ? { estado } : {}) },
    });

  const pa = await pull(a, null);
  const pb = await pull(b, null);
  const lote = pa.changes.lotes.created[0];
  const color = pa.changes.colores_cinta.created[0];
  const s = semanaIso(new Date());
  const ahora = Date.now();
  const cosecha = {
    id: randomUUID(),
    lote_id: lote.id,
    fecha: fechaIso(),
    anio: s.anio,
    semana: s.numero,
    color_cinta_id: color.id,
    racimos_cosechados: 100,
    racimos_perdidos: 1,
    created_at: ahora,
    updated_at: ahora,
    created_by: caporal.usuario.id,
    estado_validacion: 'pendiente',
  };
  const r1 = await push(a, { cosecha: { created: [cosecha], updated: [], deleted: [] } }, pa.timestamp, {
    versionApp: '0.1.0',
    registrosPendientes: 0,
    archivosPendientes: 1,
  });
  if (r1.resultados[0]?.estado !== 'aceptado')
    throw new Error(`La cosecha no fue aceptada: ${JSON.stringify(r1.resultados)}`);

  // Ambos celulares descargan la cosecha y la editan sin conexión.
  const pa2 = await pull(a, pa.timestamp);
  const pb2 = await pull(b, pb.timestamp);
  const enServidor = pa2.changes.cosecha.updated.find((x) => x.id === cosecha.id);
  const editar = (racimos, desfase) => ({
    ...enServidor,
    racimos_cosechados: racimos,
    updated_at: Date.now() + desfase,
    _status: 'updated',
    _changed: 'racimos_cosechados,updated_at',
  });
  await push(b, { cosecha: { created: [], updated: [editar(120, 2000)], deleted: [] } }, pb2.timestamp, {
    versionApp: '0.1.0',
    registrosPendientes: 3,
    archivosPendientes: 0,
  });
  const rA = await push(
    a,
    { cosecha: { created: [], updated: [editar(110, 1000)], deleted: [] } },
    pa2.timestamp,
    { versionApp: '0.1.0', registrosPendientes: 0, archivosPendientes: 1 },
  );
  console.log(`  resultado de la edición concurrente: ${JSON.stringify(rA.resultados[0])}`);
}

async function main() {
  console.log(`Grabando fixtures DEMO desde ${API} → ${DESTINO}`);
  mkdirSync(DESTINO, { recursive: true });
  await pedir('/salud');

  const sesiones = {};
  for (const [usuario, pin] of Object.entries(USUARIOS_PANEL))
    sesiones[usuario] = await login(usuario, pin);
  const admin = sesiones.admin.accessToken;
  const sup = sesiones.supervisor.accessToken;

  if (!SIN_ACTIVIDAD) {
    const conflictos = await pedir('/v1/validacion/conflictos', { token: sup });
    if (FORZAR_ACTIVIDAD || conflictos.length === 0) await generarActividad(sesiones.supervisor);
    else console.log('Ya hay conflictos pendientes: no se genera actividad nueva.');
  }

  // Perfiles (/v1/auth/yo) de los usuarios del panel.
  const perfiles = {};
  for (const [usuario, s] of Object.entries(sesiones))
    perfiles[usuario] = await pedir('/v1/auth/yo', { token: s.accessToken });

  // Universo de registros: todas las tablas visibles para el administrador, sin filtro de fecha.
  const tablas = await pedir('/v1/registros', { token: admin });
  const registros = {};
  for (const { tabla } of tablas)
    registros[tabla] = await pedir(`/v1/registros/${tabla}?limite=5000`, { token: admin });

  const catalogos = await pedir('/v1/catalogos', { token: admin });
  const mapa = {
    lotes: await pedir('/v1/mapa/lotes', { token: sup }),
    rutas: await pedir('/v1/mapa/rutas', { token: sup }),
    cobertura: await pedir('/v1/mapa/cobertura', { token: sup }),
    registros: await pedir('/v1/mapa/registros', { token: sup }),
  };

  // Pronóstico: ecuación base y semanal por horizonte (finca y cada lote).
  const semanal = {};
  for (const h of [4, 8, 12, 16]) {
    semanal[String(h)] = await pedir(`/v1/pronostico/semanal?horizonte=${h}`, { token: sup });
    for (const l of catalogos.lotes)
      semanal[`${h}:${l.id}`] = await pedir(`/v1/pronostico/semanal?horizonte=${h}&lote_id=${l.id}`, {
        token: sup,
      });
  }
  const pronostico = { ecuacion: await pedir('/v1/pronostico/ecuacion', { token: sup }), semanal };

  const validacion = {
    conflictos: await pedir('/v1/validacion/conflictos', { token: sup }),
  };
  const pendientes = await pedir('/v1/validacion/pendientes', { token: sup });
  const alertas = await pedir('/v1/alertas', { token: sup });
  const ordenes = await pedir('/v1/ordenes', { token: sup });
  const dispositivos = await pedir('/v1/dispositivos', { token: sup });
  const adminDatos = {
    usuarios: await pedir('/v1/admin/usuarios', { token: admin }),
    roles: await pedir('/v1/admin/roles', { token: admin }),
    formularios: await pedir('/v1/admin/formularios', { token: admin }),
    bitacora: await pedir('/v1/admin/bitacora?limite=300', { token: admin }),
  };
  // Archivos de un registro (para conocer la forma; el modo demo usa una foto de ejemplo).
  const unaAlerta = registros.alertas_fusarium?.[0];
  const archivosEjemplo = unaAlerta
    ? await pedir(
        `/v1/archivos?registro_tabla=alertas_fusarium&registro_id=${unaAlerta.id}`,
        { token: sup },
      )
    : [];
  const pdf = await pedir('/v1/trampas/qr.pdf', { token: sup, binario: true });

  // Comprobaciones: el modo demo deriva estas vistas de los registros grabados.
  const avisos = [];
  for (const [t, filas] of Object.entries(pendientes)) {
    const derivados = (registros[t] ?? []).filter((f) => f.estado_validacion === 'pendiente');
    if (derivados.length !== filas.length)
      avisos.push(`pendientes de ${t}: API ${filas.length}, derivados ${derivados.length}`);
  }
  if ((registros.alertas_fusarium ?? []).length !== alertas.length)
    avisos.push(`alertas: API ${alertas.length}, registros ${registros.alertas_fusarium?.length}`);
  if ((registros.ordenes_trabajo ?? []).length !== ordenes.length)
    avisos.push(`órdenes: API ${ordenes.length}, registros ${registros.ordenes_trabajo?.length}`);

  console.log('Escribiendo fixtures:');
  guardar('grabacion.json', {
    demo: true,
    aviso:
      'Datos de DEMOSTRACIÓN (DEMO) grabados desde la API con el seed de ejemplo. No son datos reales de la finca.',
    grabadoEn: Date.now(),
    api: API,
    comando: 'node apps/web/scripts/grabar-mock.mjs',
  });
  guardar('perfiles.json', perfiles);
  guardar('catalogos.json', catalogos);
  guardar('registros.json', registros);
  guardar('mapa.json', mapa);
  guardar('pronostico.json', pronostico);
  guardar('validacion.json', validacion);
  guardar('dispositivos.json', dispositivos);
  guardar('admin.json', adminDatos);
  guardar('archivos-ejemplo.json', archivosEjemplo);
  guardar('trampas-qr.json', {
    contentType: 'application/pdf',
    nombre: 'trampas-qr-DEMO.pdf',
    base64: pdf.toString('base64'),
  });
  if (avisos.length) console.warn(`AVISO: diferencias entre vistas y registros:\n  ${avisos.join('\n  ')}`);
  console.log(
    `Listo: ${Object.values(registros).reduce((s, x) => s + x.length, 0)} registros, ` +
      `${validacion.conflictos.length} conflictos, ${dispositivos.length} dispositivos.`,
  );
}

main().catch((e) => {
  console.error(`Error al grabar: ${e.message}`);
  process.exit(1);
});
