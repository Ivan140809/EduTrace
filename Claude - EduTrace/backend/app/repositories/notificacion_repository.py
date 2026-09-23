from .base import RepositorioMemoria
from .modelos import NotificacionEntidad


class NotificacionRepository(RepositorioMemoria[NotificacionEntidad]):
    def de_usuario(self, usuario_id: str) -> list[NotificacionEntidad]:
        notificaciones = self.listar(lambda n: n.usuario_id == usuario_id)
        return sorted(notificaciones, key=lambda n: n.fecha, reverse=True)


notificacion_repository = NotificacionRepository()
