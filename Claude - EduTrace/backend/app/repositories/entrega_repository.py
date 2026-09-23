from .base import RepositorioMemoria
from .modelos import EntregaEntidad


class EntregaRepository(RepositorioMemoria[EntregaEntidad]):
    def de_tarea(self, tarea_id: str) -> list[EntregaEntidad]:
        """De la más reciente a la más antigua."""
        entregas = self.listar(lambda e: e.tarea_id == tarea_id)
        return sorted(entregas, key=lambda e: e.fecha_entrega, reverse=True)

    def de_estudiante_en_tarea(self, tarea_id: str, estudiante_id: str) -> list[EntregaEntidad]:
        return [e for e in self.de_tarea(tarea_id) if e.estudiante_id == estudiante_id]


entrega_repository = EntregaRepository()
