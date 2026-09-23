from typing import Callable, Generic, Protocol, TypeVar


class _ConId(Protocol):
    id: str


T = TypeVar("T", bound=_ConId)


class RepositorioMemoria(Generic[T]):
    """
    Almacenamiento en un diccionario {id: entidad}. Los datos se pierden al reiniciar el servidor.

    Para pasar a una base de datos real basta con reescribir estas clases con la misma
    interfaz (guardar, obtener, listar, eliminar): los servicios no se enteran.
    """

    def __init__(self) -> None:
        self._datos: dict[str, T] = {}

    def guardar(self, entidad: T) -> T:
        self._datos[entidad.id] = entidad
        return entidad

    def obtener(self, id_: str) -> T | None:
        return self._datos.get(id_)

    def listar(self, filtro: Callable[[T], bool] | None = None) -> list[T]:
        valores = list(self._datos.values())
        return [v for v in valores if filtro(v)] if filtro else valores

    def eliminar(self, id_: str) -> None:
        self._datos.pop(id_, None)

    def limpiar(self) -> None:
        self._datos.clear()
