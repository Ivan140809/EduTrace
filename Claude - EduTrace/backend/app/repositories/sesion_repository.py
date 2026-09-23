from .base import RepositorioMemoria
from .modelos import SesionEntidad


class SesionRepository(RepositorioMemoria[SesionEntidad]):
    """La llave es el token."""


sesion_repository = SesionRepository()
