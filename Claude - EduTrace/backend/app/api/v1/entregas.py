from fastapi import APIRouter, Depends, Response

from app.schemas.entrega import ArchivoCodigo, EntregaDocente, EntregaEstudiante
from app.schemas.retroalimentacion import DescartarRequest, Retroalimentacion, RetroalimentacionEditar
from app.services import entrega_service, retroalimentacion_service

from .dependencias import usuario_actual

router = APIRouter(prefix="/entregas", tags=["Entregas"])


@router.get("/{entrega_id}", response_model=EntregaDocente | EntregaEstudiante)
def obtener_entrega(entrega_id: str, usuario=Depends(usuario_actual)):
    return entrega_service.obtener_entrega(entrega_id, usuario)


@router.get("/{entrega_id}/archivos", response_model=list[ArchivoCodigo])
def archivos_entrega(entrega_id: str, usuario=Depends(usuario_actual)):
    return entrega_service.archivos_entrega(entrega_id, usuario)


# ── Retroalimentación (human-in-the-loop) ──
@router.get("/{entrega_id}/retroalimentacion", response_model=Retroalimentacion, tags=["Retroalimentación"])
def obtener_retroalimentacion(entrega_id: str, usuario=Depends(usuario_actual)):
    return retroalimentacion_service.obtener(entrega_id, usuario)


@router.patch("/{entrega_id}/retroalimentacion", response_model=Retroalimentacion, tags=["Retroalimentación"])
def editar_retroalimentacion(entrega_id: str, datos: RetroalimentacionEditar, usuario=Depends(usuario_actual)):
    return retroalimentacion_service.editar(entrega_id, datos, usuario)


@router.post("/{entrega_id}/retroalimentacion/descartar", response_model=Retroalimentacion, tags=["Retroalimentación"])
def descartar_retroalimentacion(
    entrega_id: str, datos: DescartarRequest | None = None, usuario=Depends(usuario_actual)
):
    return retroalimentacion_service.descartar(entrega_id, datos or DescartarRequest(), usuario)


@router.post("/{entrega_id}/retroalimentacion/aprobar", response_model=EntregaDocente, tags=["Retroalimentación"])
def aprobar_retroalimentacion(entrega_id: str, usuario=Depends(usuario_actual)):
    return retroalimentacion_service.aprobar(entrega_id, usuario)


@router.post("/{entrega_id}/retroalimentacion/leida", status_code=204, tags=["Estudiante"])
def marcar_leida(entrega_id: str, usuario=Depends(usuario_actual)):
    retroalimentacion_service.marcar_leida(entrega_id, usuario)
    return Response(status_code=204)
