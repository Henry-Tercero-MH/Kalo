/**
 * Asignar labor: arriba se elige la labor y el lote; debajo, los trabajadores presentes que aún
 * no tienen tarea. Al asignar, salen de esa lista y aparecen agrupados por labor más abajo, así
 * el caporal ve cómo repartió a su gente. Una asignación sin reportar se puede quitar.
 * Todo queda en el teléfono hasta «Enviar datos».
 */
import { decimalesUnidad, etiquetaUnidad, fechaIso, type Fila } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Boton, BotonIcono } from '@/componentes/Boton';
import { SelectorLote } from '@/componentes/Campo';
import { Contador, FilaCasilla, Opciones } from '@/componentes/Controles';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, Subtitulo, TextoNombre, Titulo } from '@/componentes/Texto';
import { Aviso, Estado, EstadoVacio } from '@/componentes/Visuales';
import { bordes, campo, espaciado, estilosBase, semantico, tipografia } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { useRequierePermiso } from '@/modulos/comun';
import { asignarLabor, quitarAsignacion } from '@/modulos/labores/servicio';
import { usePersonalACargo } from '@/modulos/caporal/personal';
import { useContextoEscritura } from '@/permisos/contexto';
import { refrescarContadores } from '@/sync/motor';

type Asignacion = Fila<'asignaciones_labor'>;

export default function AsignarLabor() {
  const { t } = useTranslation();
  useRequierePermiso('labores:crear');
  const ctx = useContextoEscritura();
  const hoy = fechaIso();

  const tipos = useConsulta('tipos_labor', [Q.where('activo', true)]);
  const lotes = useConsulta('lotes');
  const [tipoId, setTipoId] = useState<string | null>(null);
  const [loteId, setLoteId] = useState<string | null>(null);
  const [meta, setMeta] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const { lista: personal, cuadrillaDe } = usePersonalACargo();
  const trabajadores = useConsulta('trabajadores');
  const asistencia = useConsulta('asistencia', [Q.where('fecha', hoy)], [hoy]);
  const asignaciones = useConsulta(
    'asignaciones_labor',
    [Q.where('fecha', hoy), Q.where('estado', Q.oneOf(['asignada', 'reportada']))],
    [hoy],
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
  const sinTarea = personal.filter((tr) => !ausentes.has(tr.id) && !conTarea.has(tr.id));
  const ausentesPersonal = personal.filter((tr) => ausentes.has(tr.id)).length;

  // Grupos por labor y lote, con el personal a cargo.
  const grupos = useMemo(() => {
    const ids = new Set(personal.map((tr) => tr.id));
    const mapa = new Map<string, Asignacion[]>();
    for (const a of asignaciones) {
      if (!ids.has(a.trabajador_id)) continue;
      const k = `${a.tipo_labor_id}|${a.lote_id}`;
      mapa.set(k, [...(mapa.get(k) ?? []), a]);
    }
    return [...mapa.values()].sort((x, y) => y.length - x.length);
  }, [asignaciones, personal]);

  const nombre = useMemo(
    () => ({
      tipo: new Map(tipos.map((x) => [x.id, x])),
      lote: new Map(lotes.map((x) => [x.id, x.nombre])),
      trabajador: new Map(trabajadores.map((x) => [x.id, x])),
    }),
    [tipos, lotes, trabajadores],
  );
  const tipo = tipoId ? nombre.tipo.get(tipoId) : undefined;

  const alternar = (id: string) =>
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const todosSeleccionados = sinTarea.length > 0 && seleccion.length === sinTarea.length;

  const asignar = async () => {
    if (!ctx || !tipoId || !loteId || seleccion.length === 0) return;
    setGuardando(true);
    try {
      const r = await asignarLabor(
        { tipoLaborId: tipoId, loteId, cuadrillaDe, trabajadorIds: seleccion, meta, notas: '' },
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

      <Text style={estilosBase.etiqueta}>{t('asistencia.personal', { n: personal.length })}</Text>

      {/* 1. Qué labor y dónde */}
      <View style={estilos.paso}>
        <Text style={estilos.pasoTitulo}>{t('caporal.paso1')}</Text>
        <Etiqueta requerido>{t('caporal.labor')}</Etiqueta>
        <View style={{ marginVertical: espaciado.sm }}>
          <Opciones
            columnas={2}
            etiqueta={t('caporal.labor')}
            opciones={tipos.map((x) => ({ valor: x.id, etiqueta: x.nombre }))}
            valor={tipoId}
            onCambio={(v) => setTipoId(v as string)}
          />
        </View>
        <SelectorLote valor={loteId} onCambio={setLoteId} requerido />
        <View style={{ marginTop: espaciado.md }}>
          <Etiqueta>
            {tipo
              ? t('caporal.meta', { u: etiquetaUnidad(tipo.unidad) })
              : t('caporal.metaSinUnidad')}
          </Etiqueta>
          <View style={{ marginTop: espaciado.sm }}>
            <Contador
              etiqueta={t('caporal.metaSinUnidad')}
              valor={meta}
              onCambio={setMeta}
              min={0}
              max={10000}
              decimales={decimalesUnidad(tipo?.unidad)}
              unidad={etiquetaUnidad(tipo?.unidad)}
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
              style={({ pressed }) => [estilos.botonEnlace, pressed && estilosBase.presionado]}
            >
              <Text style={estilos.enlace}>
                {todosSeleccionados ? t('caporal.ninguno') : t('caporal.todos')}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {ausentesPersonal > 0 ? (
          <Text style={estilosBase.secundario}>
            {t('caporal.ausentesNoListados', { n: ausentesPersonal })}
          </Text>
        ) : null}
        {sinTarea.length === 0 ? (
          <Aviso tipo="exito" texto={t('caporal.todosConTarea')} />
        ) : (
          <View style={{ marginTop: espaciado.sm }}>
            {sinTarea.map((tr) => {
              const marcado = seleccion.includes(tr.id);
              return (
                <FilaCasilla
                  key={tr.id}
                  marcada={marcado}
                  onCambio={() => alternar(tr.id)}
                  resaltarMarcada
                  style={estilos.trabajador}
                >
                  <TextoNombre>{`${tr.codigo} · ${tr.nombre}`}</TextoNombre>
                  {tr.centro_costo ? (
                    <Text style={estilosBase.secundario}>{tr.centro_costo}</Text>
                  ) : null}
                </FilaCasilla>
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
            icono="guardar"
            cargando={guardando}
            deshabilitado={!tipoId || !loteId || seleccion.length === 0}
            motivoDeshabilitado={
              tipoId && loteId && sinTarea.length > 0 ? t('caporal.eligeTrabajadores') : undefined
            }
            onPress={() => void asignar()}
          />
        </View>
      </View>

      {/* Cómo quedó repartida la gente */}
      <Subtitulo>{t('caporal.reparto')}</Subtitulo>
      {grupos.length === 0 ? (
        <EstadoVacio
          icono="trabajadores"
          titulo={t('caporal.vacioReparto')}
          descripcion={t('caporal.sinReparto')}
        />
      ) : null}
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
                    {t('caporal.metaValor', {
                      n: primero.meta,
                      u: etiquetaUnidad(tipoGrupo?.unidad),
                    })}
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
                    <BotonIcono
                      icono="quitar"
                      variante="contorno"
                      etiqueta={t('caporal.quitarDe', { nombre: tr?.nombre ?? '' })}
                      onPress={async () => {
                        await quitarAsignacion(a.id);
                        await refrescarContadores();
                        setMensaje(null);
                      }}
                    />
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
    borderWidth: bordes.lineaDivision,
    borderColor: semantico.borde,
  },
  pasoTitulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.pequeno,
    letterSpacing: tipografia.espaciadoEtiquetas,
    textTransform: 'uppercase',
    color: semantico.titulo,
    marginBottom: espaciado.sm,
  },
  encabezadoSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seccion: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.cuerpo,
    color: semantico.titulo,
  },
  botonEnlace: {
    minHeight: campo.alturaTactil,
    justifyContent: 'center',
    paddingHorizontal: espaciado.sm,
  },
  enlace: {
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: tipografia.tamanos.cuerpo,
    color: semantico.titulo,
    textDecorationLine: 'underline',
  },
  trabajador: {
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.sm,
    borderBottomWidth: bordes.lineaDivision,
    borderBottomColor: semantico.borde,
  },
  grupo: {
    borderWidth: bordes.lineaDivision,
    borderColor: semantico.borde,
    marginBottom: espaciado.md,
  },
  grupoEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
    backgroundColor: semantico.superficieInvertida,
  },
  grupoTitulo: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.cuerpo,
    textTransform: 'uppercase',
    letterSpacing: tipografia.espaciadoLetras.titulo,
    color: semantico.textoSobreOscuro,
  },
  grupoMeta: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.tamanos.pequeno,
    color: semantico.textoSobreOscuro,
  },
  contador: {
    minWidth: espaciado.xxl + espaciado.xs,
    height: espaciado.xxl + espaciado.xs,
    paddingHorizontal: espaciado.sm,
    backgroundColor: semantico.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.subtitulo,
    color: semantico.titulo,
    fontVariant: ['tabular-nums'],
  },
  filaGrupo: {
    minHeight: campo.alturaTactil,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.md,
    borderTopWidth: bordes.lineaDivision,
    borderTopColor: semantico.borde,
  },
});
