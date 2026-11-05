/**
 * Controles de formulario para campo: opciones grandes en lugar de teclado, contador con
 * botones grandes, campos con etiqueta en mayúsculas pequeñas.
 *
 * Estados de los campos: normal (borde 1 pt gris oscuro), foco (2 pt negro), error (2 pt rojo
 * y mensaje debajo), deshabilitado (fondo suave) y solo lectura. Ver `estilosCampo` en tema.ts.
 */
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Icono } from './Icono';
import { Etiqueta } from './Texto';
import {
  bordes,
  campo,
  control,
  espaciado,
  estilosBase,
  estilosCampo,
  semantico,
  tamanoIcono,
  tipografia,
} from './tema';

export interface Opcion<T extends string | number | boolean = string> {
  valor: T;
  etiqueta: string;
  /** Contenido adicional (p. ej. muestra de color). */
  prefijo?: ReactNode;
}

/** Mensaje bajo un campo: error (rojo, con ícono) o ayuda (gris). */
export function MensajeCampo({ error, ayuda }: { error?: string | null; ayuda?: string }) {
  if (error)
    return (
      <View style={estilosCampo.mensaje} accessibilityLiveRegion="polite">
        <Icono nombre="alerta" tamano={tamanoIcono.pequeno} color={semantico.peligro} />
        <Text style={estilosCampo.textoError}>{error}</Text>
      </View>
    );
  if (ayuda)
    return (
      <View style={estilosCampo.mensaje}>
        <Text style={estilosCampo.textoAyuda}>{ayuda}</Text>
      </View>
    );
  return null;
}

/**
 * Lista de opciones grandes. La seleccionada lleva borde negro de 2 pt, fondo verde claro,
 * texto en negrita y marca (no depende solo del color).
 */
export function Opciones<T extends string | number | boolean>({
  opciones,
  valor,
  onCambio,
  multiple,
  columnas = 1,
  etiqueta,
  error,
}: {
  opciones: Opcion<T>[];
  valor: T | T[] | null | undefined;
  onCambio: (v: T | T[]) => void;
  multiple?: boolean;
  columnas?: 1 | 2;
  /** Nombre del grupo para el lector de pantalla (la etiqueta visible va arriba). */
  etiqueta?: string;
  /** Mensaje de error debajo de las opciones (p. ej. «Elija una labor»). */
  error?: string | null;
}) {
  const seleccionados = Array.isArray(valor)
    ? valor
    : valor === null || valor === undefined
      ? []
      : [valor];
  return (
    <View>
      <View
        accessibilityRole={multiple ? undefined : 'radiogroup'}
        accessibilityLabel={etiqueta}
        style={[estilos.opciones, columnas === 2 && estilos.dosColumnas]}
      >
        {opciones.map((o) => {
          const activo = seleccionados.includes(o.valor);
          return (
            <Pressable
              key={String(o.valor)}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: activo }}
              onPress={() => {
                if (!multiple) return onCambio(o.valor);
                onCambio(
                  activo ? seleccionados.filter((x) => x !== o.valor) : [...seleccionados, o.valor],
                );
              }}
              style={({ pressed }) => [
                estilos.opcion,
                columnas === 2 && estilos.opcionMedia,
                Boolean(error) && !activo && estilos.opcionError,
                pressed && !activo && estilosBase.presionado,
                activo && estilos.opcionActiva,
              ]}
            >
              {o.prefijo}
              <Text style={[estilos.textoOpcion, activo && estilos.textoOpcionActiva]}>
                {o.etiqueta}
              </Text>
              {activo && <Icono nombre="confirmar" color={semantico.titulo} />}
            </Pressable>
          );
        })}
      </View>
      <MensajeCampo error={error} />
    </View>
  );
}

/** Contador numérico con botones grandes (−/+) y entrada directa. */
export function Contador({
  valor,
  onCambio,
  min = 0,
  max = 100_000,
  paso = 1,
  decimales = 0,
  unidad,
  etiqueta,
  error,
}: {
  valor: number | null;
  onCambio: (v: number | null) => void;
  min?: number;
  max?: number;
  paso?: number;
  decimales?: number;
  unidad?: string;
  /** Nombre del valor para el lector de pantalla (la etiqueta visible va arriba). */
  etiqueta?: string;
  error?: string | null;
}) {
  const { t } = useTranslation();
  const [texto, setTexto] = useState(valor === null ? '' : String(valor).replace('.', ','));
  const [enfocado, setEnfocado] = useState(false);
  const fijar = (v: number) => {
    const limitado = Math.min(
      max,
      Math.max(min, Math.round(v * 10 ** decimales) / 10 ** decimales),
    );
    setTexto(String(limitado).replace('.', ','));
    onCambio(limitado);
  };
  const enMinimo = (valor ?? 0) <= min;
  const enMaximo = (valor ?? 0) >= max;
  const nombre = etiqueta ?? t('controles.cantidad');
  return (
    <View>
      <View style={estilos.contador}>
        <BotonContador
          icono="restar"
          etiqueta={t('controles.restar', { paso: String(paso).replace('.', ',') })}
          deshabilitado={enMinimo}
          onPress={() => fijar((valor ?? 0) - paso)}
        />
        <View
          style={[
            estilos.valorContador,
            enfocado && estilos.valorContadorFoco,
            Boolean(error) && estilos.valorContadorError,
          ]}
        >
          <TextInput
            value={texto}
            onChangeText={(entrada) => {
              setTexto(entrada);
              const n = Number(entrada.replace(',', '.'));
              onCambio(entrada.trim() === '' || Number.isNaN(n) ? null : n);
            }}
            onFocus={() => setEnfocado(true)}
            onBlur={() => {
              setEnfocado(false);
              if (valor !== null) fijar(valor);
            }}
            keyboardType={decimales > 0 ? 'decimal-pad' : 'number-pad'}
            style={[estilosCampo.texto, estilos.entradaContador]}
            accessibilityLabel={unidad ? `${nombre} (${unidad})` : nombre}
            accessibilityHint={error ?? undefined}
            selectTextOnFocus
          />
          {unidad ? <Text style={estilos.unidad}>{unidad}</Text> : null}
        </View>
        <BotonContador
          icono="sumar"
          etiqueta={t('controles.sumar', { paso: String(paso).replace('.', ',') })}
          deshabilitado={enMaximo}
          onPress={() => fijar((valor ?? 0) + paso)}
        />
      </View>
      <MensajeCampo error={error} />
    </View>
  );
}

function BotonContador({
  icono,
  etiqueta,
  deshabilitado,
  onPress,
}: {
  icono: 'restar' | 'sumar';
  etiqueta: string;
  deshabilitado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.botonContador,
        pressed && estilosBase.presionado,
        deshabilitado && estilos.botonContadorInactivo,
      ]}
    >
      <Icono
        nombre={icono}
        tamano={tamanoIcono.grande}
        color={deshabilitado ? semantico.textoSecundario : semantico.titulo}
      />
    </Pressable>
  );
}

/**
 * Casilla de verificación (solo el cuadro): 44 pt, borde negro de 2 pt; marcada lleva fondo verde
 * y check. No es tocable por sí sola: va dentro de `FilaCasilla`, que da el área táctil y el rol.
 */
export function Casilla({ marcada }: { marcada: boolean }) {
  return (
    <View style={[estilos.casilla, marcada && estilos.casillaMarcada]}>
      {marcada ? (
        <Icono nombre="confirmar" tamano={tamanoIcono.grande} color={semantico.titulo} />
      ) : null}
    </View>
  );
}

/**
 * Fila tocable con casilla (rol «checkbox»). Toda la fila es el área táctil (mínimo 56 pt).
 * `lado` pone la casilla al inicio o al final; `bajoCasilla` agrega una palabra debajo del
 * cuadro (p. ej. PRESENTE / AUSENTE) para que el estado no dependa solo de la marca.
 */
export function FilaCasilla({
  marcada,
  onCambio,
  accessibilityLabel,
  children,
  lado = 'inicio',
  bajoCasilla,
  resaltarMarcada,
  style,
}: {
  marcada: boolean;
  onCambio: () => void;
  accessibilityLabel?: string;
  children: ReactNode;
  lado?: 'inicio' | 'fin';
  bajoCasilla?: ReactNode;
  /** Fondo verde claro en la fila marcada (listas de selección múltiple). */
  resaltarMarcada?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const casilla = bajoCasilla ? (
    <View style={estilos.casillaConTexto}>
      <Casilla marcada={marcada} />
      {bajoCasilla}
    </View>
  ) : (
    <Casilla marcada={marcada} />
  );
  return (
    <Pressable
      onPress={onCambio}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        estilos.filaCasilla,
        style,
        pressed && estilosBase.presionado,
        resaltarMarcada && marcada && estilos.filaMarcada,
      ]}
    >
      {lado === 'inicio' ? casilla : null}
      <View style={{ flex: 1 }}>{children}</View>
      {lado === 'fin' ? casilla : null}
    </Pressable>
  );
}

export function CampoTexto({
  etiqueta,
  valor,
  onCambio,
  multilinea,
  secreto,
  teclado,
  placeholder,
  autoCapitalize = 'none',
  maxLength,
  error,
  ayuda,
  requerido,
  opcional,
  deshabilitado,
  soloLectura,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  multilinea?: boolean;
  secreto?: boolean;
  teclado?: KeyboardTypeOptions;
  /** Solo un ejemplo del valor; la etiqueta visible siempre va arriba. */
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences';
  maxLength?: number;
  /** Mensaje debajo del campo que dice qué hacer (borde y texto en rojo). */
  error?: string | null;
  /** Texto de ayuda debajo del campo (se oculta si hay error). */
  ayuda?: string;
  /** Agrega «(obligatorio)» a la etiqueta. */
  requerido?: boolean;
  /** Agrega «(opcional)» a la etiqueta. */
  opcional?: boolean;
  deshabilitado?: boolean;
  soloLectura?: boolean;
}) {
  const { t } = useTranslation();
  const [enfocado, setEnfocado] = useState(false);
  const editable = !deshabilitado && !soloLectura;
  return (
    <View style={{ marginBottom: espaciado.md }}>
      <Etiqueta requerido={requerido} opcional={opcional}>
        {etiqueta}
      </Etiqueta>
      <TextInput
        value={valor}
        onChangeText={onCambio}
        multiline={multilinea}
        secureTextEntry={secreto}
        keyboardType={teclado}
        placeholder={placeholder}
        placeholderTextColor={semantico.textoSecundario}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        maxLength={maxLength}
        editable={editable}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        accessibilityLabel={requerido ? `${etiqueta}, ${t('comun.obligatorio')}` : etiqueta}
        accessibilityHint={error ?? ayuda}
        accessibilityState={{ disabled: !editable }}
        style={[
          estilosCampo.marco,
          estilosCampo.texto,
          estilos.campo,
          multilinea && estilos.multilinea,
          enfocado && editable && estilosCampo.marcoFoco,
          Boolean(error) && estilosCampo.marcoError,
          soloLectura && estilosCampo.marcoSoloLectura,
          deshabilitado && [estilosCampo.marcoDeshabilitado, estilosCampo.textoDeshabilitado],
        ]}
      />
      <MensajeCampo error={error} ayuda={ayuda} />
    </View>
  );
}

const estilos = StyleSheet.create({
  opciones: { gap: espaciado.sm, justifyContent: 'space-between' },
  dosColumnas: { flexDirection: 'row', flexWrap: 'wrap' },
  opcion: {
    minHeight: campo.alturaTactil,
    borderWidth: control.grosor,
    borderColor: control.borde,
    backgroundColor: semantico.fondo,
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  opcionMedia: { width: '48.5%' },
  opcionActiva: {
    borderWidth: control.grosorFoco,
    borderColor: control.bordeFoco,
    backgroundColor: control.fondoSeleccion,
    // El borde crece 1 pt: se descuenta para que el texto no se mueva.
    paddingHorizontal: espaciado.lg - control.ajusteFoco,
    paddingVertical: espaciado.sm - control.ajusteFoco,
  },
  /** Error: 2 pt rojo, igual que `estilosCampo.marcoError`. */
  opcionError: {
    borderWidth: control.grosorFoco,
    borderColor: semantico.peligro,
    paddingHorizontal: espaciado.lg - control.ajusteFoco,
    paddingVertical: espaciado.sm - control.ajusteFoco,
  },
  casilla: {
    width: campo.alturaTactil - espaciado.md,
    height: campo.alturaTactil - espaciado.md,
    borderWidth: bordes.lineaTitulo,
    borderColor: semantico.bordeFuerte,
    backgroundColor: semantico.fondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaMarcada: { backgroundColor: semantico.acento },
  casillaConTexto: {
    alignItems: 'center',
    gap: espaciado.xs,
    minWidth: campo.alturaTactil + espaciado.lg,
  },
  filaCasilla: {
    minHeight: campo.alturaTactil,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  filaMarcada: { backgroundColor: control.fondoSeleccion },
  textoOpcion: {
    flex: 1,
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: tipografia.tamanos.subtitulo,
    color: semantico.titulo,
  },
  textoOpcionActiva: { fontFamily: tipografia.familias.titulo },
  contador: { flexDirection: 'row', alignItems: 'stretch', gap: espaciado.sm },
  botonContador: {
    width: campo.alturaTactil + espaciado.lg,
    minHeight: campo.alturaTactil + espaciado.lg,
    borderWidth: control.grosorFoco,
    borderColor: semantico.bordeFuerte,
    backgroundColor: semantico.fondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonContadorInactivo: { borderColor: semantico.borde, backgroundColor: semantico.fondoSuave },
  valorContador: {
    flex: 1,
    borderWidth: control.grosor,
    borderColor: control.borde,
    backgroundColor: semantico.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espaciado.xs,
    paddingHorizontal: control.ajusteFoco,
  },
  // El borde crece 1 pt: se descuenta del padding para que el número no salte.
  valorContadorFoco: {
    borderWidth: control.grosorFoco,
    borderColor: control.bordeFoco,
    paddingVertical: espaciado.xs - control.ajusteFoco,
    paddingHorizontal: 0,
  },
  valorContadorError: {
    borderWidth: control.grosorFoco,
    borderColor: semantico.peligro,
    paddingVertical: espaciado.xs - control.ajusteFoco,
    paddingHorizontal: 0,
  },
  entradaContador: {
    fontFamily: tipografia.familias.titulo,
    fontSize: tipografia.tamanos.tituloGrande,
    textAlign: 'center',
    alignSelf: 'stretch',
    fontVariant: ['tabular-nums'],
  },
  unidad: {
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.tamanos.pequeno,
    color: semantico.textoSecundario,
  },
  campo: { marginTop: espaciado.xs },
  multilinea: {
    minHeight: campo.alturaTactil * 2,
    textAlignVertical: 'top',
    paddingTop: espaciado.md,
    paddingBottom: espaciado.md,
  },
});
