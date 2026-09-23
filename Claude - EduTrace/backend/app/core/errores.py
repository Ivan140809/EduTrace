"""
Errores con el formato del contrato:  { "error": { "codigo", "mensaje", "detalles" } }

Los servicios lanzan ErrorNegocio; main.py registra los manejadores que lo
convierten en la respuesta HTTP. Los controladores no tratan errores.
"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ErrorNegocio(Exception):
    def __init__(self, status: int, codigo: str, mensaje: str, detalles: list[dict] | None = None):
        super().__init__(mensaje)
        self.status = status
        self.codigo = codigo
        self.mensaje = mensaje
        self.detalles = detalles or []


# Atajos para los errores más comunes
def no_autenticado() -> ErrorNegocio:
    return ErrorNegocio(401, "NO_AUTENTICADO", "Debes iniciar sesión.")


def prohibido(mensaje: str = "No tienes acceso a este recurso.") -> ErrorNegocio:
    return ErrorNegocio(403, "PROHIBIDO", mensaje)


def no_encontrado(recurso: str) -> ErrorNegocio:
    return ErrorNegocio(404, "NO_ENCONTRADO", f"{recurso} no existe.")


def estado_invalido(mensaje: str) -> ErrorNegocio:
    return ErrorNegocio(409, "ESTADO_INVALIDO", mensaje)


def validacion(mensaje: str, detalles: list[dict] | None = None) -> ErrorNegocio:
    return ErrorNegocio(422, "VALIDACION", mensaje, detalles)


def _cuerpo(codigo: str, mensaje: str, detalles: list[dict]) -> dict:
    return {"error": {"codigo": codigo, "mensaje": mensaje, "detalles": detalles}}


def registrar_manejadores(app: FastAPI) -> None:
    @app.exception_handler(ErrorNegocio)
    async def _negocio(_: Request, exc: ErrorNegocio):
        return JSONResponse(status_code=exc.status, content=_cuerpo(exc.codigo, exc.mensaje, exc.detalles))

    @app.exception_handler(RequestValidationError)
    async def _validacion(_: Request, exc: RequestValidationError):
        detalles = [
            {"campo": ".".join(str(p) for p in e["loc"][1:]) or str(e["loc"][0]), "problema": e["msg"]}
            for e in exc.errors()
        ]
        return JSONResponse(status_code=422, content=_cuerpo("VALIDACION", "Datos inválidos.", detalles))

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException):
        codigo = "NO_ENCONTRADO" if exc.status_code == 404 else f"HTTP_{exc.status_code}"
        return JSONResponse(status_code=exc.status_code, content=_cuerpo(codigo, str(exc.detail), []))
