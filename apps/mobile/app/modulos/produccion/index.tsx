/**
 * Mi producción: labores registradas a nombre del trabajador vinculado al usuario.
 */
import { formatearFecha, formatearNumero, semanaIso } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Pantalla } from '@/componentes/Pantalla';
import { Subtitulo, Texto, TextoSecundario, Titulo } from '@/componentes/Texto';
import { Estado } from '@/componentes/Visuales';
import { espaciado, semantico } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { useRequierePermiso } from '@/modulos/comun';
import { useSesion } from '@/permisos/sesion';

export default function Produccion() {
  const { t } = useTranslation();
  useRequierePermiso('produccion:ver_propia');
  const usuario = useSesion((s) => s.usuario);
  const labores = useConsulta(
    'labores',
    [Q.where('trabajador_id', usuario?.trabajadorId ?? '__'), Q.sortBy('fecha', Q.desc)],
    [usuario?.trabajadorId],
  );
  const tipos = useConsulta('tipos_labor');
  const s = useMemo(() => semanaIso(new Date()), []);
  const totales = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of labores) {
      const sl = semanaIso(new Date(`${l.fecha}T12:00:00`));
      if (sl.anio === s.anio && sl.numero === s.numero)
        m.set(l.tipo_labor_id, (m.get(l.tipo_labor_id) ?? 0) + l.cantidad);
    }
    return m;
  }, [labores, s]);

  return (
    <Pantalla volver>
      <Titulo>{t('produccion.titulo')}</Titulo>
      <Subtitulo>{t('produccion.semanaActual')}</Subtitulo>
      {totales.size === 0 ? <Texto>{t('produccion.sinDatos')}</Texto> : null}
      {[...totales.entries()].map(([tipoId, total]) => {
        const tipo = tipos.find((x) => x.id === tipoId);
        return (
          <View
            key={tipoId}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: espaciado.sm,
              borderBottomWidth: 1,
              borderBottomColor: semantico.borde,
            }}
          >
            <Texto>{tipo?.nombre ?? '—'}</Texto>
            <Texto
              style={{ fontVariant: ['tabular-nums'] }}
            >{`${formatearNumero(total, tipo?.unidad === 'hectareas' ? 1 : 0)} ${tipo?.unidad ?? ''}`}</Texto>
          </View>
        );
      })}
      <Subtitulo>{t('comun.fecha')}</Subtitulo>
      {labores.slice(0, 30).map((l) => (
        <View
          key={l.id}
          style={{
            paddingVertical: espaciado.sm,
            borderBottomWidth: 1,
            borderBottomColor: semantico.borde,
          }}
        >
          <Texto>{`${tipos.find((x) => x.id === l.tipo_labor_id)?.nombre ?? '—'} · ${formatearNumero(l.cantidad, 1)}`}</Texto>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextoSecundario>{formatearFecha(l.fecha)}</TextoSecundario>
            <Estado
              tipo={
                l.estado_validacion === 'validado'
                  ? 'exito'
                  : l.estado_validacion === 'rechazado'
                    ? 'peligro'
                    : 'alerta'
              }
              texto={t(`estados.${l.estado_validacion}`)}
            />
          </View>
        </View>
      ))}
    </Pantalla>
  );
}
