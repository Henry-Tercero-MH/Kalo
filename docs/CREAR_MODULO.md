# Crear un módulo nuevo (pantallas)

Esta guía cubre cómo construir las pantallas de un módulo con el sistema de diseño. La parte
técnica (manifiesto, tabla sincronizable, permisos y activación) está en
[modulos.md](modulos.md); hágala primero. Las reglas de diseño están en
[DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md).

Antes de empezar, revise `packages/shared/src/etapa.ts`: en la etapa 1 solo están activos
labores y asistencia. Un módulo de la lista `modulosCongelados` no se muestra.

## 1. Dónde va cada archivo

```
apps/mobile/
├── app/modulos/<codigo>/          # Rutas (expo-router): una pantalla por archivo
│   ├── index.tsx                  # Menú del módulo (si tiene más de una pantalla)
│   └── <pantalla>.tsx             # Formulario, lista, detalle
├── src/modulos/<codigo>/          # Lógica y piezas propias del módulo
│   ├── servicio.ts                # Guardar y consultar (WatermelonDB)
│   └── Inicio<Rol>.tsx            # Inicio de rol, si el módulo tiene uno
└── src/i18n/locales/es.json       # Textos, bajo una clave "<codigo>": { ... }
```

Referencia completa: el módulo de labores (`app/modulos/labores/` y `src/modulos/labores/`).

## 2. Elegir la plantilla de cada pantalla

| La pantalla sirve para…               | Plantilla          | Copie la estructura de                  |
| ------------------------------------- | ------------------ | --------------------------------------- |
| Elegir entre las pantallas del módulo | Menú de módulo     | `app/modulos/labores/index.tsx`         |
| Ser el inicio de un rol               | Inicio de rol      | `src/modulos/labores/InicioLabores.tsx` |
| Registrar datos                       | Formulario         | `app/modulos/labores/labor.tsx`         |
| Ver o marcar varios registros         | Lista              | `app/modulos/labores/asistencia.tsx`    |
| Esperar un envío o una descarga       | Proceso con espera | `src/componentes/IndicadorSync.tsx`     |

Detalle de cada plantilla: DESIGN_SYSTEM.md, sección 7.

## 3. Esqueleto de una pantalla

```tsx
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Boton } from '@/componentes/Boton';
import { CampoTexto, Opciones } from '@/componentes/Controles';
import { Pantalla } from '@/componentes/Pantalla';
import { Etiqueta, Titulo } from '@/componentes/Texto';
import { EstadoVacio } from '@/componentes/Visuales';
import { despuesDeGuardar, useRequierePermiso } from '@/modulos/comun';

export default function Registro() {
  const { t } = useTranslation();
  const router = useRouter();
  useRequierePermiso('riego:crear');
  // ...estado y consultas

  return (
    <Pantalla volver>
      <Titulo>{t('riego.titulo')}</Titulo>
      {turnos.length === 0 ? (
        <EstadoVacio
          icono="labores"
          titulo={t('riego.sinTurnos')}
          descripcion={t('riego.sinTurnosAyuda')}
        />
      ) : (
        <>
          <Etiqueta requerido>{t('riego.turno')}</Etiqueta>
          <Opciones opciones={turnos} valor={turno} onCambio={setTurno} />
          <CampoTexto etiqueta={t('riego.notas')} valor={notas} onCambio={setNotas} opcional />
          <Boton
            titulo={t('comun.guardar')}
            icono="guardar"
            deshabilitado={!turno}
            motivoDeshabilitado={t('riego.eligeTurno')}
            onPress={async () => {
              await guardar();
              despuesDeGuardar(() => router.back());
            }}
          />
        </>
      )}
    </Pantalla>
  );
}
```

## 4. Íconos del módulo

1. Busque si el concepto ya tiene nombre en el mapa de `src/componentes/Icono.tsx` (sección
   "Nombres semánticos"). Si existe, úselo.
2. Si no existe, importe el ícono de Lucide en `Icono.tsx` y agréguelo al mapa con un nombre de
   concepto en español (`riego: Droplets`). El manifiesto del módulo (`icono` en
   `packages/shared/src/modulos.ts`) usa ese mismo nombre.
3. `pnpm --filter @kalo/mobile test` confirma que todos los nombres existen.

## 5. Lista de revisión antes del PR

Diseño

- [ ] No hay colores, tamaños de letra, espaciados, grosores ni tamaños de ícono escritos a mano:
      todo sale de `semantico`, `tipografia`, `espaciado`, `bordes`, `campo`, `control` o
      `tamanoIcono`.
- [ ] Sin emojis en textos, código ni comentarios.
- [ ] Íconos solo con `Icono` o `BotonIcono`, con nombre por concepto.
- [ ] Textos con los componentes de `Texto.tsx` (`Titulo`, `Texto`, `Etiqueta`, `TextoNombre`…),
      no `<Text>` con estilos propios.
- [ ] Toda pantalla usa `Pantalla` y sigue su plantilla.
- [ ] Un solo botón principal (verde) por pantalla.
- [ ] Elegir opciones se hace con `Opciones` o `FilaCasilla`, no con chips propios.
- [ ] Estados resueltos: vacío (`EstadoVacio`), carga (`EstadoCarga`, con porcentaje solo si
      hay avance real) y error (`EstadoError` o `Aviso tipo="peligro"`).

Accesibilidad y campo

- [ ] Todo lo que se toca mide al menos 56 pt (o 44 visibles + `hitSlop`).
- [ ] Los estados no dependen solo del color (color + palabra o ícono).
- [ ] `alerta` nunca como color de texto (use `textoAlerta`).
- [ ] Los botones de solo ícono tienen `etiqueta`.
- [ ] Textos en `es.json`, con instrucciones claras de qué hacer.

Verificación

- [ ] `pnpm --filter @kalo/mobile typecheck`, `lint` y `test` pasan.
- [ ] Si cambió tokens: `pnpm --filter @kalo/ui-tokens build` y `test`.
- [ ] Probado en Android (dispositivo de campo) y en iOS o web.
- [ ] Probado con la letra del sistema agrandada.
- [ ] Modo oscuro: no aplica todavía (pendiente por decisión del proyecto).
