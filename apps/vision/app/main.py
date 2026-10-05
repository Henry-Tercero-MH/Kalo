"""
Servicio de visión de Kalo Campo (PREPARADO, aún sin modelos).

Puntos de extensión previstos:
  - POST /v1/conteo-cintas      → conteo de cintas por color en una foto de racimos
  - POST /v1/sigatoka/severidad → estimación de severidad de sigatoka en una foto de hoja

Los modelos (YOLO / TFLite) se colocan en ./modelos y se cargan al iniciar.
Mientras tanto, los endpoints responden 501 «Próximamente».
Ejecutar: uvicorn app.main:app --port 8000
"""

from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

CARPETA_MODELOS = Path(__file__).resolve().parent.parent / "modelos"

app = FastAPI(
    title="Kalo Campo — Visión",
    version="0.1.0",
    description="Servicio de visión preparado (conteo de cintas, detector de sigatoka). DEMO.",
)


class Salud(BaseModel):
    ok: bool
    modelos: list[str]


class ConteoCinta(BaseModel):
    color: str
    cantidad: int
    confianza: float


class RespuestaConteo(BaseModel):
    conteos: list[ConteoCinta]
    modelo: str


class RespuestaSigatoka(BaseModel):
    severidad: float
    hoja_mas_joven_enferma: int | None
    modelo: str


@app.get("/salud", response_model=Salud)
def salud() -> Salud:
    modelos = sorted(p.name for p in CARPETA_MODELOS.glob("*") if p.suffix in {".pt", ".tflite", ".onnx"})
    return Salud(ok=True, modelos=modelos)


def _proximamente() -> HTTPException:
    return HTTPException(status_code=501, detail="Próximamente: el modelo aún no está entrenado ni cargado.")


@app.post("/v1/conteo-cintas", response_model=RespuestaConteo)
async def conteo_cintas(foto: UploadFile = File(...)) -> RespuestaConteo:
    await foto.read()
    raise _proximamente()


@app.post("/v1/sigatoka/severidad", response_model=RespuestaSigatoka)
async def severidad_sigatoka(foto: UploadFile = File(...)) -> RespuestaSigatoka:
    await foto.read()
    raise _proximamente()
