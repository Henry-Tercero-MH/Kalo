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
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { Icono } from '@/componentes/Icono';
import { Pantalla } from '@/componentes/Pantalla';
import { Titulo } from '@/componentes/Texto';
import { Aviso } from '@/componentes/Visuales';
import { campo, espaciado, estilosBase, semantico, tipografia } from '@/componentes/tema';
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
        style={estilos.todos}
      >
        <Icono nombre="check" tamano={18} color={semantico.titulo} />
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
            <Pressable
              onPress={() => cambiar(tr.id, { presente: !m.presente })}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: m.presente }}
              accessibilityLabel={`${tr.codigo} ${tr.nombre}`}
              style={estilos.fila}
            >
              <View style={estilos.codigo}>
                <Text style={estilos.codigoTexto}>{tr.codigo}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={estilos.nombre}>{tr.nombre}</Text>
                <Text style={estilosBase.secundario}>
                  {tr.centro_costo ?? t('asistencia.sinCentroCosto')}
                </Text>
              </View>
              <View style={[estilos.casilla, m.presente && estilos.casillaMarcada]}>
                {m.presente ? <Icono nombre="check" tamano={26} color={semantico.titulo} /> : null}
              </View>
            </Pressable>

            {!m.presente ? (
              <View style={estilos.justificacion}>
                <Text style={estilosBase.etiqueta}>{t('asistencia.porQue')}</Text>
                <View style={estilos.motivos}>
                  {MOTIVOS.map(([codigo, nombre]) => {
                    const activo = m.motivo === codigo;
                    return (
                      <Pressable
                        key={codigo}
                        onPress={() => cambiar(tr.id, { motivo: codigo })}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: activo }}
                        style={[estilos.motivo, activo && estilos.motivoActivo]}
                      >
                        <Text style={[estilos.motivoTexto, activo && estilos.motivoTextoActivo]}>
                          {nombre}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {m.motivo === 'otro' ? (
                  <TextInput
                    value={m.nota}
                    onChangeText={(v) => cambiar(tr.id, { nota: v })}
                    placeholder={t('asistencia.notaOtro')}
                    placeholderTextColor={semantico.textoSecundario}
                    accessibilityLabel={t('asistencia.notaOtro')}
                    style={estilos.nota}
                  />
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
          icono="check"
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
    <View
      style={[estilos.resumenCaja, alerta && { borderColor: semantico.alerta, borderWidth: 2 }]}
    >
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
    borderWidth: 1,
    borderColor: semantico.borde,
  },
  resumenValor: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 24,
    color: semantico.titulo,
    fontVariant: ['tabular-nums'],
  },
  todos: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
    minHeight: 44,
    marginVertical: espaciado.sm,
  },
  todosTexto: {
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: tipografia.tamanos.pequeno,
    color: semantico.titulo,
    textDecorationLine: 'underline',
  },
  tarjeta: { borderWidth: 1, borderColor: semantico.borde, marginBottom: espaciado.sm },
  tarjetaAusente: { backgroundColor: semantico.fondoSuave },
  tarjetaPendiente: { borderColor: semantico.alerta, borderWidth: 2 },
  fila: {
    minHeight: campo.alturaTactil + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
  },
  codigo: {
    minWidth: 52,
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: semantico.bordeFuerte,
    alignItems: 'center',
  },
  codigoTexto: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 14,
    color: semantico.fondo,
    letterSpacing: 0.5,
  },
  nombre: { fontFamily: tipografia.familias.titulo, fontSize: 16, color: semantico.titulo },
  casilla: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: semantico.bordeFuerte,
    backgroundColor: semantico.fondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaMarcada: { backgroundColor: semantico.acento },
  justificacion: {
    paddingHorizontal: espaciado.md,
    paddingBottom: espaciado.md,
  },
  motivos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm, marginTop: espaciado.sm },
  motivo: {
    minHeight: 44,
    paddingHorizontal: espaciado.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: semantico.bordeFuerte,
    backgroundColor: semantico.fondo,
  },
  motivoActivo: { backgroundColor: semantico.bordeFuerte },
  motivoTexto: {
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: 14,
    color: semantico.titulo,
  },
  motivoTextoActivo: { color: semantico.fondo },
  nota: {
    marginTop: espaciado.sm,
    minHeight: campo.alturaTactil,
    borderWidth: 2,
    borderColor: semantico.borde,
    paddingHorizontal: espaciado.md,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: 16,
    color: semantico.titulo,
    backgroundColor: semantico.fondo,
  },
});
