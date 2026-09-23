# EduTrace — Mockups (React + TypeScript + CSS)

Versión en React del prototipo de EduTrace: tablero del docente y panel del estudiante,
con navegación entre roles y el flujo de aprobación de retroalimentación.

Basado en el mockup de Figma "Mock up EduTrace" (vista profesor), con la misma
paleta, tipografia Archivo / Roboto Mono y radios de 6 / 8 / 10 px.

## Ver sin instalar nada

Abre `preview.html` en el navegador: compila los mismos archivos de `src/` al vuelo.
Es solo para revisar el diseno — se regenera desde `src/`, no lo edites a mano.

## Correr en local

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite (por defecto http://localhost:5173).

Para generar la versión estática:

```bash
npm run build      # queda en dist/
npm run preview
```

## Estructura

```
index.html                  fuentes (Archivo, JetBrains Mono) y punto de montaje
public/logo-edutrace.png    logo sin letras
src/main.tsx                bootstrap de React
src/App.tsx                 estado del prototipo (rol, sección, aprobación)
src/types.ts                tipos: Role, NavId, Tarea, Intento, ChipTone…
src/data.ts                 contenido del mockup (curso, código C++, tareas, intentos)
src/icons.tsx               iconos SVG como componentes
src/components/StatePill.tsx  etiquetas de estado
src/styles.css              paleta en variables CSS + todas las clases
src/components/
  Sidebar.tsx               navegación y cambio de vista Profesor/Estudiante
  TopBar.tsx                migas, notificaciones, usuario
  ProfessorDashboard.tsx    métricas, entrega, código C++, borrador y aprobación
  StudentPanel.tsx          retroalimentación recibida, tareas, historial, progreso
  FeedbackDraft.tsx         el texto de retroalimentación (compartido por ambas vistas)
  Placeholder.tsx           secciones fuera del alcance de la entrega
```

## Paleta

Definida una sola vez en `:root` dentro de `src/styles.css`:

| Variable | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#FAFAF7` | fondo principal |
| `--bg-2` | `#F2F0E9` | fondo secundario |
| `--bg-3` | `#E5E2D8` | fondo terciario, bordes |
| `--primary` | `#FF6B00` | botones primarios, estado activo |
| `--secondary` | `#343A40` | botones oscuros, pasos completados |
| `--tertiary` | `#FFE8D6` | fondos de énfasis |
| `--alert` | `#E63946` | alertas |
| `--text` | `#1C2024` | texto principal |
| `--muted` | `#6B7265` | texto terciario |

## Conexión con el backend

La app ya está conectada al backend (FastAPI). Antes de tocar código lee **[GUIA_FRONTEND.md](GUIA_FRONTEND.md)**: explica la estructura, la capa `src/api/`, cómo correr todo, cómo conectar pantallas nuevas y cómo depurar.

```bash
npm install
npm run dev        # con el backend corriendo en el puerto 8000
```

`preview.html` es el mockup original sin conexión; quedó desactualizado.
