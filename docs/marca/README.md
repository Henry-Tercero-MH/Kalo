# Marca

Archivos de la marca:

- `Guia-de-marca-para-informes.pdf` — Guía de marca para informes de Inversiones Kalo.
- `kalo-logo.png` — logo oficial (fondo transparente, recortado a su contenido, 960 × 200 px).
  Ya está activado en la app móvil (`apps/mobile/assets/`) y en el panel (`apps/web/public/`).

Si se reemplaza el logo:

```bash
pnpm --filter @kalo/mobile marca:logo        # lo copia a la app y lo activa
cp docs/marca/kalo-logo.png apps/web/public/  # el panel lo detecta solo
```

Mientras no esté, la app y el panel muestran «INVERSIONES KALO» en estilo título (nunca se
redibuja ni recolorea el logo). Los tokens de color están en `packages/ui-tokens/src/tokens.json`.
