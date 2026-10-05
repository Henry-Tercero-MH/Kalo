# Marca

Coloque aquí los archivos de la marca (no se adjuntaron al prompt):

- `Guia-de-marca-para-informes.pdf` — Guía de marca para informes de Inversiones Kalo.
- `kalo-logo.png` — logo oficial.

Después de agregar el logo:

```bash
pnpm --filter @kalo/mobile marca:logo        # lo copia a la app y lo activa
cp docs/marca/kalo-logo.png apps/web/public/  # el panel lo detecta solo
```

Mientras no esté, la app y el panel muestran «INVERSIONES KALO» en estilo título (nunca se
redibuja ni recolorea el logo). Los tokens de color están en `packages/ui-tokens/src/tokens.json`.
