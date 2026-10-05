/**
 * Enfunde: racimos enfundados por lote; el color de cinta de la semana se fija solo.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { SelectorLote } from '@/componentes/Campo';
import { Contador, Opciones } from '@/componentes/Controles';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, Titulo } from '@/componentes/Texto';
import { Aviso, MuestraColor, Tarjeta } from '@/componentes/Visuales';
import { espaciado } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { obtenerUbicacion } from '@/gps/ubicacion';
import { despuesDeGuardar, useRequierePermiso } from '@/modulos/comun';
import { guardarEnfunde } from '@/modulos/enfunde/servicio';
import { useContextoEscritura } from '@/permisos/contexto';
import { useSemanaActual } from '@/utils/semana';

export default function Enfunde() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('enfunde:crear');
  const ctx = useContextoEscritura();
  const { numero, color } = useSemanaActual();
  const cuadrillas = useConsulta('cuadrillas');
  const [loteId, setLoteId] = useState<string | null>(null);
  const [cuadrillaId, setCuadrillaId] = useState<string | null>(null);
  const [racimos, setRacimos] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  return (
    <Pantalla volver>
      <Titulo>{t('enfunde.titulo')}</Titulo>
      <Tarjeta destacada>
        <Etiqueta>{t('enfunde.cintaSemana', { n: numero })}</Etiqueta>
        <View style={{ marginTop: espaciado.sm }}>
          {color ? <MuestraColor hex={color.hex} nombre={color.nombre} grande /> : null}
        </View>
      </Tarjeta>
      {!color ? <Aviso tipo="alerta" texto={t('enfunde.sinCalendario')} /> : null}
      <SelectorLote valor={loteId} onCambio={setLoteId} />
      {cuadrillas.length > 0 ? (
        <View style={{ marginTop: espaciado.lg }}>
          <Etiqueta>{t('labores.cuadrilla')}</Etiqueta>
          <View style={{ marginTop: espaciado.sm }}>
            <Opciones
              columnas={2}
              opciones={cuadrillas.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
              valor={cuadrillaId}
              onCambio={(v) => setCuadrillaId(v as string)}
            />
          </View>
        </View>
      ) : null}
      <View style={{ marginTop: espaciado.lg }}>
        <Etiqueta>{t('enfunde.racimos')}</Etiqueta>
        <View style={{ marginTop: espaciado.sm }}>
          <Contador
            valor={racimos}
            onCambio={setRacimos}
            min={0}
            max={20000}
            paso={10}
            unidad="racimos"
          />
        </View>
      </View>
      <View style={{ marginTop: espaciado.lg }}>
        <Boton
          titulo={t('comun.guardar')}
          icono="check"
          cargando={guardando}
          deshabilitado={!loteId || !racimos || !color}
          onPress={async () => {
            if (!ctx || !loteId || !racimos || !color) return;
            setGuardando(true);
            try {
              const ubicacion = await obtenerUbicacion(6000);
              await guardarEnfunde(
                { loteId, colorCintaId: color.id, racimos, cuadrillaId, ubicacion },
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
