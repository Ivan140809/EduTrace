# EduTrace — Backend MVP (FastAPI)

Implementa los endpoints fundamentales del contrato `contrato/openapi.yaml` (v0.4).
Sin base de datos: los repositorios usan **diccionarios en memoria**, así que los datos se reinician al apagar el servidor.
Sin JWT: la sesión es un **token opaco aleatorio** que el backend guarda en memoria.

## Correr

```bash
cd backend
python -m venv .venv
source .venv/bin/activate.fish          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API: `http://localhost:8000/api/v1/...`
- Documentación interactiva (Swagger): http://localhost:8000/docs
- Con el frontend: `npm run dev` en el frontend. El proxy de Vite reenvía `/api` al puerto 8000.

### Cuentas de prueba (se cargan al arrancar, en `app/semilla.py`)

| Rol | Correo | Contraseña |
|---|---|---|
| Docente | `pperez@javeriana.edu.co` | `docente123` |
| Estudiante | `jperezg@javeriana.edu.co` | `estudiante123` |
| Estudiante | `alopez@javeriana.edu.co` | `estudiante123` |

La semilla también crea un curso, dos tareas y una entrega de Juan pendiente de revisión.

### Probar con Postman

1. Arranca el backend (arriba).
2. En Postman: **Import** → elige `postman/EduTrace.postman_collection.json`.
3. Abre la colección **EduTrace API (MVP)**. Tiene cuatro carpetas que siguen el flujo real:
   1. **Estudiante entrega código**
   2. **Docente revisa y aprueba**
   3. **Estudiante ve la retroalimentación**
   4. **Errores esperados** (403, 422, 401)
4. Para ir paso a paso: abre una petición y pulsa **Send**. Empieza siempre por un **Login**: su script guarda el token en la variable `{{token}}`, y la colección lo envía solo en el header `Authorization: Bearer …` de las demás peticiones.
5. Para correr todo de una vez: clic derecho en la colección → **Run collection** → **Run**. Son 33 peticiones y 51 verificaciones. Se puede repetir sin reiniciar el backend, porque usa entregas de tipo `revision`, que no gastan intentos.

Las variables (`baseUrl`, `token`, `cursoId`, `tareaId`, `entregaId`) se ven y se editan en la pestaña **Variables** de la colección. Los scripts de la pestaña **Scripts → Post-response** de cada petición (en versiones viejas de Postman, pestaña **Tests**) las van llenando.

Desde la terminal, sin abrir Postman: `npx newman run postman/EduTrace.postman_collection.json`.

### Pruebas

```bash
pytest -q
```

Recorren el flujo completo (login → entrega → revisión → aprobación → vista del estudiante), los permisos y los intentos.
**Cada respuesta se valida contra `contrato/openapi.yaml`**: si el backend se desvía del contrato, la prueba falla.

## Estructura (una capa solo habla con la de abajo)

```
app/
├── api/v1/          CONTROLADOR: recibe la petición, llama UN servicio y devuelve su resultado. Sin lógica.
├── services/        SERVICIO: reglas de negocio, permisos, estados, conversión entidad → DTO.
├── repositories/    REPOSITORIO: guardar y buscar. Hoy son diccionarios (base.py). Aquí entra la BD después.
├── schemas/         DTOs Pydantic = los esquemas del contrato (JSON en camelCase).
├── core/            config.py, security.py (hash de contraseñas, token), errores.py (formato de error del contrato).
├── semilla.py       datos de ejemplo
└── main.py          crea la app, CORS, manejadores de error y monta /api/v1
```

Flujo de una petición: `api/v1/entregas.py` → `services/retroalimentacion_service.py` → `repositories/entrega_repository.py`.
Los errores se lanzan en los servicios como `ErrorNegocio`, y `core/errores.py` los convierte al JSON `{ "error": { codigo, mensaje, detalles } }`.

## Endpoints implementados (23 de 35)

| Grupo | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| Cursos | `GET /cursos`, `GET /cursos/{id}` |
| Tareas | `GET` y `POST /cursos/{id}/tareas`, `GET /tareas/{id}`, `GET /tareas/{id}/resumen` |
| Entregas | `GET` y `POST /tareas/{id}/entregas`, `GET /tareas/{id}/intentos`, `GET /entregas/{id}`, `GET /entregas/{id}/archivos` |
| Retroalimentación | `GET` y `PATCH /entregas/{id}/retroalimentacion`, `POST …/descartar`, `POST …/aprobar`, `POST …/leida` |
| Estudiante | `GET /estudiantes/me/cursos/{id}/tareas`, `GET /estudiantes/me/cursos/{id}/progreso` |
| Notificaciones | `GET /notificaciones`, `POST /notificaciones/{id}/leida` |

**Pendientes (12; no son necesarios para el flujo mínimo):**
- `GET /cursos/{id}/estudiantes`, `/raes`, `/temas`.
- `PATCH /tareas/{id}`.
- `POST /entregas/{id}/reanalizar`.
- `PUT /entregas/{id}/calificacion`.
- `GET /entregas/{id}/auditoria`. La auditoría ya se registra; solo falta exponerla.
- Dudas (`/entregas/{id}/dudas`, `/dudas/{id}/responder`).
- Reportes (`trayectoria`, `errores-frecuentes`).

## Qué NO hace todavía (a propósito)

- **No hay IA.** `services/analisis_service.py` genera un borrador genérico con la estructura de Hattie & Timperley, para que el flujo funcione de punta a punta. Para integrar el LLM solo se cambian `_generar_secciones` y `_analizar_codigo`.
- **No compila ni ejecuta casos de prueba** (RF-04). `compilacion` y `lineasMarcadas` salen vacíos.
- **No hay base de datos.** Para agregarla, se reescriben las clases de `repositories/` con la misma interfaz (`guardar`, `obtener`, `listar`, `eliminar`). Los servicios no cambian.
- **No hay JWT.** Para migrar, se cambian `core/security.generar_token` y `services/auth_service.usuario_por_token`.
- **No hay registro de usuarios.** El contrato no tiene ese endpoint. Los usuarios y el curso se crean en `app/semilla.py`.
