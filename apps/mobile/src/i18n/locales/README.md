# Idiomas

- `es.json` es la base (español formal con «usted»).
- Para agregar un idioma (p. ej. q'eqchi' `kek`, k'iche' `quc`, kaqchikel `cak`, mam `mam`):
  1. Copie `es.json` como `<código>.json` y traduzca los valores (no las claves).
  2. Impórtelo en `src/i18n/index.ts` y agréguelo a `IDIOMAS`.
- Las claves que falten se muestran en español (`fallbackLng`).
