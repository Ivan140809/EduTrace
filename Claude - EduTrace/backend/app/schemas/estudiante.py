from datetime import datetime
from typing import Literal

from .base import EsquemaBase


class TareaEstudiante(EsquemaBase):
    CAMPOS_NULABLES = frozenset({'ultima_entrega_id', 'ultima_entrega_fecha'})

    tarea_id: str
    titulo: str
    fecha_limite: datetime
    estado: Literal["pendiente", "en_revision", "retroalimentada", "aprobada", "vencida"]
    intentos_usados: int
    max_intentos: int
    ultima_entrega_id: str | None = None
    ultima_entrega_fecha: datetime | None = None


class Conteo(EsquemaBase):
    hechas: int
    total: int


class ConteoLeidas(EsquemaBase):
    leidas: int
    total: int


class TemaDificultad(EsquemaBase):
    tema_id: str
    titulo: str
    tropiezos: int
    nivel: Literal["alto", "medio", "bajo"] | None = None


class ProgresoEstudiante(EsquemaBase):
    entregas_al_dia: Conteo
    retroalimentaciones_leidas: ConteoLeidas
    errores_corregidos: int
    intentos_promedio: float
    temas: list[TemaDificultad] = []
