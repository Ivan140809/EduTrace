"""
Entidades internas: lo que realmente se guarda.

Son distintas de los DTOs (app/schemas): por ejemplo UsuarioEntidad tiene el hash
de la contraseña, que nunca debe salir en una respuesta. Los servicios convierten
entidades ↔ DTOs.
"""
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class UsuarioEntidad:
    id: str
    nombre: str
    correo: str
    rol: str  # 'docente' | 'estudiante'
    hash_clave: str


@dataclass
class SesionEntidad:
    id: str  # el token
    usuario_id: str
    expira_en: datetime


@dataclass
class CursoEntidad:
    id: str
    nombre: str
    periodo: str
    semana_actual: int
    semanas_totales: int
    docente_ids: list[str] = field(default_factory=list)
    estudiante_ids: list[str] = field(default_factory=list)


@dataclass
class TareaEntidad:
    id: str
    curso_id: str
    titulo: str
    lenguaje: str
    fecha_limite: datetime
    max_intentos: int
    estado: str  # 'borrador' | 'abierta' | 'cerrada'
    enunciado: str | None = None
    corte: str | None = None
    rae_ids: list[str] = field(default_factory=list)
    tema_ids: list[str] = field(default_factory=list)
    criterios: dict = field(default_factory=dict)
    rubrica: str | None = None
    casos_prueba: list[dict] = field(default_factory=list)
    permitir_revision_previa: bool = True


@dataclass
class RetroalimentacionEntidad:
    estado: str  # 'pendiente_revision' | 'enviada'
    origen: str  # 'ia' | 'ia_editada' | 'docente'
    secciones: dict
    generado_en: datetime
    actualizado_en: datetime
    comentario_docente: str | None = None
    revisado_por_id: str | None = None
    leida: bool = False


@dataclass
class EntregaEntidad:
    id: str
    tarea_id: str
    estudiante_id: str
    tipo: str  # 'oficial' | 'revision'
    numero_intento: int | None
    estado: str
    fecha_entrega: datetime
    archivos: list[dict]
    fecha_envio: datetime | None = None
    dificultad_percibida: int | None = None
    analisis: dict | None = None
    error_analisis: str | None = None
    retroalimentacion: RetroalimentacionEntidad | None = None


@dataclass
class NotificacionEntidad:
    id: str
    usuario_id: str
    tipo: str
    mensaje: str
    fecha: datetime
    enlace_recurso: str | None = None
    enlace_id: str | None = None
    leida: bool = False


@dataclass
class EventoAuditoriaEntidad:
    id: str
    entrega_id: str
    autor_id: str
    accion: str
    fecha: datetime
    detalle: dict = field(default_factory=dict)
