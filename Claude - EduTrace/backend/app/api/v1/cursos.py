from fastapi import APIRouter, Depends

from app.schemas.curso import Curso
from app.schemas.tarea import Tarea, TareaCrear
from app.services import curso_service, tarea_service

from .dependencias import usuario_actual

router = APIRouter(prefix="/cursos", tags=["Cursos"])


@router.get("", response_model=list[Curso])
def listar_cursos(usuario=Depends(usuario_actual)):
    return curso_service.listar_cursos(usuario)


@router.get("/{curso_id}", response_model=Curso)
def obtener_curso(curso_id: str, usuario=Depends(usuario_actual)):
    return curso_service.obtener_curso(curso_id, usuario)


@router.get("/{curso_id}/tareas", response_model=list[Tarea], tags=["Tareas"])
def listar_tareas(curso_id: str, usuario=Depends(usuario_actual)):
    return tarea_service.listar_tareas(curso_id, usuario)


@router.post("/{curso_id}/tareas", response_model=Tarea, status_code=201, tags=["Tareas"])
def crear_tarea(curso_id: str, datos: TareaCrear, usuario=Depends(usuario_actual)):
    return tarea_service.crear_tarea(curso_id, datos, usuario)
