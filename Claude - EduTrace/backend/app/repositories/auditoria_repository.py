from .base import RepositorioMemoria
from .modelos import EventoAuditoriaEntidad


class AuditoriaRepository(RepositorioMemoria[EventoAuditoriaEntidad]):
    def de_entrega(self, entrega_id: str) -> list[EventoAuditoriaEntidad]:
        return sorted(self.listar(lambda a: a.entrega_id == entrega_id), key=lambda a: a.fecha)


auditoria_repository = AuditoriaRepository()
