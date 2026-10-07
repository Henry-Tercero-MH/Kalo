# Demo de la app móvil

Tres formas de mostrar la app, de la más rápida a la más completa.

| Forma                            | Qué necesita                                 | Datos                                               | GPS con pantalla apagada     | Mapa                                        |
| -------------------------------- | -------------------------------------------- | --------------------------------------------------- | ---------------------------- | ------------------------------------------- |
| **1. Navegador del celular**     | Solo el enlace                               | DEMO precargados (se guardan en el navegador)       | No (solo con la app abierta) | Lotes y cobertura dibujados (sin mapa base) |
| **2. Expo Go**                   | App Expo Go + computadora con el repositorio | DEMO precargados (en memoria: se pierden al cerrar) | No                           | Igual que 1                                 |
| **3. Build de desarrollo / APK** | Android Studio o EAS Build                   | DEMO o servidor real                                | Sí                           | MapLibre con mapa sin conexión              |

Las formas 1 y 2 usan el **modo demo**: la app trae los datos ficticios (DEMO) y la
sincronización se simula, así que no hace falta levantar la API. La forma 3 también usa datos mock por defecto; para conectarla al servidor real compile con
`EXPO_PUBLIC_KALO_DATOS=api` y levante la API (`pnpm dev`).

## 1. Navegador del celular

**Enlace publicado:** https://henry-tercero-mh.github.io/Kalo/ (GitHub Pages; se actualiza solo
con cada cambio en `apps/mobile` mediante `.github/workflows/demo-pages.yml`).

Para publicarlo usted mismo en otra máquina:

```bash
pnpm install
pnpm --filter @kalo/mobile export:web     # genera apps/mobile/dist-web (incluye 404.html)
npx serve -s apps/mobile/dist-web         # -s: todas las rutas sirven index.html
```

Abra la dirección en el celular (misma red WiFi: `http://<IP-de-la-computadora>:3000`).
En Chrome puede «Agregar a pantalla principal» para verla como app.

- Para publicarlo en cualquier ruta sin configurar nada (enlace compartible, subcarpeta de
  GitHub Pages, Netlify o S3): `pnpm --filter @kalo/mobile export:enlace` genera
  `apps/mobile/dist-enlace`, que funciona en cualquier carpeta.
- Fuera de `localhost`, el navegador solo entrega la ubicación GPS por **HTTPS**.
- En el navegador el recorrido GPS se graba solo con la pestaña abierta.

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

1. **Abrir la app.** Por defecto usa **datos mock**: al abrir se cargan solos la Finca Demo,
   6 lotes, usuarios, catálogos y 3 semanas de registros, sin servidor ni internet.
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
10. **Reiniciar.** Perfil → «Reiniciar datos demo» borra lo registrado y vuelve a los datos originales.

> En modo demo la sincronización es simulada: los registros no viajan a un servidor. Para
> mostrar que llegan al panel web, use la build de desarrollo conectada a la API (README).

Usuarios: `admin` 1111 · `gerente` 2222 · `supervisor` 3333 · `tecnico` 4444 · `caporal` 5555.

Cada perfil tiene su propio inicio en la app:

| Perfil             | Inicio                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Gerente            | Indicadores de la semana (cosecha, cajas estimadas, recobro, enfunde, asistencia, alertas) y gráficas de producción, personal y sanidad. |
| Supervisor         | Registros por validar, alertas de Fusarium abiertas, asistencia por cuadrilla, labores del día y acceso a indicadores, órdenes y mapa.   |
| Técnico de sanidad | Muestreo, preaviso de sigatoka, trampas y alerta de Fusarium con el avance de la semana por lote, incidencia y capturas de picudo.       |
| Caporal            | Asistencia, asignar labor, reportar labor y enviar datos.                                                                                |
| Administrador      | Estado del teléfono, usuarios por rol, personal, lotes y cuadrillas, y acceso a indicadores, registro y sincronización.                  |
