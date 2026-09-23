"""Utilidades compartidas por los servicios: fechas, IDs, conversiones y permisos."""
import uuid
from datetime import datetime, timezone

from app.core.errores import prohibido
from app.repositories import usuario_repository
from app.repositories.modelos import CursoEntidad, UsuarioEntidad
from app.schemas.auth import Usuario
from app.schemas.comunes import UsuarioResumen

# Autor de los eventos que genera el propio sistema (p. ej. el borrador automático).
SISTEMA = UsuarioResumen(id="00000000-0000-4000-8000-000000000000", nombre="EduTrace (sistema)")


def ahora() -> datetime:
    return datetime.now(timezone.utc)


def nuevo_id() -> str:
    return str(uuid.uuid4())


def iniciales(nombre: str) -> str:
    return "".join(p[0] for p in nombre.split()[:2]).upper()


def a_usuario(u: UsuarioEntidad) -> Usuario:
    return Usuario(id=u.id, nombre=u.nombre, correo=u.correo, rol=u.rol, iniciales=iniciales(u.nombre))


def a_resumen(u: UsuarioEntidad, con_correo: bool = False) -> UsuarioResumen:
    return UsuarioResumen(id=u.id, nombre=u.nombre, correo=u.correo if con_correo else None)


def resumen_por_id(usuario_id: str, con_correo: bool = False) -> UsuarioResumen:
    if usuario_id == SISTEMA.id:
        return SISTEMA
    u = usuario_repository.obtener(usuario_id)
    return a_resumen(u, con_correo) if u else UsuarioResumen(id=usuario_id, nombre="(usuario eliminado)")


# ── permisos ──
def es_docente(curso: CursoEntidad, u: UsuarioEntidad) -> bool:
    return u.rol == "docente" and u.id in curso.docente_ids


def es_estudiante(curso: CursoEntidad, u: UsuarioEntidad) -> bool:
    return u.rol == "estudiante" and u.id in curso.estudiante_ids


def exigir_miembro(curso: CursoEntidad, u: UsuarioEntidad) -> None:
    if not (es_docente(curso, u) or es_estudiante(curso, u)):
        raise prohibido("No perteneces a este curso.")


def exigir_docente(curso: CursoEntidad, u: UsuarioEntidad) -> None:
    if not es_docente(curso, u):
        raise prohibido("Solo el docente del curso puede hacer esto.")


def exigir_estudiante(curso: CursoEntidad, u: UsuarioEntidad) -> None:
    if not es_estudiante(curso, u):
        raise prohibido("Solo los estudiantes del curso pueden hacer esto.")
