/**
 * Labor por trabajador (destajo): tipo de labor, lote, trabajador y cantidad en su unidad.
 */
import { decimalesUnidad, etiquetaUnidad } from '@kalo/shared';
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
import { EstadoVacio } from '@/componentes/Visuales';
import { espaciado } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { obtenerUbicacion } from '@/gps/ubicacion';
import { despuesDeGuardar, useRequierePermiso } from '@/modulos/comun';
import { guardarLabor } from '@/modulos/labores/servicio';
import { useContextoEscritura } from '@/permisos/contexto';

/** Con pocas personas la lista se ve completa; el buscador aparece desde esta cantidad. */
const MINIMO_PARA_BUSCAR = 8;

/** Minúsculas y sin tildes, para que «Jose» encuentre «José». */
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

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
  // Búsqueda local de presentación: solo filtra lo que se ve. El trabajador elegido sigue
  // visible aunque no coincida, para que la selección nunca quede oculta.
  const [busqueda, setBusqueda] = useState('');
  const filtro = normalizar(busqueda.trim());
  const visibles = filtro
    ? trabajadores.filter(
        (x) => x.id === trabajadorId || normalizar(`${x.codigo} ${x.nombre}`).includes(filtro),
      )
    : trabajadores;

  return (
    <Pantalla volver>
      <Titulo>{t('labores.labor')}</Titulo>
      <Etiqueta requerido>{t('labores.tipo')}</Etiqueta>
      <View style={{ marginVertical: espaciado.sm }}>
        {tipos.length === 0 ? (
          <EstadoVacio
            icono="labores"
            titulo={t('labores.sinTipos')}
            descripcion={t('labores.sinDatosAyuda')}
          />
        ) : (
          <Opciones
            columnas={2}
            etiqueta={t('labores.tipo')}
            opciones={tipos.map((x) => ({ valor: x.id, etiqueta: x.nombre }))}
            valor={tipoId}
            onCambio={(v) => setTipoId(v as string)}
          />
        )}
      </View>
      <SelectorLote valor={loteId} onCambio={setLoteId} requerido />
      <View style={{ marginTop: espaciado.lg }}>
        <Etiqueta requerido>{t('labores.trabajador')}</Etiqueta>
        <View style={{ marginTop: espaciado.sm }}>
          {trabajadores.length === 0 ? (
            <EstadoVacio
              icono="trabajadores"
              titulo={t('labores.sinTrabajadores')}
              descripcion={t('labores.sinDatosAyuda')}
            />
          ) : (
            <>
              {/* Filtro solo de la lista visible; no cambia qué trabajador se guarda. */}
              {trabajadores.length > MINIMO_PARA_BUSCAR ? (
                <CampoTexto
                  etiqueta={t('labores.buscarTrabajador')}
                  valor={busqueda}
                  onCambio={setBusqueda}
                  placeholder={t('labores.buscarTrabajadorAyuda')}
                  opcional
                />
              ) : null}
              {visibles.length === 0 ? (
                <EstadoVacio
                  icono="trabajadores"
                  titulo={t('labores.sinCoincidencias', { texto: busqueda.trim() })}
                />
              ) : (
                <Opciones
                  etiqueta={t('labores.trabajador')}
                  opciones={visibles.map((x) => ({
                    valor: x.id,
                    etiqueta: `${x.codigo} · ${x.nombre}`,
                  }))}
                  valor={trabajadorId}
                  onCambio={(v) => setTrabajadorId(v as string)}
                />
              )}
            </>
          )}
        </View>
      </View>
      <View style={{ marginTop: espaciado.lg }}>
        <Etiqueta requerido>{t('labores.cantidad', { u: etiquetaUnidad(tipo?.unidad) })}</Etiqueta>
        <View style={{ marginTop: espaciado.sm }}>
          <Contador
            etiqueta={t('labores.cantidad', { u: etiquetaUnidad(tipo?.unidad) })}
            valor={cantidad}
            onCambio={setCantidad}
            min={0}
            max={10000}
            decimales={decimalesUnidad(tipo?.unidad)}
            unidad={etiquetaUnidad(tipo?.unidad)}
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
        titulo={t('comun.guardar')}
        icono="guardar"
        cargando={guardando}
        deshabilitado={!tipoId || !loteId || !trabajadorId || !cantidad}
        motivoDeshabilitado={t('labores.faltanDatos')}
        onPress={async () => {
          if (!ctx || !tipoId || !loteId || !cantidad) return;
          setGuardando(true);
          try {
            await guardarLabor(
              {
                tipoLaborId: tipoId,
                loteId,
                trabajadorId,
                cuadrillaId: trabajador?.cuadrilla_id ?? null,
                cantidad,
                notas,
                ubicacion: await obtenerUbicacion(6000),
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
