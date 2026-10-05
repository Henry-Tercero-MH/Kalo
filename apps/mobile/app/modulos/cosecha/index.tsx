/**
 * Cosecha: racimos cosechados y perdidos por lote y color de cinta.
 * Se proponen los colores enfundados hace 11–13 semanas (edad de cosecha).
 */
import { sumarSemanas } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { SelectorLote } from '@/componentes/Campo';
import { CampoTexto, Contador, Opciones } from '@/componentes/Controles';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, Titulo } from '@/componentes/Texto';
import { MuestraColor } from '@/componentes/Visuales';
import { espaciado } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { obtenerUbicacion } from '@/gps/ubicacion';
import { EDADES_COSECHA, guardarCosecha } from '@/modulos/cosecha/servicio';
import { despuesDeGuardar, useRequierePermiso } from '@/modulos/comun';
import { useContextoEscritura } from '@/permisos/contexto';
import { useSemanaActual } from '@/utils/semana';

export default function Cosecha() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('cosecha:crear');
  const ctx = useContextoEscritura();
  const { anio, numero, colores } = useSemanaActual();
  const anteriores = useMemo(
    () => EDADES_COSECHA.map((e) => sumarSemanas({ anio, numero }, -e)),
    [anio, numero],
  );
  const semanas = useConsulta(
    'semanas',
    [Q.where('anio', Q.oneOf([...new Set(anteriores.map((s) => s.anio))]))],
    [anio],
  );
  const cuadrillas = useConsulta('cuadrillas');
  const sugeridos = new Set(
    semanas
      .filter((s) => anteriores.some((a) => a.anio === s.anio && a.numero === s.numero))
      .map((s) => s.color_cinta_id),
  );
  const ordenados = [...colores].sort(
    (a, b) => Number(sugeridos.has(b.id)) - Number(sugeridos.has(a.id)),
  );

  const [loteId, setLoteId] = useState<string | null>(null);
  const [colorId, setColorId] = useState<string | null>(null);
  const [cuadrillaId, setCuadrillaId] = useState<string | null>(null);
  const [cosechados, setCosechados] = useState<number | null>(null);
  const [perdidos, setPerdidos] = useState<number | null>(0);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  return (
    <Pantalla volver>
      <Titulo>{t('cosecha.titulo')}</Titulo>
      <SelectorLote valor={loteId} onCambio={setLoteId} />
      <View style={{ marginTop: espaciado.lg }}>
        <Etiqueta>{t('cosecha.cinta')}</Etiqueta>
        <View style={{ marginTop: espaciado.sm }}>
          <Opciones
            columnas={2}
            opciones={ordenados.map((c) => ({
              valor: c.id,
              etiqueta: sugeridos.has(c.id) ? `${c.nombre} — ${t('cosecha.sugerido')}` : c.nombre,
              prefijo: <MuestraColor hex={c.hex} />,
            }))}
            valor={colorId}
            onCambio={(v) => setColorId(v as string)}
          />
        </View>
      </View>
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
        <Etiqueta>{t('cosecha.cosechados')}</Etiqueta>
        <View style={{ marginTop: espaciado.sm }}>
          <Contador
            valor={cosechados}
            onCambio={setCosechados}
            min={0}
            max={20000}
            paso={10}
            unidad="racimos"
          />
        </View>
      </View>
      <View style={{ marginTop: espaciado.lg }}>
        <Etiqueta>{t('cosecha.perdidos')}</Etiqueta>
        <View style={{ marginTop: espaciado.sm }}>
          <Contador valor={perdidos} onCambio={setPerdidos} min={0} max={20000} unidad="racimos" />
        </View>
      </View>
      {perdidos ? (
        <View style={{ marginTop: espaciado.lg }}>
          <CampoTexto
            etiqueta={t('cosecha.motivo')}
            valor={motivo}
            onCambio={setMotivo}
            autoCapitalize="sentences"
          />
        </View>
      ) : null}
      <View style={{ marginTop: espaciado.lg }}>
        <Boton
          titulo={t('comun.guardar')}
          icono="check"
          cargando={guardando}
          deshabilitado={!loteId || !colorId || cosechados === null}
          onPress={async () => {
            if (!ctx || !loteId || !colorId || cosechados === null) return;
            setGuardando(true);
            try {
              const ubicacion = await obtenerUbicacion(6000);
              await guardarCosecha(
                {
                  loteId,
                  colorCintaId: colorId,
                  cosechados,
                  perdidos: perdidos ?? 0,
                  motivo: motivo.trim() || null,
                  cuadrillaId,
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
      </View>
    </Pantalla>
  );
}
