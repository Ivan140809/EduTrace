from fastapi import APIRouter, Depends, Response

from app.schemas.auth import LoginRequest, LoginResponse, Usuario
from app.services import auth_service

from .dependencias import token_actual, usuario_actual

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=LoginResponse)
def login(datos: LoginRequest):
    return auth_service.iniciar_sesion(datos)


@router.get("/me", response_model=Usuario)
def me(usuario=Depends(usuario_actual)):
    return auth_service.perfil(usuario)


@router.post("/logout", status_code=204)
def logout(token: str = Depends(token_actual)):
    auth_service.cerrar_sesion(token)
    return Response(status_code=204)
