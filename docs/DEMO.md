# Demo de la app móvil

Tres formas de mostrar la app, de la más rápida a la más completa.

| Forma | Qué necesita | Datos | GPS con pantalla apagada | Mapa |
|---|---|---|---|---|
| **1. Navegador del celular** | Solo el enlace | DEMO precargados (se guardan en el navegador) | No (solo con la app abierta) | Lotes y cobertura dibujados (sin mapa base) |
| **2. Expo Go** | App Expo Go + computadora con el repositorio | DEMO precargados (en memoria: se pierden al cerrar) | No | Igual que 1 |
| **3. Build de desarrollo / APK** | Android Studio o EAS Build | DEMO o servidor real | Sí | MapLibre con mapa sin conexión |

Las formas 1 y 2 usan el **modo demo**: la app trae los datos ficticios (DEMO) y la
sincronización se simula, así que no hace falta levantar la API. La forma 3 puede usar el
modo demo o conectarse al servidor (`pnpm dev`).

## 1. Navegador del celular

```bash
cd apps/mobile
EXPO_OFFLINE=1 npx expo export --platform web --output-dir dist-web
npx serve dist-web            # o publique la carpeta en cualquier hosting estático
```

Abra la dirección en el celular (misma red WiFi: `http://<IP-de-la-computadora>:3000`).
En Chrome puede «Agregar a pantalla principal» para verla como app.

## 2. Expo Go

```bash
pnpm install
cd apps/mobile && npx expo start --go
```

Escanee el código QR con la cámara (iPhone) o con Expo Go (Android). El celular y la
computadora deben estar en la misma red (o use `npx expo start --go --tunnel`).

## 3. Build de desarrollo (completa)

Ver README → «App móvil». Es la que tiene GPS en segundo plano, base SQLite y mapa MapLibre.

## Guion (10 minutos, todo en el celular)

1. **Probar demo sin servidor.** En «Configurar dispositivo» toque el botón principal.
   Se cargan la Finca Demo, 6 lotes, usuarios, catálogos y 3 semanas de registros.
2. **Inicio de sesión sin señal.** Elija «Tomás Técnico de Sanidad (DEMO)» y escriba el PIN
   **4444** (o «Escanear gafete»). Active el **modo avión** antes o después: la app sigue igual.
3. **Inicio del día.** Finca, lote actual por GPS (si está fuera de la finca demo dirá
   «Sin lote detectado»), semana con su color de cinta, tareas asignadas y el botón rojo
   **Alerta de Fusarium**. Arriba, el indicador de sincronización.
4. **Muestreo de plagas.** Registrar → Plagas y enfermedades → Muestreo: elija lote y plaga,
   responda una pregunta por pantalla con botones grandes, tome una foto y guarde.
   El indicador pasa a **PENDIENTE · 2/1** (registros/fotos en cola).
5. **Trampa de picudo.** Registrar → Trampas → «Elegir trampa de la lista» (o escanee el QR
   impreso desde el panel) → cantidad → Guardar.
6. **Alerta de Fusarium.** Botón rojo de Inicio → síntomas → foto → queda en **SOSPECHA**.
7. **Mapa.** Pestaña Mapa: lotes con su cobertura de la semana.
8. **Cambiar de usuario.** Perfil → Cambiar de usuario → **Carlos Caporal (5555)**: el menú
   muestra solo enfunde, cosecha, labores y Fusarium (permisos por rol). Registre una cosecha
   y la asistencia de una cuadrilla.
9. **Recuperar señal.** Quite el modo avión y toque «Sincronizar ahora»: el indicador pasa
   por **SINCRONIZANDO** a **SINCRONIZADO** y los pendientes quedan en cero.
10. **Salir del demo.** Perfil → «Salir del demo» borra los datos del teléfono.

> En modo demo la sincronización es simulada: los registros no viajan a un servidor. Para
> mostrar que llegan al panel web, use la build de desarrollo conectada a la API (README).

Usuarios: `tecnico` 4444 · `caporal` 5555 · `trabajador` 6666 · `supervisor` 3333.
