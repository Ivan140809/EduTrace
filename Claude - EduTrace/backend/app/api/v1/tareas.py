from fastapi import APIRouter, Depends

from app.schemas.entrega import EntregaCrear, EntregaEstudiante, EntregaResumen, Intento
from app.schemas.tarea import ResumenTarea, Tarea
from app.services import entrega_service, tarea_service

from .dependencias import usuario_actual

router = APIRouter(prefix="/tareas", tags=["Tareas"])


@router.get("/{tarea_id}", response_model=Tarea)
def obtener_tarea(tarea_id: str, usuario=Depends(usuario_actual)):
    return tarea_service.obtener_tarea(tarea_id, usuario)


@router.get("/{tarea_id}/resumen", response_model=ResumenTarea)
def resumen_tarea(tarea_id: str, usuario=Depends(usuario_actual)):
    return tarea_service.resumen_tarea(tarea_id, usuario)


@router.get("/{tarea_id}/entregas", response_model=list[EntregaResumen], tags=["Entregas"])
def listar_entregas(tarea_id: str, usuario=Depends(usuario_actual)):
    return entrega_service.listar_entregas(tarea_id, usuario)


@router.post("/{tarea_id}/entregas", response_model=EntregaEstudiante, status_code=202, tags=["Entregas"])
def crear_entrega(tarea_id: str, datos: EntregaCrear, usuario=Depends(usuario_actual)):
    return entrega_service.crear_entrega(tarea_id, datos, usuario)


@router.get("/{tarea_id}/intentos", response_model=list[Intento], tags=["Entregas"])
def listar_intentos(tarea_id: str, estudianteId: str | None = None, usuario=Depends(usuario_actual)):  # noqa: N803 (nombre del contrato)
    return entrega_service.listar_intentos(tarea_id, usuario, estudianteId)
