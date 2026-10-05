# Servicio de visión (preparado)

Python + FastAPI. Estructura lista para modelos YOLO/TFLite; los endpoints responden
**501 «Próximamente»** hasta cargar un modelo.

```bash
cd apps/vision
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000   # documentación en http://localhost:8000/docs
```

Integración prevista: la app móvil guarda la foto en `archivos` (cola normal); un proceso
del servidor envía la foto a este servicio y crea el `conteos_cinta` con `origen = 'vision'`.
