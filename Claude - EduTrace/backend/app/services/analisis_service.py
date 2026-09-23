"""
Análisis de una entrega y generación del borrador de retroalimentación.

MVP: NO hay IA conectada. Este servicio produce un borrador genérico con la estructura
de Hattie & Timperley para que el flujo completo (entrega → revisión docente → envío)
funcione de punta a punta. Cuando se integre el LLM, solo cambia `_generar_secciones`
(y `_analizar_codigo` si se compila o se corren casos de prueba). Nada más del backend
se entera.
"""
import difflib

from app.repositories import auditoria_repository, entrega_repository
from app.repositories.modelos import (
    EntregaEntidad,
    EventoAuditoriaEntidad,
    RetroalimentacionEntidad,
    TareaEntidad,
)

from .comun import SISTEMA, ahora, nuevo_id

MODELO = "plantilla-sin-ia"

_LENGUAJE_POR_EXTENSION = {"cpp": "cpp", "cc": "cpp", "hpp": "cpp", "h": "cpp", "c": "c", "py": "python", "java": "java"}


def _lenguaje(nombre: str, por_defecto: str) -> str:
    extension = nombre.rsplit(".", 1)[-1].lower() if "." in nombre else ""
    return _LENGUAJE_POR_EXTENSION.get(extension, por_defecto)


def _resumen_cambios(entrega: EntregaEntidad) -> str | None:
    """Compara con el intento oficial anterior del mismo estudiante (si existe)."""
    anteriores = [
        e
        for e in entrega_repository.de_estudiante_en_tarea(entrega.tarea_id, entrega.estudiante_id)
        if e.id != entrega.id and e.tipo == "oficial" and e.fecha_entrega < entrega.fecha_entrega
    ]
    if not anteriores:
        return None
    previo = "\n".join(a["contenido"] for a in anteriores[0].archivos)
    actual = "\n".join(a["contenido"] for a in entrega.archivos)
    cambios = sum(
        1 for linea in difflib.unified_diff(previo.splitlines(), actual.splitlines(), lineterm="", n=0)
        if linea[:1] in "+-" and not linea.startswith(("+++", "---"))
    )
    return f"Modificó {cambios} línea(s) respecto al intento anterior." if cambios else "Sin cambios respecto al intento anterior."


def _analizar_codigo(entrega: EntregaEntidad) -> dict:
    # Aquí irá la compilación / ejecución de casos de prueba (RF-04..RF-07).
    return {"compilacion": None, "lineas_marcadas": [], "resumen_cambios": _resumen_cambios(entrega), "modelo": MODELO}


def _generar_secciones(tarea: TareaEntidad) -> dict:
    # Aquí irá la llamada al LLM. Debe devolver las tres secciones y NUNCA la solución (RF-08, RF-09).
    return {
        "hacia_donde_voy": f"El objetivo de «{tarea.titulo}» es que tu programa resuelva el enunciado para cualquier entrada válida.",
        "como_voy": "Tu entrega fue recibida. Este es un borrador automático base: el docente lo completará con observaciones sobre tu código.",
        "que_sigue": "Prueba tu programa con al menos tres entradas distintas, incluyendo un caso límite, y compara la salida con lo que esperabas.",
        "pistas": ["Haz una traza a mano con una entrada pequeña y anota el valor de cada variable en cada paso."],
    }


def analizar(entrega: EntregaEntidad, tarea: TareaEntidad) -> EntregaEntidad:
    """Deja la entrega en 'pendiente_revision' con su borrador, o en 'error_analisis' si algo falla (RNF-14)."""
    entrega.estado = "en_analisis"
    entrega_repository.guardar(entrega)
    try:
        for archivo in entrega.archivos:
            archivo["lenguaje"] = _lenguaje(archivo["nombre"], tarea.lenguaje)
            archivo["lineas"] = len(archivo["contenido"].splitlines())
        entrega.analisis = _analizar_codigo(entrega)
        momento = ahora()
        entrega.retroalimentacion = RetroalimentacionEntidad(
            estado="pendiente_revision",
            origen="ia",
            secciones=_generar_secciones(tarea),
            generado_en=momento,
            actualizado_en=momento,
        )
        entrega.estado = "pendiente_revision"
        entrega.error_analisis = None
        auditoria_repository.guardar(
            EventoAuditoriaEntidad(
                id=nuevo_id(), entrega_id=entrega.id, autor_id=SISTEMA.id, accion="generar",
                fecha=momento, detalle={"modelo": MODELO},
            )
        )
    except Exception as exc:  # la entrega se conserva aunque el análisis falle
        entrega.estado = "error_analisis"
        entrega.error_analisis = f"No se pudo analizar la entrega: {exc}"
    return entrega_repository.guardar(entrega)
