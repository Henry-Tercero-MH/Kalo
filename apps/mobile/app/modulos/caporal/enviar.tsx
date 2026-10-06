/**
 * Enviar datos: muestra lo guardado sin señal por tipo de registro, revisa los repetidos
 * (no se envían) y envía todo con un botón. Sin señal, los datos siguen en el teléfono.
 */
import {
  formatearFecha,
  formatearFechaHora,
  REGISTRO_TABLAS,
  type NombreTabla,
} from '@kalo/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { Pantalla } from '@/componentes/Pantalla';
import { Subtitulo, Texto, Titulo } from '@/componentes/Texto';
import { Aviso, Dato, Estado, Tarjeta } from '@/componentes/Visuales';
import { espaciado, estilosBase, semantico, tipografia } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { buscarDuplicados, type Duplicado } from '@/sync/duplicados';
import { useEstadoSync } from '@/sync/estado';
import { refrescarContadores, sincronizar } from '@/sync/motor';
import { leerRed } from '@/sync/red';

type Resultado = { tipo: 'enviado'; duplicados: number } | { tipo: 'sinSenal' } | null;

export default function EnviarDatos() {
  const { t } = useTranslation();
  const estado = useEstadoSync();
  const [duplicados, setDuplicados] = useState<Duplicado[]>([]);
  const [resultado, setResultado] = useState<Resultado>(null);
  const [enviando, setEnviando] = useState(false);
  const trabajadores = useConsulta('trabajadores');
  const nombreTrabajador = useMemo(
    () => new Map(trabajadores.map((x) => [x.id, x.nombre])),
    [trabajadores],
  );

  const revisar = useCallback(async () => {
    await refrescarContadores();
    setDuplicados(await buscarDuplicados());
  }, []);

  useEffect(() => {
    void revisar();
  }, [revisar]);

  const porTabla = Object.entries(estado.pendientesPorTabla) as [NombreTabla, number][];
  const aEnviar = Math.max(0, estado.pendientes - duplicados.length);

  const enviar = async () => {
    setEnviando(true);
    setResultado(null);
    try {
      const red = await leerRed();
      if (!red.conectado) {
        setResultado({ tipo: 'sinSenal' });
        return;
      }
      await sincronizar('manual');
      const final = useEstadoSync.getState();
      setResultado(
        final.ultimoError ? null : { tipo: 'enviado', duplicados: final.duplicadosDescartados },
      );
      await revisar();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla volver>
      <Titulo>{t('caporal.enviarTitulo')}</Titulo>

      <Tarjeta destacada>
        <Estado
          tipo={estado.conectado ? 'exito' : 'alerta'}
          texto={estado.conectado ? t('caporal.conSenal') : t('caporal.sinSenal')}
        />
        <View style={{ height: espaciado.md }} />
        <Dato
          etiqueta={t('caporal.ultimoEnvio')}
          valor={estado.ultimoEnvio ? formatearFechaHora(estado.ultimoEnvio) : t('caporal.nunca')}
        />
        <Text style={estilosBase.secundario}>{t('caporal.envioManual')}</Text>
      </Tarjeta>

      <Subtitulo>{t('caporal.porEnviar')}</Subtitulo>
      {porTabla.length === 0 ? (
        <Texto>{t('caporal.nadaPorEnviar')}</Texto>
      ) : (
        <View style={estilos.tabla}>
          {porTabla.map(([tabla, n]) => (
            <View key={tabla} style={estilos.filaTabla}>
              <Text style={[estilosBase.cuerpo, { flex: 1 }]}>
                {REGISTRO_TABLAS[tabla]?.meta.etiqueta ?? tabla}
              </Text>
              <Text style={estilos.numero}>{n}</Text>
            </View>
          ))}
          {estado.archivosPendientes > 0 ? (
            <View style={estilos.filaTabla}>
              <Text style={[estilosBase.cuerpo, { flex: 1 }]}>{t('sync.fotosEnCola')}</Text>
              <Text style={estilos.numero}>{estado.archivosPendientes}</Text>
            </View>
          ) : null}
        </View>
      )}

      <Subtitulo>{t('caporal.revisionDuplicados')}</Subtitulo>
      {duplicados.length === 0 ? (
        <Aviso tipo="exito" texto={t('caporal.sinDuplicados')} />
      ) : (
        <>
          <Aviso tipo="alerta" texto={t('caporal.duplicados', { n: duplicados.length })} />
          <View style={estilos.tabla}>
            {duplicados.map((d) => (
              <View key={d.id} style={estilos.filaTabla}>
                <View style={{ flex: 1 }}>
                  <Text style={estilosBase.cuerpo}>
                    {nombreTrabajador.get(String(d.fila.trabajador_id)) ?? '—'}
                  </Text>
                  <Text style={estilosBase.secundario}>
                    {`${REGISTRO_TABLAS[d.tabla]?.meta.etiqueta ?? d.tabla} · ${formatearFecha(String(d.fila.fecha))}`}
                  </Text>
                </View>
                <Estado tipo="neutro" texto="No se envía" />
              </View>
            ))}
          </View>
        </>
      )}

      {resultado?.tipo === 'sinSenal' ? (
        <Aviso tipo="alerta" texto={t('caporal.sinSenalAviso')} />
      ) : null}
      {resultado?.tipo === 'enviado' ? (
        <Aviso
          tipo="exito"
          texto={[
            t('caporal.enviado'),
            resultado.duplicados > 0
              ? t('caporal.enviadoDuplicados', { n: resultado.duplicados })
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ) : null}
      {estado.ultimoError ? <Aviso tipo="peligro" texto={estado.ultimoError} /> : null}

      <View style={{ marginTop: espaciado.md }}>
        <Boton
          titulo={
            enviando
              ? t('caporal.enviando')
              : estado.pendientes === 0
                ? t('caporal.nadaQueEnviar')
                : t('caporal.enviarAhora', { n: aEnviar })
          }
          icono="cloud-upload"
          cargando={enviando}
          deshabilitado={estado.pendientes === 0}
          onPress={() => void enviar()}
        />
      </View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  tabla: {
    borderTopWidth: 1,
    borderTopColor: semantico.borde,
    marginBottom: espaciado.md,
  },
  filaTabla: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingVertical: espaciado.sm,
    borderBottomWidth: 1,
    borderBottomColor: semantico.borde,
  },
  numero: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 20,
    color: semantico.titulo,
    fontVariant: ['tabular-nums'],
  },
});
