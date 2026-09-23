"""
Punto de entrada.  Ejecutar desde la carpeta backend/:

    uvicorn app.main:app --reload --port 8000

Documentación interactiva: http://localhost:8000/docs
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import semilla
from app.api.v1 import router as router_v1
from app.core import config
from app.core.errores import registrar_manejadores


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    semilla.cargar()  # datos de ejemplo en memoria
    yield


app = FastAPI(
    title="EduTrace API",
    version="0.4.0-mvp",
    description="MVP del backend de EduTrace. Datos en memoria: se reinician al apagar el servidor.",
    lifespan=ciclo_de_vida,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ORIGENES_CORS,
    allow_methods=["*"],
    allow_headers=["*"],
)
registrar_manejadores(app)
app.include_router(router_v1, prefix=config.PREFIJO_API)
