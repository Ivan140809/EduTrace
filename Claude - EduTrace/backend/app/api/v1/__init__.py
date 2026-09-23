"""Reúne todos los controladores de la versión 1 del API."""
from fastapi import APIRouter

from . import auth, cursos, entregas, estudiantes, notificaciones, tareas

router = APIRouter()
for modulo in (auth, cursos, tareas, entregas, estudiantes, notificaciones):
    router.include_router(modulo.router)
