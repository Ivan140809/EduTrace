from typing import Any, ClassVar

from pydantic import BaseModel, ConfigDict, SerializationInfo, SerializerFunctionWrapHandler, model_serializer
from pydantic.alias_generators import to_camel


class EsquemaBase(BaseModel):
    """
    Base de todos los DTOs.

    - En Python los campos van en snake_case (`fecha_limite`); en el JSON salen y entran
      en camelCase (`fechaLimite`), como exige el contrato.
    - Un campo opcional que vale None se OMITE del JSON, porque en el contrato la mayoría
      de opcionales no admiten null (el frontend los tipa como `string`, no `string | null`).
      Los que el contrato sí declara anulables se listan en `CAMPOS_NULABLES` y salen como null.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    CAMPOS_NULABLES: ClassVar[frozenset[str]] = frozenset()

    @model_serializer(mode="wrap")
    def _omitir_nulos(self, handler: SerializerFunctionWrapHandler, info: SerializationInfo) -> Any:
        datos = handler(self)
        if not isinstance(datos, dict):
            return datos
        for nombre, campo in type(self).model_fields.items():
            clave = (campo.serialization_alias or campo.alias or nombre) if info.by_alias else nombre
            if clave in datos and datos[clave] is None and nombre not in self.CAMPOS_NULABLES:
                del datos[clave]
        return datos
