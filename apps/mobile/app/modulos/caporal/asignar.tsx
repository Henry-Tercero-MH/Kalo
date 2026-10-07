/**
 * Asignar labor: arriba se elige la labor y el lote; debajo, los trabajadores presentes que aún
 * no tienen tarea. Al asignar, salen de esa lista y aparecen agrupados por labor más abajo, así
 * el caporal ve cómo repartió a su gente. Una asignación sin reportar se puede quitar.
 * Todo queda en el teléfono hasta «Enviar datos».
 */
import { fechaIso, type Fila } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { SelectorLote } from '@/componentes/Campo';
import { Contador, Opciones } from '@/componentes/Controles';
import { Icono } from '@/componentes/Icono';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, Texto, Titulo } from '@/componentes/Texto';
import { Aviso, Estado } from '@/componentes/Visuales';
import { campo, espaciado, estilosBase, semantico, tipografia } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { useRequierePermiso } from '@/modulos/comun';
import { asignarLabor, quitarAsignacion } from '@/modulos/labores/servicio';
import { useContextoEscritura } from '@/permisos/contexto';
import { useSesion } from '@/permisos/sesion';
import { refrescarContadores } from '@/sync/motor';

type Asignacion = Fila<'asignaciones_labor'>;

export default function AsignarLabor() {
  const { t } = useTranslation();
  useRequierePermiso('labores:crear');
  const ctx = useContextoEscritura();
  const usuario = useSesion((s) => s.usuario);
  const hoy = fechaIso();

  const tipos = useConsulta('tipos_labor', [Q.where('activo', true)]);
  const lotes = useConsulta('lotes');
  const todas = useConsulta('cuadrillas');
  // El caporal ve primero sus cuadrillas.
  const cuadrillas = useMemo(
    () =>
      [...todas].sort(
        (a, b) =>
          Number(b.caporal_id === usuario?.id) - Number(a.caporal_id === usuario?.id) ||
          a.nombre.localeCompare(b.nombre),
      ),
    [todas, usuario?.id],
  );
  const [cuadrillaId, setCuadrillaId] = useState<string | null>(null);
  const [tipoId, setTipoId] = useState<string | null>(null);
  const [loteId, setLoteId] = useState<string | null>(null);
  const [meta, setMeta] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const miembros = useConsulta(
    'cuadrilla_miembros',
    [Q.where('cuadrilla_id', cuadrillaId ?? '')],
    [cuadrillaId],
  );
  const trabajadores = useConsulta('trabajadores', [Q.where('activo', true)]);
  const asistencia = useConsulta('asistencia', [Q.where('fecha', hoy)], [hoy]);
  const asignaciones = useConsulta(
    'asignaciones_labor',
    [Q.where('fecha', hoy), Q.where('estado', Q.oneOf(['asignada', 'reportada']))],
    [hoy],
  );

  const deLaCuadrilla = useMemo(
    () =>
      trabajadores
        .filter((tr) => miembros.some((m) => m.trabajador_id === tr.id))
        .sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [trabajadores, miembros],
  );
  const ausentes = useMemo(
    () => new Set(asistencia.filter((a) => !a.presente).map((a) => a.trabajador_id)),
    [asistencia],
  );
  const conTarea = useMemo(
    () => new Map(asignaciones.map((a) => [a.trabajador_id, a])),
    [asignaciones],
  );
  // Sin tarea: presentes (o sin asistencia tomada) que aún no tienen labor asignada hoy.
  const sinTarea = deLaCuadrilla.filter((tr) => !ausentes.has(tr.id) && !conTarea.has(tr.id));
  const ausentesCuadrilla = deLaCuadrilla.filter((tr) => ausentes.has(tr.id)).length;

  // Grupos por labor y lote, con los trabajadores de esta cuadrilla.
  const grupos = useMemo(() => {
    const ids = new Set(deLaCuadrilla.map((tr) => tr.id));
    const mapa = new Map<string, Asignacion[]>();
    for (const a of asignaciones) {
      if (!ids.has(a.trabajador_id)) continue;
      const k = `${a.tipo_labor_id}|${a.lote_id}`;
      mapa.set(k, [...(mapa.get(k) ?? []), a]);
    }
    return [...mapa.values()].sort((x, y) => y.length - x.length);
  }, [asignaciones, deLaCuadrilla]);

  const nombre = useMemo(
    () => ({
      tipo: new Map(tipos.map((x) => [x.id, x])),
      lote: new Map(lotes.map((x) => [x.id, x.nombre])),
      trabajador: new Map(trabajadores.map((x) => [x.id, x])),
    }),
    [tipos, lotes, trabajadores],
  );
  const tipo = tipoId ? nombre.tipo.get(tipoId) : undefined;

  useEffect(() => {
    if (!cuadrillaId && cuadrillas[0]) setCuadrillaId(cuadrillas[0].id);
  }, [cuadrillas, cuadrillaId]);
  useEffect(() => setSeleccion([]), [cuadrillaId]);

  const alternar = (id: string) =>
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const todosSeleccionados = sinTarea.length > 0 && seleccion.length === sinTarea.length;

  const asignar = async () => {
    if (!ctx || !tipoId || !loteId || seleccion.length === 0) return;
    setGuardando(true);
    try {
      const r = await asignarLabor(
        { tipoLaborId: tipoId, loteId, cuadrillaId, trabajadorIds: seleccion, meta, notas: '' },
        ctx,
      );
      setSeleccion([]);
      setMensaje(
        t('caporal.asignadaGrupo', {
          n: r.creadas,
          labor: tipo?.nombre ?? '',
          lote: nombre.lote.get(loteId) ?? '',
        }),
      );
      await refrescarContadores();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Pantalla volver>
      <Titulo>{t('caporal.asignar')}</Titulo>

      <Etiqueta>{t('caporal.cuadrilla')}</Etiqueta>
      <View style={{ marginVertical: espaciado.sm }}>
        <Opciones
          columnas={2}
          opciones={cuadrillas.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
          valor={cuadrillaId}
          onCambio={(v) => setCuadrillaId(v as string)}
        />
      </View>

      {/* 1. Qué labor y dónde */}
      <View style={estilos.paso}>
        <Text style={estilos.pasoTitulo}>{t('caporal.paso1')}</Text>
        <Etiqueta>{t('caporal.labor')}</Etiqueta>
        <View style={{ marginVertical: espaciado.sm }}>
          <Opciones
            columnas={2}
            opciones={tipos.map((x) => ({ valor: x.id, etiqueta: x.nombre }))}
            valor={tipoId}
            onCambio={(v) => setTipoId(v as string)}
          />
        </View>
        <SelectorLote valor={loteId} onCambio={setLoteId} />
        <View style={{ marginTop: espaciado.md }}>
          <Etiqueta>
            {tipo ? t('caporal.meta', { u: tipo.unidad }) : t('caporal.metaSinUnidad')}
          </Etiqueta>
          <View style={{ marginTop: espaciado.sm }}>
            <Contador
              valor={meta}
              onCambio={setMeta}
              min={0}
              max={10000}
              decimales={tipo?.unidad === 'hectareas' ? 1 : 0}
              unidad={tipo?.unidad}
            />
          </View>
        </View>
      </View>

      {/* 2. A quién: los que aún no tienen tarea */}
      <View style={estilos.paso}>
        <Text style={estilos.pasoTitulo}>{t('caporal.paso2')}</Text>
        <View style={estilos.encabezadoSeccion}>
          <Text style={estilos.seccion}>{`${t('caporal.sinTarea')} (${sinTarea.length})`}</Text>
          {sinTarea.length > 0 ? (
            <Pressable
              onPress={() => setSeleccion(todosSeleccionados ? [] : sinTarea.map((x) => x.id))}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={estilos.enlace}>
                {todosSeleccionados ? t('caporal.ninguno') : t('caporal.todos')}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {ausentesCuadrilla > 0 ? (
          <Text style={estilosBase.secundario}>
            {t('caporal.ausentesNoListados', { n: ausentesCuadrilla })}
          </Text>
        ) : null}
        {sinTarea.length === 0 ? (
          <Aviso tipo="exito" texto={t('caporal.todosConTarea')} />
        ) : (
          <View style={{ marginTop: espaciado.sm }}>
            {sinTarea.map((tr) => {
              const marcado = seleccion.includes(tr.id);
              return (
                <Pressable
                  key={tr.id}
                  onPress={() => alternar(tr.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: marcado }}
                  style={[estilos.trabajador, marcado && estilos.trabajadorMarcado]}
                >
                  <View style={[estilos.casilla, marcado && estilos.casillaMarcada]}>
                    {marcado ? <Icono nombre="check" tamano={20} color={semantico.titulo} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.nombre}>{`${tr.codigo} · ${tr.nombre}`}</Text>
                    {tr.centro_costo ? (
                      <Text style={estilosBase.secundario}>{tr.centro_costo}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        {mensaje ? <Aviso tipo="exito" texto={mensaje} /> : null}
        <View style={{ marginTop: espaciado.md }}>
          <Boton
            titulo={
              tipo && loteId
                ? t('caporal.asignarBoton', { labor: tipo.nombre, n: seleccion.length })
                : t('caporal.eligeLaborLote')
            }
            icono="check"
            cargando={guardando}
            deshabilitado={!tipoId || !loteId || seleccion.length === 0}
            onPress={() => void asignar()}
          />
        </View>
      </View>

      {/* Cómo quedó repartida la gente */}
      <Text style={estilos.reparto}>{t('caporal.reparto')}</Text>
      {grupos.length === 0 ? <Texto>{t('caporal.sinReparto')}</Texto> : null}
      {grupos.map((grupo) => {
        const primero = grupo[0]!;
        const tipoGrupo = nombre.tipo.get(primero.tipo_labor_id);
        return (
          <View key={`${primero.tipo_labor_id}|${primero.lote_id}`} style={estilos.grupo}>
            <View style={estilos.grupoEncabezado}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.grupoTitulo}>
                  {`${tipoGrupo?.nombre ?? '—'} · ${nombre.lote.get(primero.lote_id) ?? '—'}`}
                </Text>
                {primero.meta !== null ? (
                  <Text style={estilos.grupoMeta}>
                    {t('caporal.metaValor', { n: primero.meta, u: tipoGrupo?.unidad ?? '' })}
                  </Text>
                ) : null}
              </View>
              <View style={estilos.contador}>
                <Text style={estilos.contadorTexto}>{grupo.length}</Text>
              </View>
            </View>
            {grupo.map((a) => {
              const tr = nombre.trabajador.get(a.trabajador_id);
              return (
                <View key={a.id} style={estilos.filaGrupo}>
                  <Text style={[estilosBase.cuerpo, { flex: 1 }]}>
                    {tr ? `${tr.codigo} · ${tr.nombre}` : '—'}
                  </Text>
                  {a.estado === 'reportada' ? (
                    <Estado tipo="exito" texto={t('caporal.reportada')} />
                  ) : (
                    <Pressable
                      onPress={async () => {
                        await quitarAsignacion(a.id);
                        await refrescarContadores();
                        setMensaje(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t('caporal.quitarDe', {
                        nombre: tr?.nombre ?? '',
                      })}
                      hitSlop={8}
                      style={estilos.quitar}
                    >
                      <Icono nombre="x" tamano={20} color={semantico.titulo} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  paso: {
    marginTop: espaciado.lg,
    padding: espaciado.md,
    borderWidth: 1,
    borderColor: semantico.borde,
  },
  pasoTitulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: semantico.titulo,
    marginBottom: espaciado.sm,
  },
  encabezadoSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seccion: { fontFamily: tipografia.familias.titulo, fontSize: 16, color: semantico.titulo },
  enlace: {
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: tipografia.tamanos.pequeno,
    color: semantico.titulo,
    textDecorationLine: 'underline',
  },
  trabajador: {
    minHeight: campo.alturaTactil,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.sm,
    borderBottomWidth: 1,
    borderBottomColor: semantico.borde,
  },
  trabajadorMarcado: { backgroundColor: semantico.fondoSuave },
  casilla: {
    width: 32,
    height: 32,
    borderWidth: 2,
    borderColor: semantico.bordeFuerte,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: semantico.fondo,
  },
  casillaMarcada: { backgroundColor: semantico.acento },
  nombre: { fontFamily: tipografia.familias.cuerpoMedio, fontSize: 16, color: semantico.titulo },
  reparto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.subtitulo,
    textTransform: 'uppercase',
    color: semantico.titulo,
    marginTop: espaciado.xl,
    paddingBottom: espaciado.xs,
    marginBottom: espaciado.md,
    borderBottomWidth: 2,
    borderBottomColor: semantico.bordeFuerte,
  },
  grupo: { borderWidth: 1, borderColor: semantico.borde, marginBottom: espaciado.md },
  grupoEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    backgroundColor: semantico.bordeFuerte,
  },
  grupoTitulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: semantico.fondo,
  },
  grupoMeta: { fontFamily: tipografia.familias.cuerpo, fontSize: 13, color: semantico.fondo },
  contador: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 6,
    backgroundColor: semantico.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: { fontFamily: tipografia.familias.titulo, fontSize: 18, color: semantico.titulo },
  filaGrupo: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.md,
    borderTopWidth: 1,
    borderTopColor: semantico.borde,
  },
  quitar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: semantico.borde,
  },
});
