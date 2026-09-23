from datetime import datetime
from typing import Literal

from pydantic import Field

from .base import EsquemaBase
from .comunes import UsuarioResumen

OrigenFeedback = Literal["ia", "ia_editada", "docente"]


class SeccionesFeedback(EsquemaBase):
    """Hattie & Timperley (RF-02). No hay campo de nota a propósito (RF-17)."""

    hacia_donde_voy: str
    como_voy: str
    que_sigue: str
    pistas: list[str] = []


class SeccionesFeedbackEntrada(SeccionesFeedback):
    """Lo que envía el docente al editar: '¿Qué sigue?' no puede quedar vacío (RF-03)."""

    que_sigue: str = Field(min_length=1)


class Retroalimentacion(EsquemaBase):
    """Vista del docente (incluye el borrador)."""

    CAMPOS_NULABLES = frozenset({'comentario_docente'})

    entrega_id: str
    estado: Literal["pendiente_revision", "enviada"]
    origen: OrigenFeedback
    secciones: SeccionesFeedback
    comentario_docente: str | None = None
    generado_en: datetime | None = None
    actualizado_en: datetime | None = None


class RetroalimentacionEditar(EsquemaBase):
    secciones: SeccionesFeedbackEntrada | None = None
    comentario_docente: str | None = Field(default=None, max_length=4000)


class DescartarRequest(EsquemaBase):
    motivo: str | None = Field(default=None, max_length=500)


class AvisoIA(EsquemaBase):
    participo_ia: bool = Field(alias="participoIA")  # to_camel daría "participoIa"
    texto: str


class RetroalimentacionPublicada(EsquemaBase):
    """Vista del estudiante. Solo existe cuando la entrega está 'enviada'."""

    CAMPOS_NULABLES = frozenset({'comentario_docente'})

    secciones: SeccionesFeedback
    comentario_docente: str | None = None
    origen: OrigenFeedback
    aviso: AvisoIA
    revisado_por: UsuarioResumen
    fecha_envio: datetime
    leida: bool
