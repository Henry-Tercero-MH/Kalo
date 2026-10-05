import { formatearNumero, semanaIso } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { MapaFinca } from '@/componentes/MapaFinca';
import { Pantalla } from '@/componentes/Pantalla';
import { Subtitulo, Texto, Titulo } from '@/componentes/Texto';
import { Estado } from '@/componentes/Visuales';
import { espaciado } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { useLotes } from '@/gps/lote-actual';

export default function MapaPestana() {
  const { t } = useTranslation();
  const lotes = useLotes();
  const s = useMemo(() => semanaIso(new Date()), []);
  const cobertura = useConsulta('cobertura_lote', [Q.where('anio', s.anio), Q.where('semana', s.numero)], [s.anio]);
  return (
    <Pantalla>
      <Titulo>{t('mapa.titulo')}</Titulo>
      <MapaFinca />
      <Subtitulo>{t('mapa.cobertura')}</Subtitulo>
      {cobertura.length === 0 ? <Texto>{t('mapa.sinCobertura')}</Texto> : null}
      {lotes.map((l) => {
        const c = cobertura.find((x) => x.lote_id === l.id);
        if (!c) return null;
        return (
          <View key={l.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: espaciado.sm }}>
            <Texto>{l.nombre}</Texto>
            <Estado tipo={c.porcentaje >= 60 ? 'exito' : 'alerta'} texto={`${formatearNumero(c.porcentaje, 1)} % cubierto`} />
          </View>
        );
      })}
    </Pantalla>
  );
}
