from .base import RepositorioMemoria
from .modelos import CursoEntidad


class CursoRepository(RepositorioMemoria[CursoEntidad]):
    def de_usuario(self, usuario_id: str) -> list[CursoEntidad]:
        return self.listar(lambda c: usuario_id in c.docente_ids or usuario_id in c.estudiante_ids)


curso_repository = CursoRepository()
