"""Flujo human-in-the-loop: el docente revisa, edita, descarta o aprueba (RF-10..RF-13, RNF-06)."""
from app.core.errores import ErrorNegocio, estado_invalido, prohibido, validacion
from app.repositories import auditoria_repository, entrega_repository
from app.repositories.modelos import EntregaEntidad, EventoAuditoriaEntidad, TareaEntidad, UsuarioEntidad
from app.schemas.entrega import EntregaDocente
from app.schemas.retroalimentacion import DescartarRequest, Retroalimentacion, RetroalimentacionEditar

from . import notificacion_service
from .comun import ahora, es_docente, nuevo_id
from .entrega_service import a_entrega_docente, a_retro_docente, cargar_entrega


def _cargar_para_docente(entrega_id: str, usuario: UsuarioEntidad) -> tuple[EntregaEntidad, TareaEntidad]:
    entrega, tarea, curso = cargar_entrega(entrega_id, usuario)
    if not es_docente(curso, usuario):
        raise prohibido("Solo el docente del curso puede revisar la retroalimentación.")
    return entrega, tarea


def _exigir_pendiente(entrega: EntregaEntidad) -> None:
    if entrega.retroalimentacion is None:
        raise ErrorNegocio(409, "ANALISIS_EN_CURSO", "El análisis de esta entrega aún no termina.")
    if entrega.estado != "pendiente_revision":
        raise estado_invalido("Esta retroalimentación ya fue enviada y no se puede modificar.")


def _auditar(entrega: EntregaEntidad, usuario: UsuarioEntidad, accion: str, detalle: dict | None = None) -> None:
    auditoria_repository.guardar(  # RF-20
        EventoAuditoriaEntidad(
            id=nuevo_id(), entrega_id=entrega.id, autor_id=usuario.id,
            accion=accion, fecha=ahora(), detalle=detalle or {},
        )
    )


def obtener(entrega_id: str, usuario: UsuarioEntidad) -> Retroalimentacion:
    entrega, _ = _cargar_para_docente(entrega_id, usuario)
    retro = a_retro_docente(entrega)
    if retro is None:
        raise ErrorNegocio(409, "ANALISIS_EN_CURSO", "El análisis de esta entrega aún no termina.")
    return retro


def editar(entrega_id: str, datos: RetroalimentacionEditar, usuario: UsuarioEntidad) -> Retroalimentacion:
    entrega, _ = _cargar_para_docente(entrega_id, usuario)
    _exigir_pendiente(entrega)
    cambios = datos.model_fields_set  # solo lo que el cliente envió
    if not cambios:
        raise validacion("No enviaste ningún cambio.")

    retro = entrega.retroalimentacion
    if "secciones" in cambios and datos.secciones is not None:
        retro.secciones = datos.secciones.model_dump()
        if retro.origen == "ia":
            retro.origen = "ia_editada"
    if "comentario_docente" in cambios:
        retro.comentario_docente = datos.comentario_docente
    retro.actualizado_en = ahora()
    entrega_repository.guardar(entrega)
    _auditar(entrega, usuario, "editar", {"campos": sorted(cambios)})
    return a_retro_docente(entrega)


def descartar(entrega_id: str, datos: DescartarRequest, usuario: UsuarioEntidad) -> Retroalimentacion:
    entrega, _ = _cargar_para_docente(entrega_id, usuario)
    _exigir_pendiente(entrega)
    retro = entrega.retroalimentacion
    retro.secciones = {"hacia_donde_voy": "", "como_voy": "", "que_sigue": "", "pistas": []}
    retro.origen = "docente"
    retro.actualizado_en = ahora()
    entrega_repository.guardar(entrega)
    _auditar(entrega, usuario, "descartar", {"motivo": datos.motivo})
    return a_retro_docente(entrega)


def aprobar(entrega_id: str, usuario: UsuarioEntidad) -> EntregaDocente:
    entrega, tarea = _cargar_para_docente(entrega_id, usuario)
    _exigir_pendiente(entrega)
    retro = entrega.retroalimentacion
    if not retro.secciones.get("que_sigue", "").strip():  # RF-03
        raise validacion(
            "La sección «¿Qué sigue?» no puede estar vacía.",
            [{"campo": "secciones.queSigue", "problema": "Obligatoria antes de enviar"}],
        )

    momento = ahora()
    retro.estado = "enviada"
    retro.revisado_por_id = usuario.id
    retro.actualizado_en = momento
    entrega.estado = "enviada"
    entrega.fecha_envio = momento
    entrega_repository.guardar(entrega)
    _auditar(entrega, usuario, "aprobar")
    notificacion_service.notificar(
        entrega.estudiante_id, "retroalimentacion_disponible",
        f"Tienes retroalimentación nueva en «{tarea.titulo}».", "entrega", entrega.id,
    )
    return a_entrega_docente(entrega, tarea)


def marcar_leida(entrega_id: str, usuario: UsuarioEntidad) -> None:
    entrega, _, _ = cargar_entrega(entrega_id, usuario)
    if entrega.estudiante_id != usuario.id:
        raise prohibido("Solo el estudiante dueño puede marcarla como leída.")
    if entrega.estado != "enviada" or entrega.retroalimentacion is None:
        raise estado_invalido("La retroalimentación todavía no ha sido enviada.")
    entrega.retroalimentacion.leida = True
    entrega_repository.guardar(entrega)
