/**
 * Alerta de Fusarium R4T: foto, síntomas marcables y GPS. Queda con estado «Sospecha».
 */
import { SINTOMAS_FUSARIUM } from '@kalo/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { CapturaFotos, InfoUbicacion } from '@/componentes/Campo';
import { CampoTexto, Opciones } from '@/componentes/Controles';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, Titulo } from '@/componentes/Texto';
import { Aviso, Estado } from '@/componentes/Visuales';
import { espaciado } from '@/componentes/tema';
import { useLoteActual } from '@/gps/lote-actual';
import { obtenerUbicacion, type Ubicacion } from '@/gps/ubicacion';
import { despuesDeGuardar, useRequierePermiso } from '@/modulos/comun';
import { guardarAlertaFusarium } from '@/modulos/fusarium/servicio';
import { useContextoEscritura } from '@/permisos/contexto';
import type { ArchivoLocal } from '@/utils/archivos';

export default function Fusarium() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('fusarium:crear');
  const ctx = useContextoEscritura();
  const lote = useLoteActual();
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [sintomas, setSintomas] = useState<string[]>([]);
  const [fotos, setFotos] = useState<ArchivoLocal[]>([]);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  useEffect(() => void obtenerUbicacion().then(setUbicacion), []);

  return (
    <Pantalla volver>
      <Titulo>{t('fusarium.titulo')}</Titulo>
      <Aviso tipo="peligro" texto={t('fusarium.aviso')} />
      <View style={{ marginVertical: espaciado.md, gap: espaciado.sm }}>
        <InfoUbicacion ubicacion={ubicacion} />
        <Estado tipo={lote ? 'exito' : 'neutro'} texto={lote ? lote.nombre : t('comun.sinLote')} />
      </View>
      <CapturaFotos fotos={fotos} onCambio={setFotos} />
      <Etiqueta>{t('fusarium.sintomas')}</Etiqueta>
      <View style={{ marginVertical: espaciado.sm }}>
        <Opciones multiple opciones={SINTOMAS_FUSARIUM.map((s) => ({ valor: s.codigo, etiqueta: s.etiqueta }))} valor={sintomas} onCambio={(v) => setSintomas(v as string[])} />
      </View>
      <CampoTexto etiqueta={t('comun.notas')} valor={notas} onCambio={setNotas} multilinea autoCapitalize="sentences" />
      <Boton
        titulo={t('comun.guardar')}
        icono="triangle-alert"
        cargando={guardando}
        deshabilitado={sintomas.length === 0 && fotos.length === 0}
        onPress={async () => {
          if (!ctx) return;
          setGuardando(true);
          try {
            await guardarAlertaFusarium({ loteId: lote?.id ?? null, sintomas, notas, ubicacion, fotos }, ctx);
            despuesDeGuardar(() => router.back(), t('fusarium.enviada'));
          } finally {
            setGuardando(false);
          }
        }}
      />
    </Pantalla>
  );
}
