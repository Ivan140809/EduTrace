# Guía del frontend de EduTrace y su conexión con el backend

Esta guía es para alguien que **nunca ha programado en TypeScript ni en React**. Explica cómo está armado el frontend, qué se agregó para hablar con el backend y cómo conectar lo que falta.

---

## 0. Resumen en 30 segundos

- El frontend es una app **React + TypeScript** que se construye con **Vite**.
- **Hoy funciona conectado al backend** (FastAPI):
  - el login;
  - el tablero del docente (revisar, comentar, aprobar y descartar);
  - el panel del estudiante (ver tareas, subir código, ver retroalimentación, marcarla como leída, historial y progreso).
- Todavía usa **datos de demostración**:
  - Reportes (el backend aún no implementa ese endpoint);
  - las secciones "Cursos", "Entregas" y "Estudiantes" del menú (son pantallas sin diseñar).
- Los componentes **nunca** llaman al backend directamente. Todo pasa por `src/api/`.

---

## 1. Cómo arrancarlo

**Requisitos:** Node.js 18 o superior (`node --version`) y el backend de Python.

```bash
# Terminal 1 — backend (carpeta backend/)
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend (esta carpeta)
npm install        # solo la primera vez
npm run dev        # abre http://localhost:5173
```

Cuentas de prueba, creadas por la semilla del backend:

| Rol | Correo | Contraseña |
|---|---|---|
| Docente | `pperez@javeriana.edu.co` | `docente123` |
| Estudiante | `jperezg@javeriana.edu.co` | `estudiante123` |
| Estudiante | `alopez@javeriana.edu.co` | `estudiante123` |

**Sin backend (modo mock):** si el backend no está disponible, se puede trabajar contra un servidor falso que responde según el contrato:

```bash
npm run mock       # terminal 1: servidor falso (Prism) en el puerto 4010, lee contrato/openapi.yaml
npm run dev:mock   # terminal 2: el frontend usando ese servidor falso
```

El mock siempre responde los mismos ejemplos del contrato y no guarda nada. Sirve para maquetar, no para probar el flujo.

**Todos los comandos:**

| Comando | Qué hace |
|---|---|
| `npm run dev` | Frontend en modo desarrollo, conectado al backend (puerto 8000) |
| `npm run dev:mock` | Frontend conectado al mock (puerto 4010) |
| `npm run mock` | Levanta el mock a partir del contrato |
| `npm run typecheck` | Revisa los tipos sin compilar. **Córrelo antes de cada commit.** |
| `npm run build` | Revisa tipos y genera la versión de producción en `dist/` |
| `npm run api:tipos` | Regenera `src/api/esquema.ts` cuando cambia el contrato (sección 9) |

---

## 2. Lo mínimo de React y TypeScript que necesitas

Esto es lo justo para leer el código del proyecto, no un curso completo.

**TypeScript** es JavaScript con tipos. Si una variable es `string`, el editor no te deja usarla como número. Los errores de tipos salen **antes** de ejecutar, en rojo en VS Code y en `npm run typecheck`.

```ts
const nombre: string = 'Juan';
let nota: number | null = null;          // puede ser número o null
interface Curso { id: string; nombre: string; periodo?: string }  // `?` = opcional
```

**Operadores que verás en todas partes:**

| Operador | Significa | Ejemplo |
|---|---|---|
| `a?.b` | "si `a` existe, dame `b`; si no, `undefined`" | `usuario?.nombre` |
| `a ?? b` | "si `a` es null/undefined, usa `b`" | `resumen.datos?.estudiantes ?? '–'` |
| `async` / `await` | esperar una respuesta del servidor sin congelar la página | `const r = await iniciarSesion(datos)` |
| `` `texto ${x}` `` | texto con variables adentro | `` `/entregas/${id}` `` |

**React** arma la página con **componentes**: funciones que devuelven lo que se ve.

```tsx
function Saludo({ nombre }: { nombre: string }) {   // `nombre` es una "prop": dato que entra
  return <h1 className="page-title">Hola, {nombre}</h1>;   // JSX: HTML dentro de TypeScript
}
```

- **Props:** datos que el componente padre le pasa al hijo. `<StudentPanel curso={curso} />` le pasa el curso.
- **Estado (`useState`):** datos que cambian, como lo que el docente escribe. Cuando el estado cambia, React vuelve a dibujar el componente.
  ```tsx
  const [comentario, setComentario] = useState('');   // valor inicial ''
  <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} />
  ```
- **Efectos (`useEffect`):** código que corre *después* de dibujar, por ejemplo pedir datos al backend. En este proyecto casi nunca lo usas directamente: usas `useConsulta` (sección 5).
- En JSX se escribe `className`, no `class`. Los estilos están todos en `src/styles.css`.

---

## 3. Estructura de carpetas

```
react-edutrace/
├── contrato/openapi.yaml        ← copia del contrato API v0.4 (la fuente de verdad)
├── index.html                   ← página base; React se monta en <div id="root">
├── vite.config.ts               ← configuración de Vite + PROXY hacia el backend
├── .env.example                 ← variables de entorno opcionales (copiar como .env.local)
├── package.json                 ← dependencias y comandos npm
├── GUIA_FRONTEND.md             ← este archivo
└── src/
    ├── main.tsx                 ← arranque: monta <App/> dentro de <SesionProvider>
    ├── App.tsx                  ← decide qué pantalla mostrar (login, tablero, panel…)
    ├── styles.css               ← todos los estilos (paleta en :root)
    ├── types.ts                 ← tipos de la UI (Role, NavId, StateTone)
    ├── data.ts                  ← textos fijos del menú y del pipeline
    ├── reportData.ts            ← datos GENERADOS para Reportes (demo)
    ├── icons.tsx                ← íconos SVG
    │
    ├── api/                     ← ★ CAPA DE CONEXIÓN CON EL BACKEND
    │   ├── esquema.ts           ←   tipos GENERADOS desde el contrato (no editar)
    │   ├── tipos.ts             ←   nombres cortos para esos tipos (Usuario, Entrega…)
    │   ├── cliente.ts           ←   el único archivo que usa fetch (token, errores, JSON)
    │   └── servicios.ts         ←   una función por endpoint: iniciarSesion(), aprobarRetroalimentacion()…
    ├── hooks/useConsulta.ts     ← ★ carga datos con estados cargando / error / datos
    ├── sesion/SesionContext.tsx ← ★ quién inició sesión, compartido con toda la app
    ├── utilidades/fechas.ts     ← formatear fechas ("hace 3 h")
    │
    └── components/              ← PANTALLAS Y PIEZAS VISUALES
        ├── LoginView.tsx          conectado ✔
        ├── ProfessorDashboard.tsx conectado ✔
        ├── StudentPanel.tsx       conectado ✔
        ├── BorradorEditable.tsx   formulario donde el docente edita las 3 secciones y las pistas
        ├── FeedbackDraft.tsx      muestra (solo lectura) las 3 secciones de Hattie & Timperley
        ├── TopBar.tsx, Sidebar.tsx, StatePill.tsx, Placeholder.tsx
        ├── ReportsView.tsx        demo (falta backend)
        └── TrajectoryChart.tsx    gráfico de reportes
```

Los archivos marcados con ★ son los que se agregaron para conectar con el backend.

> `preview.html` (en la raíz) es el mockup viejo compilado en el navegador. **Quedó desactualizado:** no tiene la conexión. Usa `npm run dev`.

---

## 4. Cómo viaja una petición

Ejemplo: el docente pulsa **"Aprobar y enviar al estudiante"**.

```
ProfessorDashboard.tsx        onClick → aprobar()
        │  llama
        ▼
api/servicios.ts              aprobarRetroalimentacion(entregaId)
        │  arma método + ruta
        ▼
api/cliente.ts                peticion('POST', '/entregas/{id}/retroalimentacion/aprobar')
        │  agrega  Authorization: Bearer <token>,  JSON,  /api/v1
        ▼
navegador → http://localhost:5173/api/v1/entregas/…/aprobar
        │  el PROXY de Vite (vite.config.ts) lo reenvía
        ▼
backend FastAPI  http://localhost:8000/api/v1/entregas/…/aprobar
        │  responde 200 + JSON   (o 4xx + { error: { codigo, mensaje } })
        ▼
cliente.ts: si es error lanza ApiError(mensaje)  →  el componente lo muestra en rojo
            si es éxito devuelve el JSON tipado   →  el componente recarga y se actualiza
```

**¿Por qué un proxy?** El navegador bloquea las peticiones de una página (puerto 5173) a otro servidor (puerto 8000), a menos que ese servidor lo autorice. Eso se llama **CORS**. Con el proxy, el navegador cree que todo viene del 5173 y el problema desaparece en desarrollo. En producción, el backend ya permite `localhost:5173` en `core/config.py` (`ORIGENES_CORS`); para otro dominio hay que agregarlo ahí.

---

## 5. La capa de conexión, archivo por archivo

### `api/cliente.ts` — el único `fetch`
- `peticion<T>(metodo, ruta, cuerpo?)` hace la llamada y devuelve el JSON como tipo `T`.
- Pone el token en el header `Authorization`.
- Si la respuesta es error, lanza `ApiError` con `status` (401, 403, 409…), `codigo` (`'INTENTOS_AGOTADOS'`…) y `message` (texto del backend, listo para mostrar).
- Si el backend está apagado, lanza `ApiError` con status `0` y el mensaje "No se pudo conectar con el servidor".
- Si recibe **401** en cualquier petición, borra el token y vuelve al login.
- El token se guarda en `localStorage` si se marca "Mantener la sesión", o en `sessionStorage` si no.

### `api/servicios.ts` — una función por endpoint
Están los 35 endpoints del contrato v0.4, agrupados como en el contrato. El backend MVP implementa 23; los otros 12 responden 404 hasta que se implementen (sección 8).

```ts
await aprobarRetroalimentacion(entregaId);                    // POST …/aprobar
const tareas = await listarMisTareas(curso.id);               // GET  /estudiantes/me/cursos/{id}/tareas
await crearEntrega(tareaId, { tipo: 'oficial', archivos });   // POST /tareas/{id}/entregas
```

### `api/esquema.ts` y `api/tipos.ts` — los tipos salen del contrato
`esquema.ts` **se genera** con `npm run api:tipos` a partir de `contrato/openapi.yaml`. No se escribe a mano. `tipos.ts` solo le pone nombres cortos (`Usuario`, `EntregaDocente`, `SeccionesFeedback`…).

La ventaja: si el contrato dice que un campo es opcional, TypeScript **te obliga** a manejar el caso en que no llega. Pasó de verdad al conectar el panel: `intentosUsados` es opcional en el contrato y el compilador no dejó usarlo sin un valor por defecto.

### `hooks/useConsulta.ts` — cargar datos
```tsx
const { datos, cargando, error, recargar } = useConsulta(() => obtenerResumenTarea(tarea.id), [tarea.id]);
```
- Pide los datos al mostrar el componente y cada vez que cambia algo del segundo argumento (`[tarea.id]`).
- `recargar()` los vuelve a pedir. Se usa después de aprobar, subir código, etc.
- Si en vez de la función pasas `null`, no pide nada. Sirve cuando todavía falta un dato, por ejemplo `entregaId ? () => obtenerEntrega(entregaId) : null`.

### `sesion/SesionContext.tsx` — quién inició sesión
```tsx
const { usuario, rol, entrar, salir } = useSesion();
```
- `entrar({ correo, contrasena, mantenerSesion })` hace el login.
- Al abrir la página, si había token guardado, recupera el usuario con `GET /auth/me`.
- **Traducción de roles:** el contrato dice `'docente'` y el frontend ya usaba `'profesor'`. La traducción está en un solo lugar: `rolDesdeApi()`.

### `vite.config.ts` y `.env`
- El proxy manda `/api` a `http://localhost:8000`. Si el backend corre en otro puerto, crea `.env.local` con `VITE_BACKEND_URL=http://localhost:9000`.
- `VITE_API_URL` solo se usa en producción, si el backend está en otro dominio.

---

## 6. Qué cambió en cada componente

| Archivo | Antes (mockup) | Ahora |
|---|---|---|
| `main.tsx` | montaba `<App/>` | envuelve `<App/>` en `<SesionProvider>` |
| `App.tsx` | guardaba el rol con `useState`; datos de `data.ts` | usa `useSesion()`; pide cursos y notificaciones; pasa el `curso` a cada panel |
| `LoginView.tsx` | elegía rol sin validar | `POST /auth/login`; muestra "Correo o contraseña incorrectos"; el rol lo decide el backend |
| `ProfessorDashboard.tsx` | código C++ fijo y botón que solo cambiaba un booleano | pide tareas → resumen → cola → entrega; marca las líneas señaladas; **el borrador es editable** (`BorradorEditable`); "Guardar borrador", "Descartar" (con confirmación) y "Aprobar" (guarda y luego publica); botón "Siguiente entrega" |
| `StudentPanel.tsx` | tareas e intentos fijos | pide tareas, progreso e historial; sube archivos (oficial y revisión previa); muestra la retroalimentación publicada con el aviso de IA; "Marcar como leída" |
| `FeedbackDraft.tsx` | texto fijo | recibe `secciones` y las muestra con "¿Qué sigue?" primero (RF-03) |
| `ReportsView.tsx` | datos generados | igual, pero con aviso visible de "datos de demostración" |
| `Sidebar.tsx` | **no compilaba** (`npm run build` fallaba por el tipo de los íconos) | corregido |
| `data.ts`, `types.ts` | datos falsos de todo | solo quedan los textos del menú y el pipeline |

---

## 7. Receta: conectar una pantalla nueva

Ejemplo real: la sección **"Estudiantes"** del menú del docente hoy muestra un `Placeholder`. Conectarla toma tres pasos.

**Paso 1: busca el endpoint en el contrato y su función en `servicios.ts`.**
`GET /cursos/{cursoId}/estudiantes` → `listarEstudiantesCurso(cursoId)`.

**Paso 2: crea el componente** `src/components/EstudiantesView.tsx`. Este código se verificó con el compilador:

```tsx
import { listarEstudiantesCurso } from '../api/servicios';
import type { Curso } from '../api/tipos';
import { useConsulta } from '../hooks/useConsulta';

export default function EstudiantesView({ curso }: { curso: Curso }) {
  const estudiantes = useConsulta(() => listarEstudiantesCurso(curso.id), [curso.id]);

  if (estudiantes.cargando) return <p className="aviso">Cargando estudiantes…</p>;
  if (estudiantes.error) return <p className="aviso aviso-error">{estudiantes.error.message}</p>;

  return (
    <div className="page">
      <h1 className="page-title">Estudiantes de {curso.nombre}</h1>
      <section className="panel">
        {estudiantes.datos?.items.map((e) => (
          <div className="task" key={e.id}>
            <div className="task-grow">
              <div className="task-title">{e.nombre}</div>
              <div className="task-meta">{e.correo}</div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
```

**Paso 3: muéstralo desde `App.tsx`.** En la cadena de condiciones del `return`, antes del `Placeholder` genérico:

```tsx
) : nav === 'estudiantes' && !isStudent && curso ? (
  <EstudiantesView curso={curso} />
) : nav !== 'dashboard' ? (
```

⚠️ Este endpoint **todavía no existe en el backend MVP**: la pantalla mostrará el error 404 en rojo hasta que alguien lo implemente. El frontend queda listo de antemano.

**El patrón para cualquier acción** (un botón que modifica algo) es el mismo de `ProfessorDashboard.aprobar`:

```tsx
const [error, setError] = useState<string | null>(null);
async function alPulsar() {
  try {
    await algunaFuncionDeServicios(...);
    datos.recargar();                    // refresca lo que se ve
  } catch (e) {
    setError(e instanceof ApiError ? e.message : 'Algo salió mal.');
  }
}
```

---

## 8. Qué falta y dónde va

| Qué | Frontend | Endpoint | ¿Backend lo tiene? |
|---|---|---|---|
| Reportes de trayectoria | `ReportsView.tsx`: reemplazar `buildPoints()` y `friccionHistorica()` por `obtenerTrayectoria()`, y `RAES`/`TEMAS` por `listarRaes()`/`listarTemas()`. La función `analyze()` se puede conservar. | `/cursos/{id}/reportes/trayectoria`, `/raes`, `/temas` | ❌ |
| "Tengo una duda" | `StudentPanel.tsx` (botón deshabilitado) → `enviarDuda()`; el docente responde con `responderDuda()` | `/entregas/{id}/dudas`, `/dudas/{id}/responder` | ❌ |
| Poner nota sumativa | pantalla nueva del docente → `registrarCalificacion()` | `PUT /entregas/{id}/calificacion` | ❌ |
| Reintentar análisis fallido | botón en `ProfessorDashboard` cuando `estado === 'error_analisis'` → `reanalizarEntrega()` | `POST /entregas/{id}/reanalizar` | ❌ |
| Crear tareas | formulario nuevo del docente → `crearTarea()` | `POST /cursos/{id}/tareas` | ✅ |
| Elegir curso o tarea | hoy se usa el **primer curso** (`App.tsx`) y la **primera tarea abierta** (`ProfessorDashboard.tsx`); falta un selector | `GET /cursos`, `GET /cursos/{id}/tareas` | ✅ |
| Lista de estudiantes | sección 7 de esta guía | `GET /cursos/{id}/estudiantes` | ❌ |
| Errores frecuentes (RF-21) | pantalla nueva | `/cursos/{id}/reportes/errores-frecuentes` | ❌ |

---

## 9. Cuando cambie el contrato

1. Copia el nuevo `openapi.yaml` a `contrato/openapi.yaml`.
2. `npm run api:tipos`: regenera `src/api/esquema.ts`.
3. `npm run typecheck`: **cada error en rojo es un lugar del frontend que quedó desalineado con el contrato.** Corrígelos uno por uno.
4. Si cambió una ruta, ajusta la función en `servicios.ts`. Es el único lugar donde hay rutas escritas.

---

## 10. Cómo depurar

**Tu mejor herramienta:** en el navegador, `F12` → pestaña **Network** → filtra por `api`. Ahí ves cada petición, qué se envió, qué respondió el backend y con qué código. La pestaña **Console** muestra los errores de JavaScript.

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| "No se pudo conectar con el servidor" | Backend apagado o en otro puerto | Arranca uvicorn en el 8000 o ajusta `VITE_BACKEND_URL` |
| 404 en una petición | El backend no implementa ese endpoint, o la ruta está mal | Revisa la tabla de la sección 8 y compara con `/docs` del backend |
| Vuelve al login solo | El backend respondió 401: token vencido, o el backend se reinició y perdió las sesiones (están en memoria) | Inicia sesión de nuevo |
| 403 | Ese rol no puede hacer eso (p. ej. estudiante aprobando) | Es correcto; revisa con qué cuenta entraste |
| 409 | Estado no válido: aprobar algo ya enviado, intentos agotados | El mensaje del backend dice cuál |
| 422 | El cuerpo enviado no cumple el contrato | En Network → Response, `error.detalles` dice qué campo falló |
| Error de CORS en consola | Llamaste al backend directo (sin proxy) desde un origen no permitido | Usa `npm run dev`, o agrega el origen a `ORIGENES_CORS` en el backend |
| Página en blanco | Error de JavaScript | Revisa la pestaña Console |
| Cada petición sale dos veces | `StrictMode` de React en desarrollo | Es normal; en producción no pasa |

---

## 11. Límites conocidos y decisiones

- **Los datos del backend viven en memoria:** al reiniciarlo se pierde todo lo creado y las sesiones se invalidan.
- **El token se guarda en el navegador** (`localStorage`/`sessionStorage`). Cualquier script de la página puede leerlo. Para el MVP es aceptable; lo más seguro sería una cookie `httpOnly` puesta por el backend.
- **No hay rutas en la URL:** la app no usa un router, así que no se puede compartir un enlace a "la entrega X". Si más adelante se necesita, se agrega `react-router`.
- **El borrador de retroalimentación todavía no lo genera una IA:** el backend devuelve un texto genérico con las tres secciones. El frontend no cambia cuando se conecte la IA.
- **La cola del docente** se atiende por orden de llegada, primero la más antigua.
- **El panel del estudiante** muestra la retroalimentación publicada más reciente, sea de una entrega oficial o de una revisión previa, y aparte avisa si hay una entrega más nueva en revisión.
