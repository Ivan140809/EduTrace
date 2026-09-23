from datetime import datetime
from typing import Literal

from .base import EsquemaBase


class Enlace(EsquemaBase):
    recurso: Literal["entrega", "duda", "tarea"]
    id: str


class Notificacion(EsquemaBase):
    id: str
    tipo: Literal["retroalimentacion_disponible", "entrega_por_revisar", "duda_nueva", "fallo_analisis"]
    mensaje: str
    enlace: Enlace | None = None
    fecha: datetime
    leida: bool


class ListaNotificaciones(EsquemaBase):
    no_leidas: int
    items: list[Notificacion]
