from fastapi import APIRouter, Depends, Response

from app.schemas.notificacion import ListaNotificaciones
from app.services import notificacion_service

from .dependencias import usuario_actual

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


@router.get("", response_model=ListaNotificaciones)
def listar(noLeidas: bool = False, usuario=Depends(usuario_actual)):  # noqa: N803 (nombre del contrato)
    return notificacion_service.listar(usuario, noLeidas)


@router.post("/{notificacion_id}/leida", status_code=204)
def marcar_leida(notificacion_id: str, usuario=Depends(usuario_actual)):
    notificacion_service.marcar_leida(notificacion_id, usuario)
    return Response(status_code=204)
