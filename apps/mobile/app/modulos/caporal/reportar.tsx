/**
 * Reportar labor: lista de labores asignadas hoy; el caporal toca una, escribe la cantidad
 * hecha y guarda. También puede reportar una labor que no estaba asignada.
 */
import { fechaIso, type Fila } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { avisar } from '@/componentes/alerta';
import { Boton } from '@/componentes/Boton';
import { Contador } from '@/componentes/Controles';
import { Icono } from '@/componentes/Icono';
import { Pantalla } from '@/componentes/Pantalla';
import { Subtitulo, Texto, Titulo } from '@/componentes/Texto';
import { Estado } from '@/componentes/Visuales';
import { espaciado, estilosBase, semantico, tipografia } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { obtenerUbicacion } from '@/gps/ubicacion';
import { useRequierePermiso } from '@/modulos/comun';
import { reportarAsignacion } from '@/modulos/labores/servicio';
import { useContextoEscritura } from '@/permisos/contexto';
import { refrescarContadores } from '@/sync/motor';

export default function ReportarLabor() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('labores:crear');
  const ctx = useContextoEscritura();
  const hoy = fechaIso();

  const asignaciones = useConsulta('asignaciones_labor', [Q.where('fecha', hoy)], [hoy]);
  const labores = useConsulta('labores', [Q.where('fecha', hoy)], [hoy]);
  const trabajadores = useConsulta('trabajadores');
  const tipos = useConsulta('tipos_labor');
  const lotes = useConsulta('lotes');
  const nombre = useMemo(
    () => ({
      trabajador: new Map(trabajadores.map((x) => [x.id, `${x.codigo} · ${x.nombre}`])),
      tipo: new Map(tipos.map((x) => [x.id, x])),
      lote: new Map(lotes.map((x) => [x.id, x.nombre])),
      cantidad: new Map(labores.map((x) => [x.id, x.cantidad])),
    }),
    [trabajadores, tipos, lotes, labores],
  );

  const porReportar = asignaciones.filter((a) => a.estado === 'asignada');
  const reportadas = asignaciones.filter((a) => a.estado === 'reportada');
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  const abrir = (a: Fila<'asignaciones_labor'>) => {
    setAbiertaId(abiertaId === a.id ? null : a.id);
    setCantidad(a.meta ?? null);
  };

  const descripcion = (a: Fila<'asignaciones_labor'>) => {
    const tipo = nombre.tipo.get(a.tipo_labor_id);
    return `${tipo?.nombre ?? '—'} · ${nombre.lote.get(a.lote_id) ?? '—'}`;
  };

  return (
    <Pantalla volver>
      <Titulo>{t('caporal.reportar')}</Titulo>

      <Subtitulo>{`${t('caporal.porReportar')} (${porReportar.length})`}</Subtitulo>
      {porReportar.length === 0 ? <Texto>{t('caporal.sinPorReportar')}</Texto> : null}
      {porReportar.map((a) => {
        const tipo = nombre.tipo.get(a.tipo_labor_id);
        const abierta = abiertaId === a.id;
        return (
          <View key={a.id} style={[estilos.item, abierta && estilos.itemAbierto]}>
            <Pressable
              onPress={() => abrir(a)}
              accessibilityRole="button"
              accessibilityState={{ expanded: abierta }}
              style={estilos.fila}
            >
              <View style={{ flex: 1 }}>
                <Text style={estilos.trabajador}>
                  {nombre.trabajador.get(a.trabajador_id) ?? '—'}
                </Text>
                <Text style={estilosBase.secundario}>{descripcion(a)}</Text>
                {a.meta !== null ? (
                  <Text style={estilosBase.secundario}>
                    {t('caporal.metaValor', { n: a.meta, u: tipo?.unidad ?? '' })}
                  </Text>
                ) : null}
              </View>
              <Icono nombre={abierta ? 'x' : 'chevron-right'} color={semantico.textoSecundario} />
            </Pressable>
            {abierta ? (
              <View style={estilos.formulario}>
                <Text style={estilosBase.etiqueta}>
                  {t('caporal.cantidadHecha', { u: tipo?.unidad ?? '' })}
                </Text>
                <View style={{ marginVertical: espaciado.sm }}>
                  <Contador
                    valor={cantidad}
                    onCambio={setCantidad}
                    min={0}
                    max={10000}
                    decimales={tipo?.unidad === 'hectareas' ? 1 : 0}
                    unidad={tipo?.unidad}
                  />
                </View>
                <Boton
                  titulo={t('caporal.guardarReporte')}
                  icono="check"
                  cargando={guardando}
                  deshabilitado={cantidad === null}
                  onPress={async () => {
                    if (!ctx || cantidad === null) return;
                    setGuardando(true);
                    try {
                      await reportarAsignacion(
                        a,
                        { cantidad, notas: '', ubicacion: await obtenerUbicacion(6000) },
                        ctx,
                      );
                      await refrescarContadores();
                      setAbiertaId(null);
                      avisar(t('comun.listo'), t('caporal.guardadoSinEnviar'));
                    } finally {
                      setGuardando(false);
                    }
                  }}
                />
              </View>
            ) : null}
          </View>
        );
      })}

      <View style={{ marginTop: espaciado.lg }}>
        <Boton
          titulo={t('caporal.laborSinAsignar')}
          icono="plus"
          variante="secundario"
          onPress={() => router.push('/modulos/labores/labor')}
        />
      </View>

      {reportadas.length > 0 ? (
        <>
          <Subtitulo>{`${t('caporal.reportadas')} (${reportadas.length})`}</Subtitulo>
          {reportadas.map((a) => {
            const tipo = nombre.tipo.get(a.tipo_labor_id);
            const hecho = a.labor_id ? nombre.cantidad.get(a.labor_id) : undefined;
            return (
              <View key={a.id} style={[estilos.item, estilos.fila]}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.trabajador}>
                    {nombre.trabajador.get(a.trabajador_id) ?? '—'}
                  </Text>
                  <Text style={estilosBase.secundario}>{descripcion(a)}</Text>
                </View>
                <Estado
                  tipo="exito"
                  texto={hecho !== undefined ? `${hecho} ${tipo?.unidad ?? ''}` : t('comun.listo')}
                />
              </View>
            );
          })}
        </>
      ) : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  item: {
    borderWidth: 1,
    borderColor: semantico.borde,
    marginBottom: espaciado.sm,
  },
  itemAbierto: { borderWidth: 2, borderColor: semantico.bordeFuerte },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
  },
  trabajador: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 16,
    color: semantico.titulo,
  },
  formulario: {
    paddingHorizontal: espaciado.md,
    paddingBottom: espaciado.md,
    borderTopWidth: 1,
    borderTopColor: semantico.borde,
    paddingTop: espaciado.md,
  },
});
