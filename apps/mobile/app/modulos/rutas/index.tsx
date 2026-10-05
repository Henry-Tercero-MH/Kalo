/**
 * Rutas GPS: grabar el recorrido mientras la tarea está activa (también con la pantalla
 * apagada) y ver la cobertura del lote. Pide consentimiento la primera vez.
 */
import { formatearNumero } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { SelectorLote } from '@/componentes/Campo';
import { Opciones } from '@/componentes/Controles';
import { MapaFinca } from '@/componentes/MapaFinca';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, Titulo } from '@/componentes/Texto';
import { Aviso, Dato, Estado, Tarjeta } from '@/componentes/Visuales';
import { espaciado } from '@/componentes/tema';
import { useConteo } from '@/db/hooks';
import { finalizarRuta, iniciarRuta, pedirPermisosRastreo, rutaActiva } from '@/gps/rastreo';
import { despuesDeGuardar, useRequierePermiso } from '@/modulos/comun';
import { tieneConsentimiento } from '@/permisos/consentimiento';
import { useContextoEscritura } from '@/permisos/contexto';

const TAREAS = [
  'Muestreo de plagas',
  'Lectura de trampas',
  'Recorrido de supervisión',
  'Labor de campo',
];

export default function Rutas() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('rutas:crear');
  const ctx = useContextoEscritura();
  const { orden, tarea: tareaInicial } = useLocalSearchParams<{ orden?: string; tarea?: string }>();
  const [rutaId, setRutaId] = useState<string | null>(null);
  const [tarea, setTarea] = useState<string>(tareaInicial ?? TAREAS[0]!);
  const [loteId, setLoteId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const puntos = useConteo('puntos_ruta', [Q.where('ruta_id', rutaId ?? '__ninguna__')], [rutaId]);

  const refrescar = useCallback(async () => setRutaId((await rutaActiva())?.rutaId ?? null), []);
  useEffect(() => void refrescar(), [refrescar]);

  const iniciar = async () => {
    if (!ctx) return;
    if (!(await tieneConsentimiento(ctx.usuarioId))) {
      router.push({ pathname: '/(auth)/consentimiento', params: { volverA: '/modulos/rutas' } });
      return;
    }
    const permisos = await pedirPermisosRastreo();
    if (permisos === 'sin_primer_plano') return setAviso(t('rutas.permisoFondo'));
    if (permisos === 'sin_segundo_plano') setAviso(t('rutas.permisoFondo'));
    setCargando(true);
    try {
      setRutaId(await iniciarRuta({ tarea, loteId, ordenTrabajoId: orden ?? null }, ctx));
    } finally {
      setCargando(false);
    }
  };

  return (
    <Pantalla volver>
      <Titulo>{t('rutas.titulo')}</Titulo>
      {rutaId ? (
        <Tarjeta destacada>
          <Estado tipo="info" texto={t('rutas.activa')} />
          <View style={{ marginTop: espaciado.md }}>
            <Dato etiqueta={t('rutas.tarea')} valor={tarea} />
            <Dato etiqueta="GPS" valor={t('rutas.puntos', { n: formatearNumero(puntos) })} />
          </View>
          <Boton
            titulo={t('rutas.finalizar')}
            icono="square"
            variante="peligro"
            cargando={cargando}
            onPress={async () => {
              setCargando(true);
              try {
                const r = await finalizarRuta();
                setRutaId(null);
                despuesDeGuardar(
                  () => undefined,
                  r
                    ? `${t('rutas.puntos', { n: r.puntos })} · ${formatearNumero(r.distancia)} m`
                    : undefined,
                );
              } finally {
                setCargando(false);
              }
            }}
          />
        </Tarjeta>
      ) : (
        <>
          <Etiqueta>{t('rutas.tarea')}</Etiqueta>
          <View style={{ marginVertical: espaciado.sm }}>
            <Opciones
              opciones={TAREAS.map((x) => ({ valor: x, etiqueta: x }))}
              valor={tarea}
              onCambio={(v) => setTarea(v as string)}
            />
          </View>
          <SelectorLote valor={loteId} onCambio={setLoteId} />
          <View style={{ marginTop: espaciado.lg }}>
            <Boton titulo={t('rutas.iniciar')} icono="play" onPress={iniciar} cargando={cargando} />
          </View>
        </>
      )}
      {aviso ? <Aviso tipo="alerta" texto={aviso} /> : null}
      <View style={{ marginTop: espaciado.lg }}>
        <MapaFinca alto={360} rutaId={rutaId} />
      </View>
    </Pantalla>
  );
}
