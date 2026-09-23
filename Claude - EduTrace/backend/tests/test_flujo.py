"""
Pruebas del flujo principal. Cada llamada valida además la respuesta contra openapi.yaml.

    pytest -q
"""
from .conftest import CURSO, Cliente


def _tarea4(c: Cliente) -> str:
    tareas = c.llamar("get", "/cursos/{cursoId}/tareas", CURSO).json()
    return next(t["id"] for t in tareas if t["titulo"].startswith("Tarea 4"))


def _entrega_pendiente(docente: Cliente, tarea_id: str) -> str:
    entregas = docente.llamar("get", "/tareas/{tareaId}/entregas", {"tareaId": tarea_id}).json()
    return next(e["id"] for e in entregas if e["estado"] == "pendiente_revision")


# ───────────── sesión ─────────────
def test_login_me_logout(http):
    c = Cliente(http)
    usuario = c.entrar("pperez@javeriana.edu.co", "docente123")
    assert usuario["rol"] == "docente" and usuario["iniciales"] == "PP"
    assert c.llamar("get", "/auth/me").json()["correo"] == "pperez@javeriana.edu.co"
    assert c.llamar("post", "/auth/logout").status_code == 204
    assert c.llamar("get", "/auth/me").status_code == 401  # el token ya no sirve


def test_login_incorrecto_y_sin_token(http):
    c = Cliente(http)
    r = c.llamar("post", "/auth/login", json={"correo": "pperez@javeriana.edu.co", "contrasena": "mala"})
    assert r.status_code == 401 and r.json()["error"]["codigo"] == "CREDENCIALES_INVALIDAS"
    r = http.get("/api/v1/cursos")
    assert r.status_code == 401 and r.json()["error"]["codigo"] == "NO_AUTENTICADO"


def test_validacion_devuelve_formato_de_error(http):
    r = Cliente(http).llamar("post", "/auth/login", json={"correo": "x"})
    assert r.status_code == 422
    assert r.json()["error"]["codigo"] == "VALIDACION"
    assert any(d["campo"] == "contrasena" for d in r.json()["error"]["detalles"])


# ───────────── flujo human-in-the-loop completo ─────────────
def test_flujo_revision_y_aprobacion(docente, juan):
    tarea_id = _tarea4(docente)

    # Antes de aprobar, el estudiante NO ve la retroalimentación (RNF-06)
    mis = juan.llamar("get", "/estudiantes/me/cursos/{cursoId}/tareas", CURSO).json()
    t4 = next(t for t in mis if t["tareaId"] == tarea_id)
    assert t4["estado"] == "en_revision"
    vista_est = juan.llamar("get", "/entregas/{entregaId}", {"entregaId": t4["ultimaEntregaId"]}).json()
    assert vista_est["retroalimentacion"] is None and "analisis" not in vista_est

    # El docente ve métricas, la cola, el código y el borrador
    resumen = docente.llamar("get", "/tareas/{tareaId}/resumen", {"tareaId": tarea_id}).json()
    assert resumen["estudiantes"] == 2 and resumen["pendientesRevision"] == 1
    entrega_id = _entrega_pendiente(docente, tarea_id)
    ids = {"entregaId": entrega_id}
    detalle = docente.llamar("get", "/entregas/{entregaId}", ids).json()
    assert detalle["archivos"][0]["nombre"] == "promedio_notas.cpp"
    assert detalle["retroalimentacion"]["origen"] == "ia"
    assert docente.llamar("get", "/entregas/{entregaId}/archivos", ids).status_code == 200

    # Edita el borrador y agrega comentario
    r = docente.llamar(
        "patch", "/entregas/{entregaId}/retroalimentacion", ids,
        json={
            "secciones": {"haciaDondeVoy": "Recorrer arreglos.", "comoVoy": "El ciclo da una vuelta de más.",
                          "queSigue": "¿Qué índices existen si N vale 5?", "pistas": ["Traza con N = 2."]},
            "comentarioDocente": "Vas bien, Juan.",
        },
    )
    assert r.status_code == 200 and r.json()["origen"] == "ia_editada"

    # Aprueba → queda enviada; ya no se puede editar
    r = docente.llamar("post", "/entregas/{entregaId}/retroalimentacion/aprobar", ids)
    assert r.status_code == 200 and r.json()["estado"] == "enviada"
    r = docente.llamar("patch", "/entregas/{entregaId}/retroalimentacion", ids, json={"comentarioDocente": "x"})
    assert r.status_code == 409

    # Ahora el estudiante sí la ve, con aviso de IA (RF-18) y sin nota numérica (RF-17)
    vista = juan.llamar("get", "/entregas/{entregaId}", ids).json()
    retro = vista["retroalimentacion"]
    assert retro["secciones"]["queSigue"] == "¿Qué índices existen si N vale 5?"
    assert retro["aviso"]["participoIA"] is True and retro["revisadoPor"]["nombre"] == "Pepito Pérez"
    assert "nota" not in retro and "calificacion" not in retro

    notifs = juan.llamar("get", "/notificaciones").json()
    assert notifs["noLeidas"] == 1 and notifs["items"][0]["tipo"] == "retroalimentacion_disponible"
    assert juan.llamar("post", "/entregas/{entregaId}/retroalimentacion/leida", ids).status_code == 204

    progreso = juan.llamar("get", "/estudiantes/me/cursos/{cursoId}/progreso", CURSO).json()
    assert progreso["retroalimentacionesLeidas"] == {"leidas": 1, "total": 1}
    intentos = juan.llamar("get", "/tareas/{tareaId}/intentos", {"tareaId": tarea_id}).json()
    assert intentos[0]["estado"] == "retroalimentado"


def test_descartar_y_aprobar_vacio_falla(docente):
    ids = {"entregaId": _entrega_pendiente(docente, _tarea4(docente))}
    r = docente.llamar("post", "/entregas/{entregaId}/retroalimentacion/descartar", ids, json={"motivo": "genérico"})
    assert r.status_code == 200 and r.json()["origen"] == "docente"
    r = docente.llamar("post", "/entregas/{entregaId}/retroalimentacion/aprobar", ids)
    assert r.status_code == 422  # «¿Qué sigue?» vacío (RF-03)


# ───────────── entregas del estudiante ─────────────
def test_entregar_intentos_y_revision(docente, ana):
    tarea_id = _tarea4(docente)
    ids = {"tareaId": tarea_id}
    codigo = {"nombre": "main.cpp", "contenido": "int main() { return 0; }"}

    r = ana.llamar("post", "/tareas/{tareaId}/entregas", ids, json={"tipo": "revision", "archivos": [codigo]})
    assert r.status_code == 202 and r.json()["numeroIntento"] is None  # la revisión no gasta intento
    for n in (1, 2, 3):
        r = ana.llamar("post", "/tareas/{tareaId}/entregas", ids, json={"tipo": "oficial", "archivos": [codigo]})
        assert r.status_code == 202 and r.json()["numeroIntento"] == n
    r = ana.llamar("post", "/tareas/{tareaId}/entregas", ids, json={"tipo": "oficial", "archivos": [codigo]})
    assert r.status_code == 409 and r.json()["error"]["codigo"] == "INTENTOS_AGOTADOS"

    intentos = ana.llamar("get", "/tareas/{tareaId}/intentos", ids).json()
    assert [i["etiqueta"] for i in intentos] == ["Intento 3", "Intento 2", "Intento 1", "Revisión"]
    assert docente.llamar("get", "/notificaciones").json()["noLeidas"] >= 4


# ───────────── permisos ─────────────
def test_permisos(docente, juan, ana):
    tarea_id = _tarea4(docente)
    entrega_juan = _entrega_pendiente(docente, tarea_id)

    # Un estudiante no puede usar endpoints de docente
    assert juan.llamar("get", "/tareas/{tareaId}/entregas", {"tareaId": tarea_id}).status_code == 403
    assert juan.llamar("get", "/entregas/{entregaId}/retroalimentacion", {"entregaId": entrega_juan}).status_code == 403
    r = juan.llamar("post", "/entregas/{entregaId}/retroalimentacion/aprobar", {"entregaId": entrega_juan})
    assert r.status_code == 409 or r.status_code == 403  # nunca 200
    # Ana no puede ver la entrega de Juan (RNF-03)
    assert ana.llamar("get", "/entregas/{entregaId}", {"entregaId": entrega_juan}).status_code == 403
    # El docente no puede entregar tareas
    r = docente.llamar("post", "/tareas/{tareaId}/entregas", {"tareaId": tarea_id},
                       json={"tipo": "oficial", "archivos": [{"nombre": "a.cpp", "contenido": "x"}]})
    assert r.status_code == 403


def test_crear_tarea(docente, juan):
    nueva = {
        "titulo": "Tarea 6 — Archivos",
        "lenguaje": "cpp",
        "fechaLimite": "2030-01-01T00:00:00Z",
        "maxIntentos": 2,
        "rubrica": "Interna",
        "casosPrueba": [{"nombre": "oculto", "entrada": "1", "salidaEsperada": "2"}],
    }
    r = docente.llamar("post", "/cursos/{cursoId}/tareas", CURSO, json=nueva)
    assert r.status_code == 201 and r.json()["estado"] == "abierta"
    tarea_id = r.json()["id"]
    vista = juan.llamar("get", "/tareas/{tareaId}", {"tareaId": tarea_id}).json()
    assert "rubrica" not in vista and vista["casosPrueba"] == []  # lo oculto no llega al estudiante
    assert juan.llamar("post", "/cursos/{cursoId}/tareas", CURSO, json=nueva).status_code == 403
