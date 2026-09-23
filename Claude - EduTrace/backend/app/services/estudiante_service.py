from app.repositories import entrega_repository, tarea_repository
from app.repositories.modelos import UsuarioEntidad
from app.schemas.estudiante import Conteo, ConteoLeidas, ProgresoEstudiante, TareaEstudiante

from .comun import ahora, exigir_estudiante
from .curso_service import cargar_curso


def mis_tareas(curso_id: str, usuario: UsuarioEntidad) -> list[TareaEstudiante]:
    curso = cargar_curso(curso_id, usuario)
    exigir_estudiante(curso, usuario)

    resultado = []
    for tarea in tarea_repository.de_curso(curso_id):
        if tarea.estado == "borrador":
            continue
        oficiales = [
            e for e in entrega_repository.de_estudiante_en_tarea(tarea.id, usuario.id) if e.tipo == "oficial"
        ]
        ultima = oficiales[0] if oficiales else None  # vienen de la más reciente a la más antigua
        if ultima is None:
            estado = "vencida" if ahora() > tarea.fecha_limite else "pendiente"
        else:
            # 'aprobada' depende de la calificación del docente, que aún no está en el MVP.
            estado = "retroalimentada" if ultima.estado == "enviada" else "en_revision"
        resultado.append(
            TareaEstudiante(
                tarea_id=tarea.id,
                titulo=tarea.titulo,
                fecha_limite=tarea.fecha_limite,
                estado=estado,
                intentos_usados=len(oficiales),
                max_intentos=tarea.max_intentos,
                ultima_entrega_id=ultima.id if ultima else None,
                ultima_entrega_fecha=ultima.fecha_entrega if ultima else None,
            )
        )
    return resultado


def mi_progreso(curso_id: str, usuario: UsuarioEntidad) -> ProgresoEstudiante:
    curso = cargar_curso(curso_id, usuario)
    exigir_estudiante(curso, usuario)

    tareas = [t for t in tarea_repository.de_curso(curso_id) if t.estado != "borrador"]
    hechas, intentos_por_tarea, enviadas, corregidos = 0, [], [], 0
    for tarea in tareas:
        oficiales = [
            e for e in entrega_repository.de_estudiante_en_tarea(tarea.id, usuario.id) if e.tipo == "oficial"
        ]
        if oficiales:
            hechas += 1
            intentos_por_tarea.append(len(oficiales))
        enviadas += [e for e in oficiales if e.estado == "enviada"]

        # Errores corregidos: líneas marcadas en el intento N que ya no aparecen en el N+1.
        cronologico = list(reversed(oficiales))
        for antes, despues in zip(cronologico, cronologico[1:]):
            clave = lambda e: {(m["archivo"], m["mensaje"]) for m in (e.analisis or {}).get("lineas_marcadas", [])}
            corregidos += len(clave(antes) - clave(despues))

    return ProgresoEstudiante(
        entregas_al_dia=Conteo(hechas=hechas, total=len(tareas)),
        retroalimentaciones_leidas=ConteoLeidas(
            leidas=sum(1 for e in enviadas if e.retroalimentacion and e.retroalimentacion.leida),
            total=len(enviadas),
        ),
        errores_corregidos=corregidos,
        intentos_promedio=round(sum(intentos_por_tarea) / len(intentos_por_tarea), 1) if intentos_por_tarea else 0.0,
        temas=[],  # "Dónde me cuesta más" necesita el syllabus (RAE/temas), fuera del MVP
    )
