"""
Datos de ejemplo que se cargan al arrancar (los repositorios están en memoria).

Cuentas:
  docente     pperez@javeriana.edu.co    / docente123
  estudiante  jperezg@javeriana.edu.co   / estudiante123
  estudiante  alopez@javeriana.edu.co    / estudiante123
"""
from datetime import timedelta

from app.core.security import hashear_clave
from app.repositories import curso_repository, usuario_repository
from app.repositories.modelos import CursoEntidad, UsuarioEntidad
from app.schemas.entrega import ArchivoCodigoCrear, EntregaCrear
from app.schemas.tarea import CasoPrueba, TareaCrear
from app.services import entrega_service, tarea_service
from app.services.comun import ahora

# IDs fijos para poder probar con curl o Postman sin buscarlos.
DOCENTE_ID = "d0000000-0000-4000-8000-000000000001"
JUAN_ID = "e0000000-0000-4000-8000-000000000001"
ANA_ID = "e0000000-0000-4000-8000-000000000002"
CURSO_ID = "c0000000-0000-4000-8000-000000000001"

CODIGO_JUAN = """#include <iostream>
using namespace std;

int main() {
    const int N = 5;
    int notas[N] = {40, 35, 50, 28, 45};
    int suma = 0;

    for (int i = 0; i <= N; i++) {
        suma += notas[i];
    }

    cout << "Promedio: " << suma / N << endl;
    return 0;
}
"""


def cargar() -> None:
    if usuario_repository.obtener(DOCENTE_ID):
        return  # ya se cargó

    docente = usuario_repository.guardar(
        UsuarioEntidad(DOCENTE_ID, "Pepito Pérez", "pperez@javeriana.edu.co", "docente", hashear_clave("docente123"))
    )
    juan = usuario_repository.guardar(
        UsuarioEntidad(JUAN_ID, "Juan Pérez Gómez", "jperezg@javeriana.edu.co", "estudiante", hashear_clave("estudiante123"))
    )
    usuario_repository.guardar(
        UsuarioEntidad(ANA_ID, "Ana López", "alopez@javeriana.edu.co", "estudiante", hashear_clave("estudiante123"))
    )
    curso_repository.guardar(
        CursoEntidad(
            id=CURSO_ID, nombre="Introducción a la Programación", periodo="2026-2",
            semana_actual=8, semanas_totales=16, docente_ids=[DOCENTE_ID], estudiante_ids=[JUAN_ID, ANA_ID],
        )
    )

    # Se crean con los servicios, igual que lo haría el frontend.
    tarea = tarea_service.crear_tarea(
        CURSO_ID,
        TareaCrear(
            titulo="Tarea 4 — Promedio de un arreglo",
            enunciado="Calcula el promedio de las notas guardadas en un arreglo de 5 enteros.",
            lenguaje="cpp",
            fecha_limite=ahora() + timedelta(days=7),
            max_intentos=3,
            corte="II",
            casos_prueba=[CasoPrueba(nombre="Ejemplo", entrada="", salida_esperada="Promedio: 39", visible_estudiante=True)],
        ),
        docente,
    )
    tarea_service.crear_tarea(
        CURSO_ID,
        TareaCrear(
            titulo="Tarea 5 — Funciones y paso de parámetros",
            lenguaje="cpp",
            fecha_limite=ahora() + timedelta(days=14),
            max_intentos=3,
            corte="II",
        ),
        docente,
    )
    entrega_service.crear_entrega(
        tarea.id,
        EntregaCrear(tipo="oficial", archivos=[ArchivoCodigoCrear(nombre="promedio_notas.cpp", contenido=CODIGO_JUAN)]),
        juan,
    )
