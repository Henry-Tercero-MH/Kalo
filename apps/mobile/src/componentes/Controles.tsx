/**
 * Controles de formulario para campo: opciones grandes en lugar de teclado, contador con
 * botones grandes, campos con etiqueta en mayúsculas pequeñas.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { Icono } from './Icono';
import { Etiqueta } from './Texto';
import { campo, espaciado, semantico, tipografia } from './tema';

export interface Opcion<T extends string | number | boolean = string> {
  valor: T;
  etiqueta: string;
  /** Contenido adicional (p. ej. muestra de color). */
  prefijo?: ReactNode;
}

/** Lista de opciones grandes. La seleccionada lleva borde negro grueso y marca. */
export function Opciones<T extends string | number | boolean>({
  opciones,
  valor,
  onCambio,
  multiple,
  columnas = 1,
}: {
  opciones: Opcion<T>[];
  valor: T | T[] | null | undefined;
  onCambio: (v: T | T[]) => void;
  multiple?: boolean;
  columnas?: 1 | 2;
}) {
  const seleccionados = Array.isArray(valor) ? valor : valor === null || valor === undefined ? [] : [valor];
  return (
    <View style={[estilos.opciones, columnas === 2 && { flexDirection: 'row', flexWrap: 'wrap' }]}>
      {opciones.map((o) => {
        const activo = seleccionados.includes(o.valor);
        return (
          <Pressable
            key={String(o.valor)}
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: activo }}
            onPress={() => {
              if (!multiple) return onCambio(o.valor);
              onCambio(activo ? seleccionados.filter((x) => x !== o.valor) : [...seleccionados, o.valor]);
            }}
            style={[estilos.opcion, columnas === 2 && { width: '48.5%' }, activo && estilos.opcionActiva]}
          >
            {o.prefijo}
            <Text style={[estilos.textoOpcion, activo && { fontFamily: tipografia.familias.titulo }]}>{o.etiqueta}</Text>
            {activo && <Icono nombre="check" color={semantico.titulo} />}
          </Pressable>
        );
      })}
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
}: {
  valor: number | null;
  onCambio: (v: number | null) => void;
  min?: number;
  max?: number;
  paso?: number;
  decimales?: number;
  unidad?: string;
}) {
  const [texto, setTexto] = useState(valor === null ? '' : String(valor).replace('.', ','));
  const fijar = (v: number) => {
    const limitado = Math.min(max, Math.max(min, Math.round(v * 10 ** decimales) / 10 ** decimales));
    setTexto(String(limitado).replace('.', ','));
    onCambio(limitado);
  };
  return (
    <View style={estilos.contador}>
      <Pressable accessibilityLabel="Restar" style={estilos.botonContador} onPress={() => fijar((valor ?? 0) - paso)}>
        <Icono nombre="minus" tamano={28} color={semantico.titulo} />
      </Pressable>
      <View style={estilos.valorContador}>
        <TextInput
          value={texto}
          onChangeText={(t) => {
            setTexto(t);
            const n = Number(t.replace(',', '.'));
            onCambio(t.trim() === '' || Number.isNaN(n) ? null : n);
          }}
          onBlur={() => valor !== null && fijar(valor)}
          keyboardType={decimales > 0 ? 'decimal-pad' : 'number-pad'}
          style={estilos.entradaContador}
          accessibilityLabel={unidad ? `Cantidad en ${unidad}` : 'Cantidad'}
          selectTextOnFocus
        />
        {unidad ? <Text style={estilos.unidad}>{unidad}</Text> : null}
      </View>
      <Pressable accessibilityLabel="Sumar" style={estilos.botonContador} onPress={() => fijar((valor ?? 0) + paso)}>
        <Icono nombre="plus" tamano={28} color={semantico.titulo} />
      </Pressable>
    </View>
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
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  multilinea?: boolean;
  secreto?: boolean;
  teclado?: KeyboardTypeOptions;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences';
  maxLength?: number;
}) {
  return (
    <View style={{ marginBottom: espaciado.md }}>
      <Etiqueta>{etiqueta}</Etiqueta>
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
        accessibilityLabel={etiqueta}
        style={[estilos.campo, multilinea && { minHeight: 96, textAlignVertical: 'top', paddingTop: espaciado.md }]}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  opciones: { gap: espaciado.sm, justifyContent: 'space-between' },
  opcion: {
    minHeight: campo.alturaTactil,
    borderWidth: 1,
    borderColor: semantico.borde,
    backgroundColor: semantico.fondo,
    paddingHorizontal: espaciado.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  opcionActiva: { borderWidth: 3, borderColor: semantico.bordeFuerte },
  textoOpcion: {
    flex: 1,
    fontFamily: tipografia.familias.cuerpoMedio,
    fontSize: tipografia.tamanos.subtitulo,
    color: semantico.titulo,
  },
  contador: { flexDirection: 'row', alignItems: 'stretch', gap: espaciado.sm },
  botonContador: {
    width: 72,
    minHeight: 72,
    borderWidth: 2,
    borderColor: semantico.bordeFuerte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valorContador: {
    flex: 1,
    borderWidth: 1,
    borderColor: semantico.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entradaContador: {
    fontFamily: tipografia.familias.titulo,
    fontSize: 34,
    color: semantico.titulo,
    textAlign: 'center',
    minWidth: 120,
    fontVariant: ['tabular-nums'],
  },
  unidad: { fontFamily: tipografia.familias.cuerpo, fontSize: tipografia.tamanos.pequeno, color: semantico.textoSecundario },
  campo: {
    minHeight: campo.alturaTactil,
    borderWidth: 1,
    borderColor: semantico.bordeFuerte,
    borderRadius: 0,
    paddingHorizontal: espaciado.md,
    fontFamily: tipografia.familias.cuerpo,
    fontSize: tipografia.tamanos.subtitulo,
    color: semantico.titulo,
    marginTop: espaciado.xs,
  },
});
