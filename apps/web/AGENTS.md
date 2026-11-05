<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Panel web: reglas de organización

Detalle en [README.md](README.md), sección «Organización».

- **Una carpeta por módulo.** Todo lo de un módulo vive en `app/(panel)/<módulo>/`: sus rutas
  (`page.tsx`, `layout.tsx`, subcarpetas) y, en carpetas privadas, lo que solo ese módulo usa:
  `_componentes/` y `_lib/`, importados con ruta relativa (`./_componentes/X`).
- **`src/` es solo para lo compartido**: componentes base que se configuran con props
  (`@/componentes/ui`, `Tabla`, `Navegacion`, `MenuModulo`, `Icono`…), acceso a la API
  (`src/lib/`) y modo demo (`src/mock/`). Si algo de un módulo empieza a usarse en otro, súbalo
  a `src/` y agréguele props en vez de copiarlo.
- **Límite de líneas** (sin contar blancos ni comentarios; `pnpm lint` falla si se pasa):
  `page.tsx` y `layout.tsx` hasta **150**; componentes y lógica hasta **250**; `src/mock/` sin
  límite. Si una página va a crecer, divídala desde el inicio: la página guarda los datos y
  arma la vista, y cada sección, formulario o tabla grande va en su archivo de `_componentes/`
  (ejemplos: `validacion/`, `pronostico/`, `registros/[tabla]/`).
- **Íconos:** solo con `Icono` (`@/componentes/Icono`); importar `lucide-react` en otro archivo
  hace fallar el lint. Si falta un ícono, agréguelo al mapa de `Icono.tsx`.
- **Verificación:** `pnpm --filter @kalo/web typecheck`, `lint` y `build`.
