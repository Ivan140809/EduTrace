from datetime import datetime
from typing import Literal

from pydantic import Field

from .base import EsquemaBase
from .comunes import UsuarioResumen
from .retroalimentacion import Retroalimentacion, RetroalimentacionPublicada

EstadoEntrega = Literal["recibida", "en_analisis", "pendiente_revision", "enviada", "error_analisis"]
TipoEntrega = Literal["oficial", "revision"]


class ArchivoCodigoCrear(EsquemaBase):
    nombre: str = Field(min_length=1)
    contenido: str


class ArchivoCodigo(ArchivoCodigoCrear):
    lenguaje: str | None = None
    lineas: int | None = None


class EntregaCrear(EsquemaBase):
    tipo: TipoEntrega
    archivos: list[ArchivoCodigoCrear] = Field(min_length=1, max_length=10)
    dificultad_percibida: int | None = Field(default=None, ge=1, le=5)


class EntregaResumen(EsquemaBase):
    CAMPOS_NULABLES = frozenset({'numero_intento', 'fecha_envio'})

    id: str
    tarea_id: str
    estudiante: UsuarioResumen
    tipo: TipoEntrega
    numero_intento: int | None
    max_intentos: int
    estado: EstadoEntrega
    fecha_entrega: datetime
    fecha_envio: datetime | None = None


class LineaMarcada(EsquemaBase):
    archivo: str
    linea: int
    severidad: Literal["error", "advertencia", "sugerencia"]
    mensaje: str


class Compilacion(EsquemaBase):
    ok: bool
    advertencias: list[str] = []
    errores: list[str] = []


class ResultadoAnalisis(EsquemaBase):
    CAMPOS_NULABLES = frozenset({'resumen_cambios'})

    compilacion: Compilacion | None = None
    lineas_marcadas: list[LineaMarcada] = []
    resumen_cambios: str | None = None
    modelo: str | None = None


class EntregaDocente(EntregaResumen):
    CAMPOS_NULABLES = frozenset({'numero_intento', 'fecha_envio', 'analisis', 'retroalimentacion', 'dificultad_percibida', 'error_analisis'})

    archivos: list[ArchivoCodigo]
    analisis: ResultadoAnalisis | None
    retroalimentacion: Retroalimentacion | None
    dificultad_percibida: int | None = None
    error_analisis: str | None = None


class EntregaEstudiante(EntregaResumen):
    CAMPOS_NULABLES = frozenset({'numero_intento', 'fecha_envio', 'retroalimentacion'})

    retroalimentacion: RetroalimentacionPublicada | None


class Intento(EsquemaBase):
    CAMPOS_NULABLES = frozenset({'titulo', 'nota'})

    entrega_id: str
    etiqueta: str
    tipo: TipoEntrega
    fecha: datetime
    titulo: str | None = None
    nota: str | None = None  # texto corto del hallazgo, NO calificación
    estado: Literal["en_revision", "retroalimentado", "sin_nota"]
