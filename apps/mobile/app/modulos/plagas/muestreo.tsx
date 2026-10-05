/**
 * Muestreo por lote con el motor de formularios dinámicos (definición descargada).
 * Lote → plaga → preguntas del formulario → fotos, nota de voz y notas.
 */
import { esquemaDefinicionFormulario, type DefinicionFormulario } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { CapturaFotos, CapturaVoz, InfoUbicacion, SelectorLote } from '@/componentes/Campo';
import { CampoTexto, Opciones } from '@/componentes/Controles';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, Titulo } from '@/componentes/Texto';
import { Aviso } from '@/componentes/Visuales';
import { espaciado } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { obtenerUbicacion, type Ubicacion } from '@/gps/ubicacion';
import { FormularioDinamico } from '@/formularios/FormularioDinamico';
import { despuesDeGuardar, useRequierePermiso } from '@/modulos/comun';
import { guardarMuestreo } from '@/modulos/plagas/servicio';
import { useContextoEscritura } from '@/permisos/contexto';
import type { ArchivoLocal } from '@/utils/archivos';

export default function Muestreo() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('plagas:crear');
  const ctx = useContextoEscritura();
  const plagas = useConsulta('plagas', [Q.where('activo', true)]);
  const formularios = useConsulta('definiciones_formulario', [
    Q.where('codigo', 'muestreo_plagas'),
    Q.where('activo', true),
  ]);
  const [loteId, setLoteId] = useState<string | null>(null);
  const [plagaId, setPlagaId] = useState<string | null>(null);
  const [inicio, setInicio] = useState(true);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [fotos, setFotos] = useState<ArchivoLocal[]>([]);
  const [notaVoz, setNotaVoz] = useState<ArchivoLocal | null>(null);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    void obtenerUbicacion().then(setUbicacion);
  }, []);

  // La versión activa más alta del formulario descargado.
  const formulario = useMemo(() => {
    const fila = [...formularios].sort((a, b) => b.version - a.version)[0];
    if (!fila) return null;
    const r = esquemaDefinicionFormulario.safeParse(JSON.parse(fila.definicion));
    return r.success ? { id: fila.id, definicion: r.data as DefinicionFormulario } : null;
  }, [formularios]);

  if (!formulario) {
    return (
      <Pantalla volver>
        <Titulo>{t('plagas.muestreo')}</Titulo>
        <Aviso tipo="alerta" texto={t('plagas.sinFormulario')} />
      </Pantalla>
    );
  }

  if (inicio) {
    return (
      <Pantalla volver>
        <Titulo>{t('plagas.muestreo')}</Titulo>
        <Etiqueta>{t('plagas.formularioVersion', { v: formulario.definicion.version })}</Etiqueta>
        <View style={{ marginVertical: espaciado.md }}>
          <InfoUbicacion ubicacion={ubicacion} />
        </View>
        <SelectorLote valor={loteId} onCambio={setLoteId} />
        <View style={{ marginTop: espaciado.lg }}>
          <Etiqueta>{t('plagas.plaga')}</Etiqueta>
          <View style={{ marginTop: espaciado.sm }}>
            <Opciones
              opciones={plagas
                .filter((p) => p.codigo !== 'fusarium_r4t')
                .map((p) => ({ valor: p.id, etiqueta: p.nombre }))}
              valor={plagaId}
              onCambio={(v) => setPlagaId(v as string)}
            />
          </View>
        </View>
        <View style={{ marginTop: espaciado.xl }}>
          <Boton
            titulo={t('comun.siguiente')}
            icono="chevron-right"
            deshabilitado={!loteId || !plagaId}
            onPress={() => setInicio(false)}
          />
        </View>
      </Pantalla>
    );
  }

  return (
    <Pantalla volver>
      <FormularioDinamico
        definicion={formulario.definicion}
        guardando={guardando}
        pasosExtra={[
          {
            titulo: t('comun.fotos'),
            contenido: (
              <View>
                <CapturaFotos fotos={fotos} onCambio={setFotos} />
                <CapturaVoz nota={notaVoz} onCambio={setNotaVoz} />
                <CampoTexto
                  etiqueta={t('comun.notas')}
                  valor={notas}
                  onCambio={setNotas}
                  multilinea
                  autoCapitalize="sentences"
                />
              </View>
            ),
          },
        ]}
        onCompletar={async (respuestas) => {
          if (!ctx || !loteId || !plagaId) return;
          setGuardando(true);
          try {
            await guardarMuestreo(
              {
                loteId,
                plagaId,
                definicion: formulario.definicion,
                formularioId: formulario.id,
                respuestas,
                ubicacion,
                fotos,
                notaVoz,
                notas,
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
