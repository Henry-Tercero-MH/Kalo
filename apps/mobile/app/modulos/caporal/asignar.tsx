/**
 * Asignar labor: el caporal elige la labor, el lote y los trabajadores de su cuadrilla
 * (por defecto los presentes de hoy). Queda guardado en el teléfono hasta «Enviar datos».
 */
import { fechaIso } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { avisar } from '@/componentes/alerta';
import { Boton } from '@/componentes/Boton';
import { SelectorLote } from '@/componentes/Campo';
import { CampoTexto, Contador, Opciones } from '@/componentes/Controles';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, TextoSecundario, Titulo } from '@/componentes/Texto';
import { espaciado } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { useRequierePermiso } from '@/modulos/comun';
import { asignarLabor } from '@/modulos/labores/servicio';
import { useContextoEscritura } from '@/permisos/contexto';
import { useSesion } from '@/permisos/sesion';
import { refrescarContadores } from '@/sync/motor';

export default function AsignarLabor() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('labores:crear');
  const ctx = useContextoEscritura();
  const usuario = useSesion((s) => s.usuario);
  const hoy = fechaIso();

  const tipos = useConsulta('tipos_labor', [Q.where('activo', true)]);
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
  const [tipoId, setTipoId] = useState<string | null>(null);
  const [loteId, setLoteId] = useState<string | null>(null);
  const [cuadrillaId, setCuadrillaId] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [meta, setMeta] = useState<number | null>(null);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const miembros = useConsulta(
    'cuadrilla_miembros',
    [Q.where('cuadrilla_id', cuadrillaId ?? '')],
    [cuadrillaId],
  );
  const trabajadores = useConsulta('trabajadores', [Q.where('activo', true)]);
  const lista = useMemo(
    () =>
      trabajadores
        .filter((tr) => miembros.some((m) => m.trabajador_id === tr.id))
        .sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [trabajadores, miembros],
  );
  const asistencia = useConsulta('asistencia', [Q.where('fecha', hoy)], [hoy]);
  const ausentes = useMemo(
    () => new Set(asistencia.filter((a) => !a.presente).map((a) => a.trabajador_id)),
    [asistencia],
  );
  const tipo = tipos.find((x) => x.id === tipoId);

  useEffect(() => {
    if (!cuadrillaId && cuadrillas[0]) setCuadrillaId(cuadrillas[0].id);
  }, [cuadrillas, cuadrillaId]);
  // Al cambiar de cuadrilla se marcan todos menos los ausentes de hoy.
  useEffect(() => {
    setSeleccion(lista.filter((tr) => !ausentes.has(tr.id)).map((tr) => tr.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuadrillaId, lista.length, ausentes.size]);

  return (
    <Pantalla volver>
      <Titulo>{t('caporal.asignar')}</Titulo>

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

      <View style={{ marginTop: espaciado.lg }}>
        <Etiqueta>{t('caporal.cuadrilla')}</Etiqueta>
        <View style={{ marginTop: espaciado.sm }}>
          <Opciones
            columnas={2}
            opciones={cuadrillas.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
            valor={cuadrillaId}
            onCambio={(v) => setCuadrillaId(v as string)}
          />
        </View>
      </View>

      <View style={{ marginTop: espaciado.lg }}>
        <Etiqueta>{`${t('caporal.trabajadores')} (${seleccion.length}/${lista.length})`}</Etiqueta>
        <TextoSecundario>{t('caporal.trabajadoresAyuda')}</TextoSecundario>
        <View style={{ marginTop: espaciado.sm }}>
          <Opciones
            multiple
            opciones={lista.map((tr) => ({
              valor: tr.id,
              etiqueta: `${tr.codigo} · ${tr.nombre}${ausentes.has(tr.id) ? ` (${t('caporal.ausenteHoy')})` : ''}`,
            }))}
            valor={seleccion}
            onCambio={(v) => setSeleccion(v as string[])}
          />
        </View>
      </View>

      <View style={{ marginTop: espaciado.lg }}>
        <Etiqueta>{t('caporal.meta', { u: tipo?.unidad ?? '' })}</Etiqueta>
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

      <View style={{ marginTop: espaciado.lg }}>
        <CampoTexto
          etiqueta={t('comun.notas')}
          valor={notas}
          onCambio={setNotas}
          multilinea
          autoCapitalize="sentences"
        />
      </View>

      <Boton
        titulo={t('caporal.asignarA', { n: seleccion.length })}
        icono="check"
        cargando={guardando}
        deshabilitado={!tipoId || !loteId || seleccion.length === 0}
        onPress={async () => {
          if (!ctx || !tipoId || !loteId) return;
          setGuardando(true);
          try {
            const r = await asignarLabor(
              {
                tipoLaborId: tipoId,
                loteId,
                cuadrillaId,
                trabajadorIds: seleccion,
                meta,
                notas,
              },
              ctx,
            );
            await refrescarContadores();
            avisar(
              t('caporal.asignada', { n: r.creadas }),
              [
                r.repetidas > 0 ? t('caporal.asignadaRepetidas', { r: r.repetidas }) : null,
                t('caporal.guardadoSinEnviar'),
              ]
                .filter(Boolean)
                .join('\n'),
              () => router.back(),
            );
          } finally {
            setGuardando(false);
          }
        }}
      />
    </Pantalla>
  );
}
