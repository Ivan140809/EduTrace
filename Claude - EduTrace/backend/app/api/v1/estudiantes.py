from fastapi import APIRouter, Depends

from app.schemas.estudiante import ProgresoEstudiante, TareaEstudiante
from app.services import estudiante_service

from .dependencias import usuario_actual

router = APIRouter(prefix="/estudiantes/me/cursos", tags=["Estudiante"])


@router.get("/{curso_id}/tareas", response_model=list[TareaEstudiante])
def mis_tareas(curso_id: str, usuario=Depends(usuario_actual)):
    return estudiante_service.mis_tareas(curso_id, usuario)


@router.get("/{curso_id}/progreso", response_model=ProgresoEstudiante)
def mi_progreso(curso_id: str, usuario=Depends(usuario_actual)):
    return estudiante_service.mi_progreso(curso_id, usuario)
