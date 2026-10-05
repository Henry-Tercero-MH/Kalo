/**
 * Labor por trabajador (destajo): tipo de labor, lote, trabajador y cantidad en su unidad.
 */
import { Q } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { SelectorLote } from '@/componentes/Campo';
import { CampoTexto, Contador, Opciones } from '@/componentes/Controles';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, Titulo } from '@/componentes/Texto';
import { espaciado } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { obtenerUbicacion } from '@/gps/ubicacion';
import { despuesDeGuardar, useRequierePermiso } from '@/modulos/comun';
import { guardarLabor } from '@/modulos/labores/servicio';
import { useContextoEscritura } from '@/permisos/contexto';

export default function Labor() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('labores:crear');
  const ctx = useContextoEscritura();
  const tipos = useConsulta('tipos_labor', [Q.where('activo', true)]);
  const trabajadores = useConsulta('trabajadores', [Q.where('activo', true)]);
  const [tipoId, setTipoId] = useState<string | null>(null);
  const [loteId, setLoteId] = useState<string | null>(null);
  const [trabajadorId, setTrabajadorId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState<number | null>(null);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const tipo = tipos.find((x) => x.id === tipoId);
  const trabajador = trabajadores.find((x) => x.id === trabajadorId);

  return (
    <Pantalla volver>
      <Titulo>{t('labores.labor')}</Titulo>
      <Etiqueta>{t('labores.tipo')}</Etiqueta>
      <View style={{ marginVertical: espaciado.sm }}>
        <Opciones columnas={2} opciones={tipos.map((x) => ({ valor: x.id, etiqueta: x.nombre }))} valor={tipoId} onCambio={(v) => setTipoId(v as string)} />
      </View>
      <SelectorLote valor={loteId} onCambio={setLoteId} />
      <View style={{ marginTop: espaciado.lg }}>
        <Etiqueta>{t('labores.trabajador')}</Etiqueta>
        <View style={{ marginTop: espaciado.sm }}>
          <Opciones opciones={trabajadores.map((x) => ({ valor: x.id, etiqueta: `${x.codigo} · ${x.nombre}` }))} valor={trabajadorId} onCambio={(v) => setTrabajadorId(v as string)} />
        </View>
      </View>
      <View style={{ marginTop: espaciado.lg }}>
        <Etiqueta>{t('labores.cantidad', { u: tipo?.unidad ?? '' })}</Etiqueta>
        <View style={{ marginTop: espaciado.sm }}>
          <Contador valor={cantidad} onCambio={setCantidad} min={0} max={10000} decimales={tipo?.unidad === 'hectareas' ? 1 : 0} unidad={tipo?.unidad} />
        </View>
      </View>
      <View style={{ marginTop: espaciado.lg }}>
        <CampoTexto etiqueta={t('comun.notas')} valor={notas} onCambio={setNotas} multilinea autoCapitalize="sentences" />
      </View>
      <Boton
        titulo={t('comun.guardar')}
        icono="check"
        cargando={guardando}
        deshabilitado={!tipoId || !loteId || !trabajadorId || !cantidad}
        onPress={async () => {
          if (!ctx || !tipoId || !loteId || !cantidad) return;
          setGuardando(true);
          try {
            await guardarLabor(
              { tipoLaborId: tipoId, loteId, trabajadorId, cuadrillaId: trabajador?.cuadrilla_id ?? null, cantidad, notas, ubicacion: await obtenerUbicacion(6000) },
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
