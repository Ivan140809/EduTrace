# EduTrace: contrato de API (v0.4, borrador)

El contrato completo está en `openapi.yaml` (OpenAPI 3.1, validado). Este documento explica las decisiones y lo que el equipo tiene que resolver antes de implementar.

**Fuentes:** Fase de Análisis (RF-01 a RF-23, RNF-01 a RNF-16) y el mockup `preview.html`.
**Stack sugerido para el backend:** FastAPI con Pydantic (`alias_generator=to_camel`). Así el mismo `openapi.yaml` sirve para validar y para generar los tipos TypeScript del frontend (`openapi-typescript`).

---

## 1. Reglas que el backend hace cumplir (no el frontend)

1. **Nada llega al estudiante sin aprobación del docente** (RNF-06). `GET /entregas/{id}` le devuelve al estudiante `retroalimentacion: null` hasta que la entrega esté en `enviada`. El borrador y el análisis interno nunca se serializan para el rol estudiante.
2. **La retroalimentación no lleva nota** (RF-17). El esquema `SeccionesFeedback` no tiene campo numérico. La nota sumativa es otro recurso (`PUT /entregas/{id}/calificacion`), solo la escribe el docente y la IA nunca la propone.
3. **Estructura de Hattie & Timperley** (RF-02 y RF-03): `haciaDondeVoy`, `comoVoy` y `queSigue`. `aprobar` responde 422 si `queSigue` está vacío.
4. **Origen del contenido** (RF-19): `ia`, `ia_editada` o `docente`. Lo calcula el backend y el cliente no lo puede mandar.
5. **Auditoría** (RF-20): cada operación de generar, editar, descartar, aprobar, reanalizar o calificar escribe en `EventoAuditoria` con autor y fecha.
6. **La entrega se guarda aunque la IA falle** (RNF-14). Primero se persiste la entrega y después se encola el análisis. Si el análisis falla, la entrega queda en `error_analisis` y se notifica al docente (RNF-15).
7. **Datos hacia la IA externa** (RNF-05): al LLM solo se envían el código y el enunciado. Nunca nombre, correo ni ID del estudiante. Esta política debe quedar escrita en el repo.
8. **Confidencialidad** (RNF-03 y RNF-04): un estudiante solo ve lo suyo, y un docente solo ve los cursos donde dicta.

## 2. Máquina de estados de una entrega

```
recibida ──► en_analisis ──► pendiente_revision ──(aprobar)──► enviada
                  │                 │
                  ▼                 └─(descartar)─► sigue en pendiente_revision, origen = docente
           error_analisis ──(reanalizar)──► en_analisis
```

Cómo se mapea al pipeline del mockup: *Entrega recibida* → `recibida`, *Análisis realizado* → `en_analisis` terminado, *Feedback generado* → `pendiente_revision`, *Feedback enviado* → `enviada`.

Tipos de entrega:
- `oficial`: consume uno de los `maxIntentos`.
- `revision`: es el botón "Revisar mi código". No consume intento.

## 3. Endpoints por pantalla del mockup

| Pantalla | Endpoints |
|---|---|
| Login | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| TopBar (campana) | `GET /notificaciones`, `POST /notificaciones/{id}/leida` |
| Tablero docente: tarjetas | `GET /tareas/{id}/resumen` |
| Tablero docente: cola y detalle | `GET /tareas/{id}/entregas` (devuelve todas; la cola es el filtro `estado === "pendiente_revision"` en el frontend), `GET /entregas/{id}`, `GET /entregas/{id}/archivos` |
| Tablero docente: borrador | `GET` y `PATCH /entregas/{id}/retroalimentacion`, `POST …/descartar`, `POST …/aprobar` |
| Panel estudiante: mis entregas | `GET /estudiantes/me/cursos/{cursoId}/tareas` |
| Panel estudiante: subir código | `POST /tareas/{id}/entregas` (`tipo: oficial \| revision`) |
| Panel estudiante: feedback | `GET /entregas/{id}`, `POST /entregas/{id}/retroalimentacion/leida` |
| Panel estudiante: "Tengo una duda" | `POST /entregas/{id}/dudas` |
| Panel estudiante: historial | `GET /tareas/{id}/intentos` |
| Panel estudiante: progreso y "dónde me cuesta" | `GET /estudiantes/me/cursos/{cursoId}/progreso` |
| Reportes | `GET /cursos/{id}/raes`, `GET /cursos/{id}/temas`, `GET /cursos/{id}/reportes/trayectoria` |

Hay endpoints que no tienen pantalla en el mockup pero que exigen los RF:
- Crear y configurar tareas, criterios, rúbrica y casos de prueba (RF-14 y RF-15).
- `calificacion`.
- `auditoria` (RF-20).
- `errores-frecuentes` (RF-21).
- `reanalizar` (RNF-14).
- `dudas/{id}/responder`.

**Falta diseñar esas pantallas.**

## 4. Conflictos que encontré (hay que decidirlos en equipo)

1. **El borrador del mockup revela la solución.** El texto de ejemplo dice *"Ajustar la condición de parada del bucle for a estricta (<)"*, y eso viola RF-08 y RF-09. Además no sigue la estructura de Hattie & Timperley (RF-02): es un título más un párrafo. El mockup tiene que mostrar las tres secciones.
2. **"Revisar mi código" y "Tengo una duda" contra RNF-06.** El diagrama de actividad muestra que en la rama "Revisar" la respuesta le llega directo al estudiante, y RNF-06 (Must) dice que ninguna salida llega sin aprobación del docente. En el contrato elegí cumplir RNF-06: las dos pasan por aprobación. Si quieren respuesta inmediata, tienen que modificar RNF-06 de forma explícita, no saltárselo en el código.
3. **"Nota del docente".** En español "nota" también significa calificación, y eso choca con RF-17. En el contrato el campo se llama `comentarioDocente`. Recomiendo cambiar también la etiqueta en la UI.
4. **La "dificultad percibida" no está en ningún RF.** El eje Y del reporte la necesita. La agregué como `dificultadPercibida` (de 1 a 5, opcional) al crear la entrega. O se agrega un RF, o se quita el eje.
5. **"Alertas de código copiado o generado por IA".** Tampoco está en los RF, y detectarlo de verdad no es confiable. Presentarlo como acusación choca con el enfoque formativo y con RNF-07. En el contrato quedó como `alertaRevision` ("salto sin intentos intermedios, revisar"), sin afirmar copia ni uso de IA.
6. **"Tropiezos" no tiene definición.** Propuse esta: entregas oficiales del tema con al menos una línea marcada como `error`. Hay que validarla.
7. **Los correos del mockup son `@unbosque.edu.co`**, y el proyecto es de la Javeriana.
8. **El rol monitor** (actor secundario) quedó fuera del MVP.

## 5. Parámetros propuestos que falta confirmar

Todos son valores que yo propuse. Ninguno sale de los documentos:
- Tamaño máximo por entrega: 200 KB en total, hasta 10 archivos.
- Lenguajes: `cpp`, `c`, `python` y `java`. El mockup usa C++. Hay que confirmar el lenguaje del curso.
- Umbrales del reporte: 3.0, 3.75, 0.66, 20 % y 40 %. Los copié del código del mockup y el backend los devuelve en `umbrales` para que haya una sola fuente.
- El umbral de RNF-08 (tiempo de revisión del docente) y el de RNF-11 (tiempo entre entrega y retroalimentación) siguen sin número en el análisis. Sin esos números no se pueden verificar.

## 6. Qué se rescata del backend de Marlon

- **Cliente LLM (DeepSeek/Ollama):** sirve para generar el borrador, pero con un prompt nuevo que respete RF-02, RF-03, RF-08 y RF-09, y que devuelva JSON validado contra `SeccionesFeedback`.
- **Pipeline RAG:** sirve para el borrador de respuesta a dudas, cambiando el corpus a syllabus y banco de ejercicios, y quitando la exigencia de GPU.
- **Todo lo demás** (Telegram, conteo de commits, Mongo con `repositories` y `commits`) no corresponde con este contrato.
