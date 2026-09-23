from datetime import datetime
from typing import Literal

from pydantic import Field

from .base import EsquemaBase
from .comunes import Corte


class CasoPrueba(EsquemaBase):
    id: str | None = None
    nombre: str
    entrada: str
    salida_esperada: str
    visible_estudiante: bool = False


class CriteriosEvaluacion(EsquemaBase):
    correccion_funcional: bool = True
    legibilidad: bool = True
    mantenibilidad: bool = True
    documentacion: bool = False
    instrucciones_adicionales: str | None = Field(default=None, max_length=2000)


class TareaCrear(EsquemaBase):
    titulo: str = Field(min_length=1)
    enunciado: str | None = None
    lenguaje: Literal["cpp", "c", "python", "java"]
    fecha_limite: datetime
    max_intentos: int = Field(ge=1)
    corte: Corte | None = None
    rae_ids: list[str] = []
    tema_ids: list[str] = []
    criterios: CriteriosEvaluacion = CriteriosEvaluacion()
    rubrica: str | None = None
    casos_prueba: list[CasoPrueba] = []
    permitir_revision_previa: bool = True


class Tarea(TareaCrear):
    id: str
    curso_id: str
    estado: Literal["borrador", "abierta", "cerrada"]


class ResumenTarea(EsquemaBase):
    CAMPOS_NULABLES = frozenset({'tiempo_medio_respuesta_horas', 'tiempo_medio_revision_docente_min'})

    estudiantes: int
    entregas_recibidas: int
    pendientes_revision: int
    tiempo_medio_respuesta_horas: float | None
    tiempo_medio_revision_docente_min: float | None = None
