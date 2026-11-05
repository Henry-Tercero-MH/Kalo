<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Kalo Campo: reglas del proyecto

Monorepo pnpm + turbo: `apps/mobile` (Expo, app de campo), `apps/web` (Next.js, panel de
oficina), `apps/api`, `apps/vision`, `packages/shared` (módulos, permisos, tablas),
`packages/ui-tokens` (sistema de diseño). Todo el código, los textos y los comentarios van en
español, con el estilo del código que ya existe.

- **Etapa actual:** solo labores y asistencia (finca de hule Las Rosas). Los módulos y tableros
  congelados están en `packages/shared/src/etapa.ts`; no los amplíe salvo que se pida.
- **Diseño:** siga [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). Ningún color, tamaño de letra,
  espaciado, grosor ni tamaño de ícono escrito a mano: todo sale de `@kalo/ui-tokens` (en la
  app, `apps/mobile/src/componentes/tema.ts`). Use los componentes existentes antes de crear
  uno nuevo. Modo oscuro: pendiente, no lo agregue.
- **Sin emojis** en interfaz, código, textos ni documentación. Los íconos se usan solo con el
  componente `Icono` de cada app, con el nombre por concepto de su mapa.
- **Textos de la app** en `apps/mobile/src/i18n/locales/es.json`, nunca fijos en la pantalla.
- **Módulo nuevo:** [docs/modulos.md](docs/modulos.md) (manifiesto, tablas, permisos) y
  [docs/CREAR_MODULO.md](docs/CREAR_MODULO.md) (pantallas y checklist).
- **Panel web:** una carpeta por módulo y límite de líneas por archivo; ver
  [apps/web/AGENTS.md](apps/web/AGENTS.md).
- **Antes de dar algo por terminado:** `pnpm --filter <paquete> typecheck`, `lint` y `test`
  del paquete que cambió. Si cambia `packages/ui-tokens/src/tokens.json` o los roles,
  `pnpm --filter @kalo/ui-tokens build` para regenerar `theme.css`.
