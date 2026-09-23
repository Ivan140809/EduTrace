from datetime import timedelta

from app.core import config
from app.core.errores import ErrorNegocio, no_autenticado
from app.core.security import generar_token, verificar_clave
from app.repositories import sesion_repository, usuario_repository
from app.repositories.modelos import SesionEntidad, UsuarioEntidad
from app.schemas.auth import LoginRequest, LoginResponse, Usuario

from .comun import a_usuario, ahora


def iniciar_sesion(datos: LoginRequest) -> LoginResponse:
    usuario = usuario_repository.por_correo(datos.correo)
    if usuario is None or not verificar_clave(datos.contrasena, usuario.hash_clave):
        # Mismo mensaje en ambos casos: no revelar qué correos existen.
        raise ErrorNegocio(401, "CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos.")

    duracion = (
        timedelta(days=config.DURACION_SESION_LARGA_DIAS)
        if datos.mantener_sesion
        else timedelta(hours=config.DURACION_SESION_HORAS)
    )
    sesion = sesion_repository.guardar(
        SesionEntidad(id=generar_token(), usuario_id=usuario.id, expira_en=ahora() + duracion)
    )
    return LoginResponse(token=sesion.id, expira_en=sesion.expira_en, usuario=a_usuario(usuario))


def usuario_por_token(token: str) -> UsuarioEntidad:
    sesion = sesion_repository.obtener(token)
    if sesion is None:
        raise no_autenticado()
    if sesion.expira_en <= ahora():
        sesion_repository.eliminar(token)
        raise no_autenticado()
    usuario = usuario_repository.obtener(sesion.usuario_id)
    if usuario is None:
        raise no_autenticado()
    return usuario


def perfil(usuario: UsuarioEntidad) -> Usuario:
    return a_usuario(usuario)


def cerrar_sesion(token: str) -> None:
    sesion_repository.eliminar(token)
