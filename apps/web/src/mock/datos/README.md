# Fixtures del modo demo (DEMO)

**Todos estos datos son de DEMOSTRACIÓN.** Se grabaron desde la API con el seed de ejemplo
(`pnpm seed` en la raíz) y no corresponden a producción real de la finca.
`grabacion.json` lleva `"demo": true` y la fecha de grabación.

No edite estos archivos a mano: se regeneran con

```bash
node apps/web/scripts/grabar-mock.mjs   # con la API levantada en http://localhost:4000
```

| Archivo             | Contenido                                                                  |
| ------------------- | -------------------------------------------------------------------------- |
| `grabacion.json`    | Marca DEMO, momento y origen de la grabación                               |
| `perfiles.json`     | `/v1/auth/yo` de admin, gerente y supervisor                               |
| `catalogos.json`    | `/v1/catalogos` (finca, lotes, plagas, colores, semanas, usuarios, roles…) |
| `registros.json`    | Universo de `/v1/registros/<tabla>` sin filtro de fecha (todas las tablas) |
| `mapa.json`         | `/v1/mapa/lotes`, `rutas`, `cobertura` y `registros`                       |
| `pronostico.json`   | `/v1/pronostico/ecuacion` y `semanal` (horizonte 4/8/12/16, finca y lotes) |
| `validacion.json`   | `/v1/validacion/conflictos`                                                |
| `dispositivos.json` | `/v1/dispositivos`                                                         |
| `admin.json`        | `/v1/admin/usuarios`, `roles`, `formularios` y `bitacora?limite=300`       |
| `trampas-qr.json`   | `/v1/trampas/qr.pdf` en base64                                             |

Pendientes de validación, alertas y órdenes se derivan de `registros.json` (el script verifica
que coincidan con lo que devuelve la API).
