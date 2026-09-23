from .base import RepositorioMemoria
from .modelos import TareaEntidad


class TareaRepository(RepositorioMemoria[TareaEntidad]):
    def de_curso(self, curso_id: str) -> list[TareaEntidad]:
        return sorted(self.listar(lambda t: t.curso_id == curso_id), key=lambda t: t.fecha_limite)


tarea_repository = TareaRepository()
