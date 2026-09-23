from .auditoria_repository import auditoria_repository
from .curso_repository import curso_repository
from .entrega_repository import entrega_repository
from .notificacion_repository import notificacion_repository
from .sesion_repository import sesion_repository
from .tarea_repository import tarea_repository
from .usuario_repository import usuario_repository


def reiniciar_todo() -> None:
    """Vacía todos los repositorios (lo usan las pruebas)."""
    for repo in (
        usuario_repository,
        sesion_repository,
        curso_repository,
        tarea_repository,
        entrega_repository,
        notificacion_repository,
        auditoria_repository,
    ):
        repo.limpiar()
