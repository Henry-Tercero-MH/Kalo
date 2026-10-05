import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { InfoUbicacion, SelectorLote } from '@/componentes/Campo';
import { CampoTexto, Contador } from '@/componentes/Controles';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, Titulo } from '@/componentes/Texto';
import { espaciado } from '@/componentes/tema';
import { obtenerUbicacion, type Ubicacion } from '@/gps/ubicacion';
import { despuesDeGuardar, useRequierePermiso } from '@/modulos/comun';
import { guardarPreaviso } from '@/modulos/plagas/servicio';
import { useContextoEscritura } from '@/permisos/contexto';

export default function Preaviso() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('plagas:crear');
  const ctx = useContextoEscritura();
  const [loteId, setLoteId] = useState<string | null>(null);
  const [plantas, setPlantas] = useState<number | null>(10);
  const [hmje, setHmje] = useState<number | null>(null);
  const [ee, setEe] = useState<number | null>(null);
  const [severidad, setSeveridad] = useState<number | null>(null);
  const [notas, setNotas] = useState('');
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => void obtenerUbicacion().then(setUbicacion), []);

  const completo = loteId && plantas && hmje !== null && ee !== null && severidad !== null;
  const campo = (etiqueta: string, el: React.ReactNode) => (
    <View style={{ marginTop: espaciado.lg }}>
      <Etiqueta>{etiqueta}</Etiqueta>
      <View style={{ marginTop: espaciado.sm }}>{el}</View>
    </View>
  );

  return (
    <Pantalla volver>
      <Titulo>{t('plagas.preaviso')}</Titulo>
      <InfoUbicacion ubicacion={ubicacion} />
      <View style={{ marginTop: espaciado.md }}>
        <SelectorLote valor={loteId} onCambio={setLoteId} />
      </View>
      {campo(
        t('plagas.plantas'),
        <Contador valor={plantas} onCambio={setPlantas} min={1} max={100} />,
      )}
      {campo(
        t('plagas.hmje'),
        <Contador valor={hmje} onCambio={setHmje} min={0} max={20} paso={0.5} decimales={1} />,
      )}
      {campo(
        t('plagas.ee'),
        <Contador valor={ee} onCambio={setEe} min={0} max={10000} paso={50} />,
      )}
      {campo(
        t('plagas.severidad'),
        <Contador
          valor={severidad}
          onCambio={setSeveridad}
          min={0}
          max={100}
          paso={1}
          decimales={1}
          unidad="%"
        />,
      )}
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
        titulo={t('comun.guardar')}
        icono="check"
        deshabilitado={!completo}
        cargando={guardando}
        onPress={async () => {
          if (!ctx || !completo) return;
          setGuardando(true);
          try {
            await guardarPreaviso(
              {
                loteId: loteId!,
                plantas: plantas!,
                hmje: hmje!,
                ee: ee!,
                severidad: severidad!,
                notas,
                ubicacion,
              },
              ctx,
            );
            despuesDeGuardar(() => router.back());
          } finally {
            setGuardando(false);
          }
        }}
      />
    </Pantalla>
  );
}
