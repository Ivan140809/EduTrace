import sys
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import semilla  # noqa: E402
from app.main import app  # noqa: E402
from app.repositories import reiniciar_todo  # noqa: E402

SPEC = yaml.safe_load((Path(__file__).resolve().parents[1] / "contrato" / "openapi.yaml").read_text(encoding="utf-8"))
API = "/api/v1"

# Defecto del contrato v0.4: `descartar` debe dejar las secciones vacías, pero SeccionesFeedback
# exige queSigue con minLength 1 también en las RESPUESTAS. Se relaja solo para validar respuestas;
# en la entrada el backend sí lo exige (SeccionesFeedbackEntrada) y al aprobar responde 422.
SPEC["components"]["schemas"]["SeccionesFeedback"]["properties"]["queSigue"].pop("minLength", None)


def validar_contra_contrato(ruta_contrato: str, metodo: str, respuesta) -> None:
    """Comprueba que el cuerpo de la respuesta cumple el esquema que define openapi.yaml."""
    op = SPEC["paths"][ruta_contrato][metodo]
    definicion = op["responses"].get(str(respuesta.status_code))
    if definicion is None:
        # El contrato no declara ese código en esta operación (p. ej. 403 en /aprobar).
        # Regla global del contrato: todo error usa el esquema Error. Un éxito no declarado sí es fallo.
        assert respuesta.status_code >= 400, f"{metodo} {ruta_contrato}: {respuesta.status_code} no está en el contrato"
        definicion = {"content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
    if "$ref" in definicion:  # respuestas compartidas (#/components/responses/...)
        definicion = SPEC["components"]["responses"][definicion["$ref"].split("/")[-1]]
    contenido = definicion.get("content")
    if not contenido:
        assert respuesta.content in (b"", b"null"), f"{metodo} {ruta_contrato} no debía traer cuerpo"
        return
    esquema = contenido["application/json"]["schema"]
    if "oneOf" in esquema:
        # Defecto del contrato v0.4: en GET /entregas/{id} la vista del estudiante también cumple
        # EntregaDocente (sus campos extra no son obligatorios), así que `oneOf` nunca se satisface.
        # Se valida con la intención real: que cumpla al menos una de las dos formas.
        esquema = {"anyOf": esquema["oneOf"]}
    Draft202012Validator({**esquema, "components": SPEC["components"]}).validate(respuesta.json())


class Cliente:
    """TestClient + token + validación automática contra el contrato en cada llamada."""

    def __init__(self, http: TestClient):
        self.http = http
        self.token: str | None = None

    def llamar(self, metodo: str, ruta_contrato: str, ids: dict | None = None, **kwargs):
        ruta = ruta_contrato.format(**(ids or {}))
        headers = kwargs.pop("headers", {})
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        r = self.http.request(metodo.upper(), API + ruta, headers=headers, **kwargs)
        validar_contra_contrato(ruta_contrato, metodo.lower(), r)
        return r

    def entrar(self, correo: str, clave: str):
        r = self.llamar("post", "/auth/login", json={"correo": correo, "contrasena": clave})
        assert r.status_code == 200, r.text
        self.token = r.json()["token"]
        return r.json()["usuario"]


@pytest.fixture()
def http():
    reiniciar_todo()
    with TestClient(app) as cliente:  # el `with` ejecuta el arranque (carga la semilla)
        yield cliente


@pytest.fixture()
def docente(http):
    c = Cliente(http)
    c.entrar("pperez@javeriana.edu.co", "docente123")
    return c


@pytest.fixture()
def juan(http):
    c = Cliente(http)
    c.entrar("jperezg@javeriana.edu.co", "estudiante123")
    return c


@pytest.fixture()
def ana(http):
    c = Cliente(http)
    c.entrar("alopez@javeriana.edu.co", "estudiante123")
    return c


CURSO = {"cursoId": semilla.CURSO_ID}
