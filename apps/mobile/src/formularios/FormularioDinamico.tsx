/**
 * Motor de formularios dinámicos: una pregunta por pantalla, con opciones grandes.
 * Lee la definición descargada (`definiciones_formulario`), aplica la lógica condicional
 * (`visibleSi`) y las validaciones definidas en @kalo/shared.
 */
import {
  camposVisibles,
  limpiarRespuestas,
  validarCampo,
  type CampoFormulario,
  type DefinicionFormulario,
  type Respuestas,
  type ValorRespuesta,
} from '@kalo/shared';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Boton } from '@/componentes/Boton';
import { CampoTexto, Contador, Opciones } from '@/componentes/Controles';
import { Etiqueta, Texto, Titulo } from '@/componentes/Texto';
import { Aviso } from '@/componentes/Visuales';
import { espaciado } from '@/componentes/tema';

export interface OpcionCatalogo {
  valor: string;
  etiqueta: string;
}

function EntradaCampo({
  campo,
  valor,
  onCambio,
  catalogos,
}: {
  campo: CampoFormulario;
  valor: ValorRespuesta | undefined;
  onCambio: (v: ValorRespuesta) => void;
  catalogos: Partial<Record<'plagas' | 'lotes', OpcionCatalogo[]>>;
}) {
  const { t } = useTranslation();
  const opciones = campo.catalogo ? (catalogos[campo.catalogo] ?? []) : (campo.opciones ?? []);
  switch (campo.tipo) {
    case 'opcion':
      return (
        <Opciones
          opciones={opciones}
          valor={(valor as string) ?? null}
          onCambio={(v) => onCambio(v as string)}
        />
      );
    case 'multiopcion':
      return (
        <Opciones
          multiple
          opciones={opciones}
          valor={(valor as string[]) ?? []}
          onCambio={(v) => onCambio(v as string[])}
        />
      );
    case 'booleano':
      return (
        <Opciones
          columnas={2}
          opciones={[
            { valor: true, etiqueta: t('comun.si') },
            { valor: false, etiqueta: t('comun.no') },
          ]}
          valor={(valor as boolean | undefined) ?? null}
          onCambio={(v) => onCambio(v as boolean)}
        />
      );
    case 'escala': {
      const pasos = Array.from(
        { length: (campo.max ?? 5) - (campo.min ?? 0) + 1 },
        (_, i) => (campo.min ?? 0) + i,
      );
      return (
        <Opciones
          columnas={2}
          opciones={pasos.map((n) => ({ valor: n, etiqueta: String(n) }))}
          valor={(valor as number | undefined) ?? null}
          onCambio={(v) => onCambio(v as number)}
        />
      );
    }
    case 'numero':
    case 'entero':
      return (
        <Contador
          valor={typeof valor === 'number' ? valor : null}
          onCambio={onCambio}
          min={campo.min ?? 0}
          max={campo.max ?? 1_000_000}
          decimales={campo.tipo === 'numero' ? 1 : 0}
          unidad={campo.unidad}
        />
      );
    default:
      return (
        <CampoTexto
          etiqueta={campo.etiqueta}
          valor={(valor as string) ?? ''}
          onCambio={onCambio}
          multilinea
          autoCapitalize="sentences"
        />
      );
  }
}

/**
 * Asistente paso a paso. Al terminar entrega las respuestas limpias (sin campos ocultos).
 * `pasosExtra` agrega pantallas fijas al final (p. ej. fotos y notas).
 */
export function FormularioDinamico({
  definicion,
  catalogos = {},
  inicial = {},
  pasosExtra = [],
  onCompletar,
  guardando,
}: {
  definicion: DefinicionFormulario;
  catalogos?: Partial<Record<'plagas' | 'lotes', OpcionCatalogo[]>>;
  inicial?: Respuestas;
  pasosExtra?: { titulo: string; contenido: ReactNode }[];
  onCompletar: (respuestas: Respuestas) => void;
  guardando?: boolean;
}) {
  const { t } = useTranslation();
  const [respuestas, setRespuestas] = useState<Respuestas>(inicial);
  const [indice, setIndice] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const visibles = useMemo(() => camposVisibles(definicion, respuestas), [definicion, respuestas]);
  const total = visibles.length + pasosExtra.length;
  const campo = visibles[indice];
  const extra = indice >= visibles.length ? pasosExtra[indice - visibles.length] : undefined;
  const esUltimo = indice === total - 1;

  const avanzar = () => {
    if (campo) {
      const e = validarCampo(campo, respuestas[campo.id]);
      if (e) return setError(e);
    }
    setError(null);
    if (esUltimo) onCompletar(limpiarRespuestas(definicion, respuestas));
    else setIndice((i) => Math.min(total - 1, i + 1));
  };

  return (
    <View style={{ flex: 1 }}>
      <Etiqueta>{t('comun.paso', { actual: indice + 1, total })}</Etiqueta>
      <View style={{ marginTop: espaciado.sm }}>
        <Titulo>{campo ? campo.etiqueta : (extra?.titulo ?? '')}</Titulo>
      </View>
      {campo?.ayuda ? <Texto style={{ marginBottom: espaciado.md }}>{campo.ayuda}</Texto> : null}
      {campo ? (
        <EntradaCampo
          campo={campo}
          valor={respuestas[campo.id]}
          catalogos={catalogos}
          onCambio={(v) => {
            setError(null);
            setRespuestas((r) => ({ ...r, [campo.id]: v }));
          }}
        />
      ) : (
        extra?.contenido
      )}
      {error ? <Aviso tipo="peligro" texto={error} /> : null}
      <View style={{ marginTop: espaciado.xl, gap: espaciado.sm }}>
        <Boton
          titulo={esUltimo ? t('comun.guardar') : t('comun.siguiente')}
          icono={esUltimo ? 'check' : 'chevron-right'}
          onPress={avanzar}
          cargando={guardando}
        />
        {indice > 0 ? (
          <Boton
            titulo={t('comun.anterior')}
            variante="secundario"
            onPress={() => setIndice((i) => i - 1)}
          />
        ) : null}
      </View>
    </View>
  );
}
