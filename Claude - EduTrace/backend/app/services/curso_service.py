from app.core.errores import no_encontrado
from app.repositories import curso_repository
from app.repositories.modelos import CursoEntidad, UsuarioEntidad
from app.schemas.curso import Curso

from .comun import exigir_miembro, resumen_por_id


def cargar_curso(curso_id: str, usuario: UsuarioEntidad) -> CursoEntidad:
    """Devuelve el curso si existe y el usuario pertenece a él (404 / 403 si no)."""
    curso = curso_repository.obtener(curso_id)
    if curso is None:
        raise no_encontrado("El curso")
    exigir_miembro(curso, usuario)
    return curso


def a_curso(c: CursoEntidad) -> Curso:
    return Curso(
        id=c.id,
        nombre=c.nombre,
        periodo=c.periodo,
        semana_actual=c.semana_actual,
        semanas_totales=c.semanas_totales,
        docentes=[resumen_por_id(d) for d in c.docente_ids],
    )


def listar_cursos(usuario: UsuarioEntidad) -> list[Curso]:
    return [a_curso(c) for c in curso_repository.de_usuario(usuario.id)]


def obtener_curso(curso_id: str, usuario: UsuarioEntidad) -> Curso:
    return a_curso(cargar_curso(curso_id, usuario))
