/**
 * Asistencia por cuadrilla: el caporal marca PRESENTE / AUSENTE con botones grandes.
 */
import { fechaIso } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { Opciones } from '@/componentes/Controles';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, Texto, Titulo } from '@/componentes/Texto';
import { Aviso } from '@/componentes/Visuales';
import { campo, espaciado, semantico, tipografia } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { obtenerUbicacion } from '@/gps/ubicacion';
import { despuesDeGuardar, useRequierePermiso } from '@/modulos/comun';
import { guardarAsistencia } from '@/modulos/labores/servicio';
import { useContextoEscritura } from '@/permisos/contexto';
import { useSesion } from '@/permisos/sesion';

export default function Asistencia() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('labores:crear');
  const ctx = useContextoEscritura();
  const usuario = useSesion((s) => s.usuario);
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
  const miembros = useConsulta(
    'cuadrilla_miembros',
    [Q.where('cuadrilla_id', cuadrillaId ?? '')],
    [cuadrillaId],
  );
  const trabajadores = useConsulta('trabajadores', [Q.where('activo', true)]);
  const lista = trabajadores.filter((tr) => miembros.some((m) => m.trabajador_id === tr.id));
  const [presentes, setPresentes] = useState<Record<string, boolean>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!cuadrillaId && cuadrillas[0]) setCuadrillaId(cuadrillas[0].id);
  }, [cuadrillas, cuadrillaId]);
  // Si ya se tomó hoy, se muestra lo guardado (volver a guardar corrige, no duplica).
  const hoy = fechaIso();
  const tomadaHoy = useConsulta('asistencia', [Q.where('fecha', hoy)], [hoy]);
  const previa = new Map(tomadaHoy.map((a) => [a.trabajador_id, a.presente]));
  const yaTomada = lista.some((tr) => previa.has(tr.id));
  useEffect(() => {
    setPresentes(Object.fromEntries(lista.map((tr) => [tr.id, previa.get(tr.id) ?? true])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuadrillaId, lista.length, tomadaHoy.length]);

  return (
    <Pantalla volver>
      <Titulo>{t('labores.asistencia')}</Titulo>
      {yaTomada ? <Aviso texto={t('labores.asistenciaYaTomada')} /> : null}
      <Etiqueta>{t('labores.cuadrilla')}</Etiqueta>
      <View style={{ marginVertical: espaciado.sm }}>
        <Opciones
          columnas={2}
          opciones={cuadrillas.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
          valor={cuadrillaId}
          onCambio={(v) => setCuadrillaId(v as string)}
        />
      </View>
      {lista.map((tr) => {
        const presente = presentes[tr.id] ?? true;
        return (
          <View
            key={tr.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: semantico.borde,
              paddingVertical: espaciado.sm,
              gap: espaciado.sm,
            }}
          >
            <Texto style={{ flex: 1 }}>{tr.nombre}</Texto>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: presente }}
              onPress={() => setPresentes((p) => ({ ...p, [tr.id]: !presente }))}
              style={{
                minHeight: campo.alturaTactil,
                minWidth: 130,
                borderWidth: presente ? 3 : 1,
                borderColor: semantico.bordeFuerte,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: presente ? semantico.exito : semantico.peligro,
                }}
              />
              <Text style={{ fontFamily: tipografia.familias.titulo, color: semantico.titulo }}>
                {presente ? t('labores.presente') : t('labores.ausente')}
              </Text>
            </Pressable>
          </View>
        );
      })}
      <View style={{ marginTop: espaciado.lg }}>
        <Boton
          titulo={t('labores.guardarAsistencia')}
          icono="check"
          cargando={guardando}
          deshabilitado={!cuadrillaId || lista.length === 0}
          onPress={async () => {
            if (!ctx || !cuadrillaId) return;
            setGuardando(true);
            try {
              await guardarAsistencia(
                { cuadrillaId, presentes, ubicacion: await obtenerUbicacion(6000) },
                ctx,
              );
              despuesDeGuardar(() => router.back());
            } finally {
              setGuardando(false);
            }
          }}
        />
      </View>
    </Pantalla>
  );
}
