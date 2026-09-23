from datetime import datetime

from pydantic import Field

from .base import EsquemaBase
from .comunes import Rol


class LoginRequest(EsquemaBase):
    correo: str = Field(min_length=3, max_length=254)
    contrasena: str = Field(min_length=1)
    mantener_sesion: bool = False


class Usuario(EsquemaBase):
    id: str
    nombre: str
    correo: str
    rol: Rol
    iniciales: str


class LoginResponse(EsquemaBase):
    token: str
    expira_en: datetime
    usuario: Usuario
