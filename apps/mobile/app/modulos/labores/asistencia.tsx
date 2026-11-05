/**
 * Toma de asistencia del personal a cargo del caporal: por cada trabajador se ve su código, nombre y centro de
 * costo, y una casilla de PRESENTE. Si no llegó, se justifica con un motivo (Suspendido por
 * IGSS, Permiso, Vacaciones…); «Otro» pide una nota. No se guarda con ausencias sin justificar.
 */
import { fechaIso, MOTIVOS_AUSENCIA, type MotivoAusencia } from '@kalo/shared';
import { Q } from '@nozbe/watermelondb';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { CampoTexto, FilaCasilla, Opciones } from '@/componentes/Controles';
import { Icono } from '@/componentes/Icono';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, TextoNombre, Titulo } from '@/componentes/Texto';
import { Aviso, Estado } from '@/componentes/Visuales';
import { campo, control, espaciado, estilosBase, semantico, tipografia } from '@/componentes/tema';
import { useConsulta } from '@/db/hooks';
import { obtenerUbicacion } from '@/gps/ubicacion';
import { despuesDeGuardar, useRequierePermiso } from '@/modulos/comun';
import {
  faltaJustificar,
  guardarAsistencia,
  type MarcaAsistencia,
} from '@/modulos/labores/servicio';
import { usePersonalACargo } from '@/modulos/caporal/personal';
import { useContextoEscritura } from '@/permisos/contexto';

const MOTIVOS = Object.entries(MOTIVOS_AUSENCIA) as [MotivoAusencia, string][];

export default function Asistencia() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('labores:crear');
  const ctx = useContextoEscritura();
  const { lista, cuadrillaDe } = usePersonalACargo();
  const [marcas, setMarcas] = useState<Record<string, MarcaAsistencia>>({});
  const [guardando, setGuardando] = useState(false);

  // Si ya se tomó hoy, se muestra lo guardado (volver a guardar corrige, no duplica).
  const hoy = fechaIso();
  const tomadaHoy = useConsulta('asistencia', [Q.where('fecha', hoy)], [hoy]);
  const yaTomada = lista.some((tr) => tomadaHoy.some((a) => a.trabajador_id === tr.id));

  useEffect(() => {
    const previa = new Map(tomadaHoy.map((a) => [a.trabajador_id, a]));
    setMarcas(
      Object.fromEntries(
        lista.map((tr) => {
          const p = previa.get(tr.id);
          return [
            tr.id,
            {
              presente: p ? p.presente : true,
              motivo: (p?.motivo_ausencia as MotivoAusencia | null) ?? null,
              nota: p?.nota_ausencia ?? '',
              centroCosto: tr.centro_costo,
            },
          ];
        }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista.length, tomadaHoy.length]);

  const cambiar = (id: string, parcial: Partial<MarcaAsistencia>) =>
    setMarcas((m) => ({ ...m, [id]: { ...m[id]!, ...parcial } }));

  const valores = lista.map((tr) => marcas[tr.id]).filter(Boolean) as MarcaAsistencia[];
  const presentes = valores.filter((m) => m.presente).length;
  const ausentes = valores.length - presentes;
  const sinJustificar = valores.filter(faltaJustificar).length;

  return (
    <Pantalla volver>
      <Titulo>{t('caporal.asistencia')}</Titulo>
      {yaTomada ? <Aviso texto={t('labores.asistenciaYaTomada')} /> : null}

      <Text style={estilosBase.etiqueta}>{t('asistencia.personal', { n: lista.length })}</Text>

      <View style={estilos.resumen}>
        <Resumen etiqueta={t('asistencia.presentes')} valor={presentes} />
        <Resumen etiqueta={t('asistencia.ausentes')} valor={ausentes} />
        <Resumen
          etiqueta={t('asistencia.porJustificar')}
          valor={sinJustificar}
          alerta={sinJustificar > 0}
        />
      </View>
      <Pressable
        onPress={() =>
          setMarcas((m) =>
            Object.fromEntries(Object.entries(m).map(([id, x]) => [id, { ...x, presente: true }])),
          )
        }
        accessibilityRole="button"
        style={({ pressed }) => [estilos.todos, pressed && estilosBase.presionado]}
      >
        <Icono nombre="confirmar" color={semantico.titulo} />
        <Text style={estilos.todosTexto}>{t('asistencia.todosPresentes')}</Text>
      </Pressable>

      {lista.map((tr) => {
        const m = marcas[tr.id];
        if (!m) return null;
        const pendiente = faltaJustificar(m);
        return (
          <View
            key={tr.id}
            style={[
              estilos.tarjeta,
              !m.presente && estilos.tarjetaAusente,
              pendiente && estilos.tarjetaPendiente,
            ]}
          >
            {/* Casilla con la palabra debajo: el estado no depende solo de la marca. */}
            <FilaCasilla
              marcada={m.presente}
              onCambio={() => cambiar(tr.id, { presente: !m.presente })}
              accessibilityLabel={`${tr.codigo} ${tr.nombre}`}
              lado="fin"
              style={estilos.fila}
              bajoCasilla={
                <Text style={[estilosBase.etiqueta, !m.presente && { color: semantico.titulo }]}>
                  {m.presente ? t('labores.presente') : t('labores.ausente')}
                </Text>
              }
            >
              <View style={estilos.datosTrabajador}>
                <View style={estilos.codigo}>
                  <Text style={estilos.codigoTexto}>{tr.codigo}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <TextoNombre>{tr.nombre}</TextoNombre>
                  <Text style={estilosBase.secundario}>
                    {tr.centro_costo ?? t('asistencia.sinCentroCosto')}
                  </Text>
                </View>
              </View>
            </FilaCasilla>

            {!m.presente ? (
              <View style={estilos.justificacion}>
                {pendiente ? (
                  <View style={{ marginBottom: espaciado.sm }}>
                    <Estado tipo="alerta" texto={t('asistencia.porJustificar')} />
                  </View>
                ) : null}
                <Etiqueta requerido>{t('asistencia.porQue')}</Etiqueta>
                {/* Mismo control de selección que el resto de la app (verde claro + borde + check). */}
                <View style={{ marginTop: espaciado.sm }}>
                  <Opciones<MotivoAusencia>
                    columnas={2}
                    etiqueta={t('asistencia.porQue')}
                    opciones={MOTIVOS.map(([codigo, nombre]) => ({
                      valor: codigo,
                      etiqueta: nombre,
                    }))}
                    valor={m.motivo}
                    onCambio={(v) => cambiar(tr.id, { motivo: v as MotivoAusencia })}
                  />
                </View>
                {m.motivo === 'otro' ? (
                  <View style={{ marginTop: espaciado.md }}>
                    <CampoTexto
                      etiqueta={t('asistencia.notaOtro')}
                      valor={m.nota}
                      onCambio={(v) => cambiar(tr.id, { nota: v })}
                      placeholder={t('asistencia.notaOtroAyuda')}
                      autoCapitalize="sentences"
                      requerido
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      <View style={{ marginTop: espaciado.lg }}>
        {sinJustificar > 0 ? (
          <Aviso tipo="alerta" texto={t('asistencia.faltaJustificar', { n: sinJustificar })} />
        ) : null}
        <Boton
          titulo={t('labores.guardarAsistencia')}
          icono="guardar"
          cargando={guardando}
          deshabilitado={lista.length === 0 || sinJustificar > 0}
          onPress={async () => {
            if (!ctx) return;
            setGuardando(true);
            try {
              await guardarAsistencia(
                { cuadrillaDe, marcas, ubicacion: await obtenerUbicacion(6000) },
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

function Resumen({
  etiqueta,
  valor,
  alerta,
}: {
  etiqueta: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <View style={[estilos.resumenCaja, alerta && estilos.resumenCajaAlerta]}>
      <Text style={estilos.resumenValor}>{valor}</Text>
      <Text style={estilosBase.etiqueta} numberOfLines={1}>
        {etiqueta}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  resumen: { flexDirection: 'row', gap: espaciado.sm, marginTop: espaciado.md },
  resumenCaja: {
    flex: 1,
    paddingVertical: espaciado.sm,
    alignItems: 'center',
    borderWidth: control.grosor,
    borderColor: semantico.borde,
  },
  resumenCajaAlerta: {
    borderColor: semantico.alerta,
    borderWidth: control.grosorFoco,
    paddingVertical: espaciado.sm - control.ajusteFoco,
  },
  resumenValor: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.tituloGrande,
    color: semantico.titulo,
    fontVariant: ['tabular-nums'],
  },
  todos: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    minHeight: campo.alturaTactil,
    paddingHorizontal: espaciado.sm,
    marginVertical: espaciado.xs,
  },
  todosTexto: {
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: tipografia.tamanos.cuerpo,
    color: semantico.titulo,
    textDecorationLine: 'underline',
  },
  // El borde pasa de 1 a 2 pt cuando falta el motivo: el padding de 1 pt se descuenta para que
  // el contenido no salte.
  tarjeta: {
    borderWidth: control.grosor,
    borderColor: semantico.borde,
    padding: control.ajusteFoco,
    marginBottom: espaciado.sm,
  },
  tarjetaAusente: { backgroundColor: semantico.fondoSuave },
  tarjetaPendiente: { borderColor: semantico.alerta, borderWidth: control.grosorFoco, padding: 0 },
  fila: {
    minHeight: campo.alturaTactil + espaciado.lg,
    padding: espaciado.md,
  },
  datosTrabajador: { flexDirection: 'row', alignItems: 'center', gap: espaciado.md },
  codigo: {
    minWidth: campo.alturaTactil - espaciado.xs,
    paddingVertical: espaciado.xs,
    paddingHorizontal: espaciado.xs,
    backgroundColor: semantico.superficieInvertida,
    alignItems: 'center',
  },
  codigoTexto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.pequeno,
    color: semantico.textoSobreOscuro,
    letterSpacing: tipografia.espaciadoLetras.titulo,
  },
  justificacion: {
    paddingHorizontal: espaciado.md,
    paddingBottom: espaciado.md,
  },
});
