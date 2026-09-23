from app.core.errores import no_encontrado
from app.repositories import notificacion_repository
from app.repositories.modelos import NotificacionEntidad, UsuarioEntidad
from app.schemas.notificacion import Enlace, ListaNotificaciones, Notificacion

from .comun import ahora, nuevo_id


def notificar(usuario_id: str, tipo: str, mensaje: str, recurso: str | None = None, recurso_id: str | None = None) -> None:
    notificacion_repository.guardar(
        NotificacionEntidad(
            id=nuevo_id(), usuario_id=usuario_id, tipo=tipo, mensaje=mensaje,
            fecha=ahora(), enlace_recurso=recurso, enlace_id=recurso_id,
        )
    )


def _a_dto(n: NotificacionEntidad) -> Notificacion:
    enlace = Enlace(recurso=n.enlace_recurso, id=n.enlace_id) if n.enlace_recurso and n.enlace_id else None
    return Notificacion(id=n.id, tipo=n.tipo, mensaje=n.mensaje, enlace=enlace, fecha=n.fecha, leida=n.leida)


def listar(usuario: UsuarioEntidad, solo_no_leidas: bool = False) -> ListaNotificaciones:
    todas = notificacion_repository.de_usuario(usuario.id)
    items = [n for n in todas if not n.leida] if solo_no_leidas else todas
    return ListaNotificaciones(no_leidas=sum(1 for n in todas if not n.leida), items=[_a_dto(n) for n in items])


def marcar_leida(notificacion_id: str, usuario: UsuarioEntidad) -> None:
    n = notificacion_repository.obtener(notificacion_id)
    if n is None or n.usuario_id != usuario.id:  # no revelar notificaciones ajenas
        raise no_encontrado("La notificación")
    n.leida = True
    notificacion_repository.guardar(n)
