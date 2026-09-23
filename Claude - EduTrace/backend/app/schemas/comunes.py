from typing import Literal

from .base import EsquemaBase

Rol = Literal["docente", "estudiante"]
Corte = Literal["I", "II", "III"]


class UsuarioResumen(EsquemaBase):
    id: str
    nombre: str
    correo: str | None = None  # solo visible para el docente del curso
