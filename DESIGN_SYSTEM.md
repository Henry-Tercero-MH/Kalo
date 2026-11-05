# Sistema de diseño de Kalo Campo

Guía para construir pantallas de la app móvil (Expo) y del panel web (Next.js) con el mismo
diseño. Si algo de esta guía no alcanza para un caso nuevo, se agrega aquí antes de inventar
una variante en la pantalla.

- Tokens: `packages/ui-tokens` (`tokens.json` + `src/index.ts`).
- Adaptador móvil: `apps/mobile/src/componentes/tema.ts`.
- Componentes móviles: `apps/mobile/src/componentes/`.
- Panel web: tema de Tailwind generado en `packages/ui-tokens/theme.css`.
- Guía de marca original: `docs/marca/`.
- Paso a paso para un módulo nuevo: [docs/CREAR_MODULO.md](docs/CREAR_MODULO.md).

## 1. Principios

1. **Una sola fuente de verdad.** Ningún color, tamaño de letra, espaciado, grosor o tamaño de
   ícono se escribe a mano en una pantalla. Todo sale de los tokens.
2. **Hecho para campo.** Se usa al sol, con guantes y por personas con poca escolaridad:
   áreas táctiles de 56 pt, letra de cuerpo de 16, contraste alto y estados que no dependen
   solo del color (siempre color + palabra o ícono).
3. **Consistencia antes que creatividad.** Si un patrón ya existe, se reutiliza.
4. **Un solo llamado principal por pantalla** (botón verde). Lo demás es secundario.
5. **Sin emojis**, en ninguna parte: interfaz, código, textos ni documentación. Los íconos salen
   de Lucide a través de `Icono`.
6. **Accesibilidad WCAG AA**: 4,5:1 para texto, 3:1 para íconos, bordes de controles y texto
   grande.
7. **Textos en i18n.** Todo texto visible va en `apps/mobile/src/i18n/locales/es.json`.

## 2. Color

La identidad es el verde Kalo `#a0d33e`, negro y neutros cálidos. Esquinas rectas y sin
sombras (excepción: los campos de entrada del panel web, `rounded-campo` de 6 px).

### 2.1 Roles (`semantico`)

Use siempre el rol, nunca `colores.*` directamente en una pantalla.

| Rol                   | Hex                 | Uso                                             | Contraste             |
| --------------------- | ------------------- | ----------------------------------------------- | --------------------- |
| `fondo`               | #ffffff             | Fondo general                                   | —                     |
| `fondoSuave`          | #faf9f7             | Presionado, deshabilitado, avisos, estado vacío | —                     |
| `titulo`              | #141311             | Títulos, nombres, íconos                        | 18,6:1                |
| `texto`               | #3a3733             | Cuerpo                                          | 11,8:1                |
| `textoSecundario`     | #6f6a62             | Etiquetas, ayudas, datos secundarios            | 5,4:1                 |
| `borde`               | #e2ded7             | Divisiones y tarjetas que **no** se tocan       | 1,3:1 (decorativo)    |
| `bordeControl`        | #6f6a62             | Inputs, casillas, opciones                      | 5,4:1                 |
| `bordeTocable`        | #6f6a62             | Tarjetas y filas que se tocan                   | 5,4:1                 |
| `bordeFuerte`         | #000000             | Línea de títulos, foco, botón secundario        | 21:1                  |
| `acento`              | #a0d33e             | Botón principal, casilla marcada                | —                     |
| `acentoPresionado`    | #8bbb31             | Botón principal presionado                      | texto encima 8,3:1    |
| `acentoOscuro`        | #719a24             | Franja superior, elementos grandes decorativos  | 3,3:1 (no para texto) |
| `textoSobreAcento`    | #111111             | Texto sobre el verde                            | 10,7:1                |
| `seleccion`           | #eaf6cf             | Fondo de la opción o fila elegida               | título encima 16,4:1  |
| `superficieInvertida` | #000000             | Código del trabajador, encabezado de grupo      | —                     |
| `textoSobreOscuro`    | #ffffff             | Texto sobre `superficieInvertida`               | 21:1                  |
| `velo`                | rgba(20,19,17,0,55) | Fondo detrás de diálogos                        | —                     |

### 2.2 Estados

| Estado  | Marca / borde     | Fondo suave            | Texto                                 |
| ------- | ----------------- | ---------------------- | ------------------------------------- |
| éxito   | `exito` #0b7a75   | `exitoSuave` #e7f2f1   | `exito` (5,2:1; 4,5:1 sobre su fondo) |
| alerta  | `alerta` #c08000  | `alertaSuave` #f9f2e6  | **`textoAlerta` #8a5c00** (5,8:1)     |
| peligro | `peligro` #b3261e | `peligroSuave` #f7e9e9 | `peligro` (6,5:1)                     |
| info    | `info` #6a3d9a    | `infoSuave` #f0ecf5    | `info` (7,6:1)                        |

`alerta` (#c08000) solo llega a 3,3:1: úselo en marcas, bordes e íconos, **nunca como color de
texto**. Para texto de alerta use `textoAlerta`.

Los cuatro estados y las cuatro series de gráficas se distinguen también con protanopia,
deuteranopia y tritanopia (test `packages/ui-tokens/test/daltonismo.test.ts`).

### 2.3 Escalas

- Verde: `verde50` #f5fbe9 · `verde100` #eaf6cf · `verde200` #d9edb2 · `verde300` #c1e282 ·
  `verde400` #aeda5b · `verde` #a0d33e · `verde600` #8bbb31 · `verde700` #719a24 ·
  `verde800` #55741b · `verde900` #394d12. Solo `verde800` y `verde900` sirven como color de
  texto sobre blanco.
- Neutros: `n0` … `n900` (n0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900).

### 2.4 Gráficas

`serie1` #141311 · `serie2` #4f6b19 · `serie3` #2f6fb0 · `serie4` #949088 · `cuadricula`
#e2ded7 · `ejes` #6f6a62. Todas las series cumplen 3:1 sobre blanco.

### 2.5 Modo oscuro

Pendiente por decisión del proyecto. No agregue `useColorScheme` ni colores oscuros hasta que se
apruebe; la app está fijada en claro (`userInterfaceStyle: 'light'`).

### 2.6 Panel web

`theme.css` exporta las escalas (`bg-marca-verde`, `text-neutros-n900`) y los roles con el
mismo nombre que en la app, en kebab-case: `text-titulo`, `text-texto-secundario`,
`border-borde-control`, `bg-alerta-suave`, `text-texto-alerta`. Prefiera los roles.

`theme.css` es un archivo generado: después de cambiar `tokens.json` o los roles, ejecute
`pnpm --filter @kalo/ui-tokens build` (el test falla si queda desincronizado).

## 3. Tipografía

Familias: Archivo 800 (`titulo`), Archivo 600 (`cuerpoMedio`), Archivo 400 (`cuerpo`) y Anton
(`portada`, solo logotipo y portada).

| Token `tipografia.tamanos` | pt  | Uso                                                |
| -------------------------- | --- | -------------------------------------------------- |
| `etiqueta`                 | 12  | Etiquetas de campo en MAYÚSCULAS (mínimo absoluto) |
| `pequeno`                  | 14  | Texto secundario                                   |
| `cuerpo`                   | 16  | Cuerpo (mínimo para leer en campo)                 |
| `subtitulo`                | 18  | Subtítulos de sección                              |
| `titulo`                   | 22  | Título de pantalla                                 |
| `tituloGrande`             | 28  | Números destacados, porcentaje de carga            |
| `portada`                  | 40  | Portada                                            |
| `portadaGrande`            | 64  | Logotipo de arranque                               |

- `tipografia.alturaLinea`: `cuerpo` 22, `pequeno` 20, `ajustada` 17.
- `tipografia.espaciadoLetras`: `titulo` 0,5 · `enfasis` 1 · `etiqueta` 1,2 · `codigo` 2.
- `tipografia.escalaMaxima.controles` (1,3): úselo como `maxFontSizeMultiplier` en textos que
  viven dentro de una altura fija (botones, pastillas). El texto corrido escala sin límite.

En pantallas use los componentes de texto (sección 6), no `<Text>` con estilos propios.

## 4. Espaciado, bordes y medidas

| Token                  | Valor                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `espaciado`            | `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `xxl` 32                                     |
| `bordes.lineaDivision` | 1 pt (divisiones, bordes normales)                                                           |
| `bordes.lineaTitulo`   | 2 pt (línea de títulos, foco, error, destacado)                                              |
| `bordes.radio`         | 0 (todo recto)                                                                               |
| `bordes.radioCampo`    | 6 (solo inputs del panel web)                                                                |
| `campo.alturaTactil`   | 56 pt (alto mínimo de todo lo que se toca)                                                   |
| `control.*` (tema.ts)  | `borde`, `grosor`, `bordeFoco`, `grosorFoco`, `ajusteFoco`, `bordeTocable`, `fondoSeleccion` |

Cuando un borde pasa de 1 a 2 pt (foco, selección, error), descuente `control.ajusteFoco` del
padding para que el contenido no salte.

El estilo de "presionado" es uno solo: `estilosBase.presionado`.

## 5. Íconos

- Librería única: `lucide-react-native` (línea, trazo 2). Solo `Icono.tsx` la importa.
- Tamaños (`tamanoIcono`): `pequeno` 18 · `mediano` 20 · `normal` 24 · `grande` 28 ·
  `enorme` 32. El de campo es `normal`.
- Use **nombres por concepto**, no el nombre de Lucide:

| Grupo                 | Nombres                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Navegación y acciones | `inicio`, `atras`, `siguiente`, `cerrar`, `agregar`, `quitar`, `sumar`, `restar`, `guardar`, `confirmar`, `descargar`, `ajustes`, `salir` |
| Etapa 1               | `asistencia`, `trabajadores`, `usuario`, `labores`, `asignar`, `reportar`, `orden`                                                        |
| Captura               | `ubicacion`, `foto`, `notaVoz`, `detener`                                                                                                 |
| Sincronización        | `sincronizar`, `sincronizando`, `sincronizado`, `errorEnvio`, `sinConexion`                                                               |
| Estados               | `exito`, `alerta`, `error`, `info`                                                                                                        |

Para un concepto nuevo: agregue el nombre al mapa de `Icono.tsx` (sección "Nombres
semánticos"). El test `apps/mobile/test/iconos.test.ts` falla si una pantalla usa un nombre
que no está en el mapa (sin el test se vería un cuadro vacío).

## 6. Componentes (app móvil)

### Estructura y texto

| Componente                 | Archivo      | Uso                                                                                                                                                                 |
| -------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Pantalla`                 | Pantalla.tsx | Toda pantalla. Encabezado con logo e indicador de sincronización. `volver` agrega el botón atrás; `pie` fija botones abajo; `sinDesplazamiento` para listas propias |
| `Titulo`                   | Texto.tsx    | Título de pantalla, MAYÚSCULAS, línea negra de 2 pt                                                                                                                 |
| `Subtitulo`                | Texto.tsx    | Título de sección                                                                                                                                                   |
| `Texto`, `TextoSecundario` | Texto.tsx    | Cuerpo y texto secundario                                                                                                                                           |
| `TextoNombre`              | Texto.tsx    | Nombre de trabajador en listas (siempre Archivo 800)                                                                                                                |
| `Etiqueta`                 | Texto.tsx    | Etiqueta de campo; `requerido` / `opcional` agregan la palabra (nunca solo un asterisco)                                                                            |
| `Division`                 | Texto.tsx    | Separador                                                                                                                                                           |

### Acciones

| Componente                        | Uso                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Boton`                           | `variante` `principal` (uno por pantalla), `secundario`, `peligro`; `cargando`, `deshabilitado` + `motivoDeshabilitado` (dice qué falta) |
| `BotonIcono`                      | Botón de solo ícono, 44 pt visibles y 56 tocables. `etiqueta` obligatoria (lector de pantalla). `variante` `fantasma` o `contorno`       |
| `TarjetaAccion` + `ListaAcciones` | Acción del inicio de un rol con su estado del día                                                                                        |
| `FilaMenu`                        | Opción de menú de un módulo                                                                                                              |

### Captura

| Componente                                                    | Uso                                                                                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `CampoTexto`                                                  | Input con etiqueta arriba, `ayuda`, `error`, `requerido`/`opcional`                                                                  |
| `Opciones`                                                    | Elegir una o varias opciones (`multiple`, `columnas` 1 o 2). Es el único patrón de "elegido": fondo `seleccion`, borde negro y check |
| `Contador`                                                    | Número con botones de restar y sumar                                                                                                 |
| `FilaCasilla` (+ `Casilla`)                                   | Fila con casilla de verificación de 44 pt; `bajoCasilla` agrega una palabra bajo la casilla                                          |
| `SelectorLote`, `CapturaFotos`, `CapturaVoz`, `InfoUbicacion` | Captura en campo (Campo.tsx)                                                                                                         |

### Información y estados

| Componente    | Uso                                                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tarjeta`     | Bloque de información; con `onPress` lleva borde tocable; `destacada` borde negro de 2 pt                                                                               |
| `Dato`        | Par etiqueta / valor                                                                                                                                                    |
| `Estado`      | Marca de color + palabra (`exito`, `alerta`, `peligro`, `info`, `neutro`). Es el "badge" de la app                                                                      |
| `Aviso`       | Mensaje en línea con ícono y borde izquierdo de color                                                                                                                   |
| `EstadoVacio` | Lista sin datos: ícono, título, descripción y acción opcional                                                                                                           |
| `EstadoCarga` | Carga. Con avance real (`progreso` 0–100 o `actual`/`total`) muestra porcentaje, barra y "3 de 10"; sin avance real, solo el indicador. **Nunca invente un porcentaje** |
| `EstadoError` | Algo falló: marco rojo, ícono, título y acción (normalmente "Reintentar")                                                                                               |

## 7. Plantillas de pantalla

No son componentes: son combinaciones fijas de los componentes anteriores.

| Plantilla          | Cuándo                                   | Estructura                                                                                                                                               | Referencia                                                               |
| ------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Inicio de rol      | Pantalla inicial de cada rol             | `Titulo` (saludo) → `Tarjeta` con finca y fecha → `ListaAcciones` de `TarjetaAccion` con el estado del día                                               | `src/modulos/labores/InicioLabores.tsx`                                  |
| Menú de módulo     | Entrada a un módulo con varias pantallas | `Pantalla volver` → `Titulo` → `FilaMenu` por opción                                                                                                     | `app/modulos/labores/index.tsx`                                          |
| Formulario         | Registrar datos                          | `Pantalla volver` → `Titulo` → campos con `Etiqueta` → un `Boton` principal (en `pie` si el formulario es largo). Después de guardar: `despuesDeGuardar` | `app/modulos/labores/labor.tsx`                                          |
| Lista              | Ver y marcar registros                   | `Pantalla volver` → `Titulo` → `Subtitulo` por grupo → filas (`FilaCasilla`, `Tarjeta`) → `EstadoVacio` si no hay datos                                  | `app/modulos/labores/asistencia.tsx`, `app/modulos/caporal/reportar.tsx` |
| Proceso con espera | Envío, descarga                          | `EstadoCarga` mientras trabaja → resultado o `EstadoError` con "Reintentar"                                                                              | `src/componentes/IndicadorSync.tsx`                                      |

Toda lista o pantalla que dependa de datos debe resolver sus tres estados: vacío, carga y error.

## 8. Correcto e incorrecto

```tsx
// Incorrecto: color, tamaño y grosor a mano
<Text style={{ color: '#333', fontSize: 15, letterSpacing: 1 }}>Juan Pérez</Text>
<View style={{ borderWidth: 1, borderColor: '#e2ded7' }} />

// Correcto: componente y tokens
<TextoNombre>{trabajador.nombre}</TextoNombre>
<View style={{ borderWidth: bordes.lineaDivision, borderColor: semantico.borde }} />
```

```tsx
// Incorrecto: nombre de Lucide, tamaño a mano, botón de ícono sin etiqueta
<Pressable onPress={quitar}><Icono nombre="x" tamano={22} /></Pressable>

// Correcto
<BotonIcono icono="quitar" variante="contorno" etiqueta={t('caporal.quitarDe', { nombre })} onPress={quitar} />
```

```tsx
// Incorrecto: chips propios para elegir (otro lenguaje de "elegido")
{
  motivos.map((m) => <Pressable style={m === valor ? { backgroundColor: '#000' } : null} />);
}

// Correcto
<Opciones opciones={motivos} valor={valor} onCambio={setValor} columnas={2} />;
```

```tsx
// Incorrecto: porcentaje inventado o texto suelto
<Text>{`${actual} / ${total}`}</Text>

// Correcto
<EstadoCarga titulo={t('sync.subiendoArchivos')} actual={actual} total={total} />
```

```tsx
// Incorrecto: alerta como color de texto (3,3:1)
<Text style={{ color: semantico.alerta }}>Faltan datos</Text>

// Correcto
<Text style={{ color: semantico.textoAlerta }}>{t('...')}</Text>
```

## 9. Reglas de lint propuestas (no activadas)

Para que estas reglas se revisen solas en cada PR se puede agregar a
`apps/mobile/eslint.config.mjs`:

- `eslint-plugin-react-native`: `react-native/no-color-literals` y
  `react-native/no-inline-styles` (empezar en `warn`: hoy hay estilos en línea de separación).
- `no-restricted-imports`: prohibir `lucide-react-native` fuera de `src/componentes/Icono.tsx`.
- `no-restricted-syntax`: marcar literales de texto con emojis.

Se activan cuando el equipo lo apruebe; mientras tanto, la lista de revisión de
[docs/CREAR_MODULO.md](docs/CREAR_MODULO.md) cubre lo mismo.
