from .base import EsquemaBase
from .comunes import UsuarioResumen


class Curso(EsquemaBase):
    id: str
    nombre: str
    periodo: str
    semana_actual: int | None = None
    semanas_totales: int | None = None
    docentes: list[UsuarioResumen] = []
