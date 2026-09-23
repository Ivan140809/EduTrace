from .base import RepositorioMemoria
from .modelos import UsuarioEntidad


class UsuarioRepository(RepositorioMemoria[UsuarioEntidad]):
    def por_correo(self, correo: str) -> UsuarioEntidad | None:
        correo = correo.strip().lower()
        return next((u for u in self.listar() if u.correo.lower() == correo), None)


usuario_repository = UsuarioRepository()
