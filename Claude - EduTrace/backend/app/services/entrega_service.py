from app.core import config
from app.core.errores import ErrorNegocio, no_encontrado, prohibido
from app.repositories import curso_repository, entrega_repository, tarea_repository
from app.repositories.modelos import CursoEntidad, EntregaEntidad, TareaEntidad, UsuarioEntidad
from app.schemas.entrega import (
    ArchivoCodigo,
    EntregaCrear,
    EntregaDocente,
    EntregaEstudiante,
    EntregaResumen,
    Intento,
    ResultadoAnalisis,
)
from app.schemas.retroalimentacion import (
    AvisoIA,
    Retroalimentacion,
    RetroalimentacionPublicada,
    SeccionesFeedback,
)

from . import analisis_service, notificacion_service
from .comun import ahora, es_docente, exigir_docente, exigir_estudiante, nuevo_id, resumen_por_id
from .tarea_service import cargar_tarea


# ───────────── carga con permisos ─────────────
def cargar_entrega(entrega_id: str, usuario: UsuarioEntidad) -> tuple[EntregaEntidad, TareaEntidad, CursoEntidad]:
    """Solo el docente del curso o el estudiante dueño pueden ver una entrega (RNF-03)."""
    entrega = entrega_repository.obtener(entrega_id)
    if entrega is None:
        raise no_encontrado("La entrega")
    tarea = tarea_repository.obtener(entrega.tarea_id)
    curso = curso_repository.obtener(tarea.curso_id) if tarea else None
    if tarea is None or curso is None:
        raise no_encontrado("La entrega")
    if not (es_docente(curso, usuario) or entrega.estudiante_id == usuario.id):
        raise prohibido("No tienes acceso a esta entrega.")
    return entrega, tarea, curso


# ───────────── conversiones entidad → DTO ─────────────
def a_resumen_entrega(e: EntregaEntidad, t: TareaEntidad, con_correo: bool = False) -> EntregaResumen:
    return EntregaResumen(
        id=e.id,
        tarea_id=e.tarea_id,
        estudiante=resumen_por_id(e.estudiante_id, con_correo),
        tipo=e.tipo,
        numero_intento=e.numero_intento,
        max_intentos=t.max_intentos,
        estado=e.estado,
        fecha_entrega=e.fecha_entrega,
        fecha_envio=e.fecha_envio,
    )


def a_retro_docente(e: EntregaEntidad) -> Retroalimentacion | None:
    r = e.retroalimentacion
    if r is None:
        return None
    return Retroalimentacion(
        entrega_id=e.id,
        estado=r.estado,
        origen=r.origen,
        secciones=SeccionesFeedback(**r.secciones),
        comentario_docente=r.comentario_docente,
        generado_en=r.generado_en,
        actualizado_en=r.actualizado_en,
    )


def a_retro_publicada(e: EntregaEntidad) -> RetroalimentacionPublicada | None:
    """El estudiante solo ve la retroalimentación cuando el docente la aprobó (RNF-06)."""
    r = e.retroalimentacion
    if r is None or e.estado != "enviada" or e.fecha_envio is None:
        return None
    participo_ia = r.origen in ("ia", "ia_editada")
    return RetroalimentacionPublicada(
        secciones=SeccionesFeedback(**r.secciones),
        comentario_docente=r.comentario_docente,
        origen=r.origen,
        aviso=AvisoIA(  # RF-18
            participo_ia=participo_ia,
            texto=(
                "EduTrace generó un borrador con IA; tu profesor lo revisó y aprobó."
                if participo_ia
                else "Esta retroalimentación la escribió tu profesor."
            ),
        ),
        revisado_por=resumen_por_id(r.revisado_por_id) if r.revisado_por_id else resumen_por_id(""),
        fecha_envio=e.fecha_envio,
        leida=r.leida,
    )


def a_entrega_docente(e: EntregaEntidad, t: TareaEntidad) -> EntregaDocente:
    return EntregaDocente(
        **a_resumen_entrega(e, t, con_correo=True).model_dump(),
        archivos=[ArchivoCodigo(**a) for a in e.archivos],
        analisis=ResultadoAnalisis(**e.analisis) if e.analisis else None,
        retroalimentacion=a_retro_docente(e),
        dificultad_percibida=e.dificultad_percibida,
        error_analisis=e.error_analisis,
    )


def a_entrega_estudiante(e: EntregaEntidad, t: TareaEntidad) -> EntregaEstudiante:
    return EntregaEstudiante(**a_resumen_entrega(e, t).model_dump(), retroalimentacion=a_retro_publicada(e))


# ───────────── casos de uso ─────────────
def listar_entregas(tarea_id: str, usuario: UsuarioEntidad) -> list[EntregaResumen]:
    tarea, curso = cargar_tarea(tarea_id, usuario)
    exigir_docente(curso, usuario)
    return [a_resumen_entrega(e, tarea, con_correo=True) for e in entrega_repository.de_tarea(tarea.id)]


def crear_entrega(tarea_id: str, datos: EntregaCrear, usuario: UsuarioEntidad) -> EntregaEstudiante:
    tarea, curso = cargar_tarea(tarea_id, usuario)
    exigir_estudiante(curso, usuario)

    if tarea.estado != "abierta" or ahora() > tarea.fecha_limite:
        raise ErrorNegocio(409, "TAREA_CERRADA", "La tarea ya no recibe entregas.")
    if datos.tipo == "revision" and not tarea.permitir_revision_previa:
        raise ErrorNegocio(409, "REVISION_NO_PERMITIDA", "Esta tarea no permite revisión previa.")
    if sum(len(a.contenido.encode()) for a in datos.archivos) > config.MAX_BYTES_ENTREGA:
        raise ErrorNegocio(413, "ENTREGA_MUY_GRANDE", "Los archivos superan el tamaño máximo (200 KB).")

    oficiales = [e for e in entrega_repository.de_estudiante_en_tarea(tarea.id, usuario.id) if e.tipo == "oficial"]
    if datos.tipo == "oficial" and len(oficiales) >= tarea.max_intentos:
        raise ErrorNegocio(409, "INTENTOS_AGOTADOS", f"Ya usaste los {tarea.max_intentos} intentos de esta tarea.")

    entrega = entrega_repository.guardar(
        EntregaEntidad(
            id=nuevo_id(),
            tarea_id=tarea.id,
            estudiante_id=usuario.id,
            tipo=datos.tipo,
            numero_intento=len(oficiales) + 1 if datos.tipo == "oficial" else None,  # la revisión no gasta intento
            estado="recibida",
            fecha_entrega=ahora(),
            archivos=[a.model_dump() for a in datos.archivos],
            dificultad_percibida=datos.dificultad_percibida,
        )
    )

    # RF-16: el análisis se dispara solo. En el MVP es síncrono; con IA real conviene
    # pasarlo a una tarea en segundo plano (el contrato ya responde 202 por eso).
    analisis_service.analizar(entrega, tarea)

    for docente_id in curso.docente_ids:
        if entrega.estado == "pendiente_revision":
            notificacion_service.notificar(
                docente_id, "entrega_por_revisar",
                f"Nueva entrega por revisar en «{tarea.titulo}».", "entrega", entrega.id,
            )
        else:
            notificacion_service.notificar(
                docente_id, "fallo_analisis",
                f"Falló el análisis de una entrega en «{tarea.titulo}».", "entrega", entrega.id,
            )
    return a_entrega_estudiante(entrega, tarea)


def listar_intentos(tarea_id: str, usuario: UsuarioEntidad, estudiante_id: str | None) -> list[Intento]:
    tarea, curso = cargar_tarea(tarea_id, usuario)
    if es_docente(curso, usuario):
        if not estudiante_id:
            raise ErrorNegocio(422, "VALIDACION", "El docente debe indicar estudianteId.")
        objetivo = estudiante_id
    else:
        objetivo = usuario.id  # el estudiante solo ve los suyos: se ignora el parámetro

    intentos = []
    for e in entrega_repository.de_estudiante_en_tarea(tarea.id, objetivo):
        enviada = e.estado == "enviada"
        marcadas = (e.analisis or {}).get("lineas_marcadas") or []
        intentos.append(
            Intento(
                entrega_id=e.id,
                etiqueta=f"Intento {e.numero_intento}" if e.tipo == "oficial" else "Revisión",
                tipo=e.tipo,
                fecha=e.fecha_entrega,
                titulo=(e.analisis or {}).get("resumen_cambios") if enviada else None,
                nota=marcadas[0]["mensaje"] if enviada and marcadas else None,
                estado="retroalimentado" if enviada else "en_revision",
            )
        )
    return intentos


def obtener_entrega(entrega_id: str, usuario: UsuarioEntidad) -> EntregaDocente | EntregaEstudiante:
    entrega, tarea, curso = cargar_entrega(entrega_id, usuario)
    if es_docente(curso, usuario):
        return a_entrega_docente(entrega, tarea)
    return a_entrega_estudiante(entrega, tarea)


def archivos_entrega(entrega_id: str, usuario: UsuarioEntidad) -> list[ArchivoCodigo]:
    entrega, _, _ = cargar_entrega(entrega_id, usuario)
    return [ArchivoCodigo(**a) for a in entrega.archivos]
