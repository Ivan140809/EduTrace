from app.core.errores import no_encontrado
from app.repositories import curso_repository, entrega_repository, tarea_repository
from app.repositories.modelos import CursoEntidad, TareaEntidad, UsuarioEntidad
from app.schemas.tarea import CasoPrueba, CriteriosEvaluacion, ResumenTarea, Tarea, TareaCrear

from .comun import es_docente, exigir_docente, exigir_miembro, nuevo_id
from .curso_service import cargar_curso


def cargar_tarea(tarea_id: str, usuario: UsuarioEntidad) -> tuple[TareaEntidad, CursoEntidad]:
    tarea = tarea_repository.obtener(tarea_id)
    if tarea is None:
        raise no_encontrado("La tarea")
    curso = curso_repository.obtener(tarea.curso_id)
    if curso is None:
        raise no_encontrado("El curso")
    exigir_miembro(curso, usuario)
    return tarea, curso


def a_tarea(t: TareaEntidad, para_docente: bool) -> Tarea:
    casos = t.casos_prueba if para_docente else [c for c in t.casos_prueba if c.get("visible_estudiante")]
    return Tarea(
        id=t.id,
        curso_id=t.curso_id,
        estado=t.estado,
        titulo=t.titulo,
        enunciado=t.enunciado,
        lenguaje=t.lenguaje,
        fecha_limite=t.fecha_limite,
        max_intentos=t.max_intentos,
        corte=t.corte,
        rae_ids=t.rae_ids,
        tema_ids=t.tema_ids,
        criterios=CriteriosEvaluacion(**t.criterios),
        rubrica=t.rubrica if para_docente else None,  # la rúbrica interna no se muestra al estudiante
        casos_prueba=[CasoPrueba(**c) for c in casos],
        permitir_revision_previa=t.permitir_revision_previa,
    )


def listar_tareas(curso_id: str, usuario: UsuarioEntidad) -> list[Tarea]:
    curso = cargar_curso(curso_id, usuario)
    docente = es_docente(curso, usuario)
    tareas = tarea_repository.de_curso(curso_id)
    if not docente:
        tareas = [t for t in tareas if t.estado != "borrador"]
    return [a_tarea(t, docente) for t in tareas]


def crear_tarea(curso_id: str, datos: TareaCrear, usuario: UsuarioEntidad) -> Tarea:
    curso = cargar_curso(curso_id, usuario)
    exigir_docente(curso, usuario)
    casos = [{**c.model_dump(), "id": c.id or nuevo_id()} for c in datos.casos_prueba]
    tarea = TareaEntidad(
        id=nuevo_id(),
        curso_id=curso_id,
        estado="abierta",
        titulo=datos.titulo,
        enunciado=datos.enunciado,
        lenguaje=datos.lenguaje,
        fecha_limite=datos.fecha_limite,
        max_intentos=datos.max_intentos,
        corte=datos.corte,
        rae_ids=datos.rae_ids,
        tema_ids=datos.tema_ids,
        criterios=datos.criterios.model_dump(),
        rubrica=datos.rubrica,
        casos_prueba=casos,
        permitir_revision_previa=datos.permitir_revision_previa,
    )
    return a_tarea(tarea_repository.guardar(tarea), para_docente=True)


def obtener_tarea(tarea_id: str, usuario: UsuarioEntidad) -> Tarea:
    tarea, curso = cargar_tarea(tarea_id, usuario)
    return a_tarea(tarea, es_docente(curso, usuario))


def resumen_tarea(tarea_id: str, usuario: UsuarioEntidad) -> ResumenTarea:
    tarea, curso = cargar_tarea(tarea_id, usuario)
    exigir_docente(curso, usuario)
    oficiales = [e for e in entrega_repository.de_tarea(tarea.id) if e.tipo == "oficial"]
    enviadas = [e for e in oficiales if e.estado == "enviada" and e.fecha_envio]
    horas = [(e.fecha_envio - e.fecha_entrega).total_seconds() / 3600 for e in enviadas]
    return ResumenTarea(
        estudiantes=len(curso.estudiante_ids),
        entregas_recibidas=len(oficiales),
        pendientes_revision=sum(1 for e in entrega_repository.de_tarea(tarea.id) if e.estado == "pendiente_revision"),
        tiempo_medio_respuesta_horas=round(sum(horas) / len(horas), 2) if horas else None,
        tiempo_medio_revision_docente_min=None,  # requiere registrar cuándo abre la entrega el docente
    )
