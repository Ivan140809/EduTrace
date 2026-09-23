"""Dependencias de FastAPI: extraen el usuario de la sesión a partir del header Authorization."""
from fastapi import Depends, Header

from app.core.errores import no_autenticado
from app.core.security import extraer_token_bearer
from app.services import auth_service


def token_actual(authorization: str | None = Header(default=None)) -> str:
    token = extraer_token_bearer(authorization)
    if token is None:
        raise no_autenticado()
    return token


def usuario_actual(token: str = Depends(token_actual)):
    return auth_service.usuario_por_token(token)
