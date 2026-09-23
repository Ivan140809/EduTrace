/**
 * Una función por endpoint del contrato (openapi.yaml v0.4).
 *
 * Los componentes importan desde aquí, por ejemplo:
 *   import { aprobarRetroalimentacion } from '../api/servicios';
 *   await aprobarRetroalimentacion(entregaId);
 *
 * Todas devuelven una Promise: hay que usar `await` (o `.then`).
 * Si el backend responde con error, lanzan `ApiError` (ver cliente.ts).
 */
import { borrarToken, guardarToken, peticion } from './cliente';
import type {
  ArchivoCodigo,
  Calificacion,
  Corte,
  Curso,
  Duda,
  EntregaCrear,
  EntregaDocente,
  EntregaEstudiante,
  EntregaResumen,
  ErrorFrecuente,
  EventoAuditoria,
  Intento,
  LoginRequest,
  LoginResponse,
  Notificacion,
  Pagina,
  ProgresoEstudiante,
  Rae,
  ReporteTrayectoria,
  ResumenTarea,
  Retroalimentacion,
  RetroalimentacionEditar,
  Tarea,
  TareaCrear,
  TareaEstudiante,
  Tema,
  UsuarioResumen,
  Usuario,
} from './tipos';

/** Evita que un ID con caracteres raros rompa la URL. */
const id = (valor: string) => encodeURIComponent(valor);

/** Arma "?a=1&b=2" ignorando los valores vacíos. */
function query(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ───────────────────────── AUTH ─────────────────────────
/** POST /auth/login. Guarda el token y devuelve el usuario. */
export async function iniciarSesion(datos: LoginRequest): Promise<LoginResponse> {
  const r = await peticion<LoginResponse>('POST', '/auth/login', datos);
  guardarToken(r.token, datos.mantenerSesion ?? false);
  return r;
}
/** GET /auth/me */
export const obtenerUsuarioActual = () => peticion<Usuario>('GET', '/auth/me');
/** POST /auth/logout. Borra el token aunque el backend falle. */
export async function cerrarSesion(): Promise<void> {
  try {
    await peticion<void>('POST', '/auth/logout');
  } finally {
    borrarToken();
  }
}

// ───────────────────────── CURSOS ─────────────────────────
export const listarCursos = () => peticion<Curso[]>('GET', '/cursos');
export const obtenerCurso = (cursoId: string) => peticion<Curso>('GET', `/cursos/${id(cursoId)}`);
export const listarEstudiantesCurso = (cursoId: string, page = 1, size = 50) =>
  // Omit quita el `items: unknown[]` genérico de Pagina para reemplazarlo por el tipo concreto.
  peticion<Omit<Pagina, 'items'> & { items: UsuarioResumen[] }>(
    'GET',
    `/cursos/${id(cursoId)}/estudiantes${query({ page, size })}`,
  );
export const listarRaes = (cursoId: string) => peticion<Rae[]>('GET', `/cursos/${id(cursoId)}/raes`);
export const listarTemas = (cursoId: string) => peticion<Tema[]>('GET', `/cursos/${id(cursoId)}/temas`);

// ───────────────────────── TAREAS ─────────────────────────
export const listarTareas = (cursoId: string) => peticion<Tarea[]>('GET', `/cursos/${id(cursoId)}/tareas`);
export const crearTarea = (cursoId: string, datos: TareaCrear) =>
  peticion<Tarea>('POST', `/cursos/${id(cursoId)}/tareas`, datos);
export const obtenerTarea = (tareaId: string) => peticion<Tarea>('GET', `/tareas/${id(tareaId)}`);
export const editarTarea = (tareaId: string, datos: TareaCrear) =>
  peticion<Tarea>('PATCH', `/tareas/${id(tareaId)}`, datos);
export const obtenerResumenTarea = (tareaId: string) =>
  peticion<ResumenTarea>('GET', `/tareas/${id(tareaId)}/resumen`);

// ───────────────────────── ENTREGAS ─────────────────────────
/** Todas las entregas de la tarea. La cola "por revisar" se filtra en el componente. */
export const listarEntregasTarea = (tareaId: string) =>
  peticion<EntregaResumen[]>('GET', `/tareas/${id(tareaId)}/entregas`);
/** El backend responde 202: la entrega queda en 'recibida' y el análisis corre aparte. */
export const crearEntrega = (tareaId: string, datos: EntregaCrear) =>
  peticion<EntregaEstudiante>('POST', `/tareas/${id(tareaId)}/entregas`, datos);
/** El estudiante no envía estudianteId (ve los suyos); el docente sí. */
export const listarIntentos = (tareaId: string, estudianteId?: string) =>
  peticion<Intento[]>('GET', `/tareas/${id(tareaId)}/intentos${query({ estudianteId })}`);
/** La forma cambia según el rol: usa `esEntregaDocente()` de tipos.ts para distinguirla. */
export const obtenerEntrega = (entregaId: string) =>
  peticion<EntregaDocente | EntregaEstudiante>('GET', `/entregas/${id(entregaId)}`);
export const obtenerArchivosEntrega = (entregaId: string) =>
  peticion<ArchivoCodigo[]>('GET', `/entregas/${id(entregaId)}/archivos`);
export const reanalizarEntrega = (entregaId: string) =>
  peticion<EntregaDocente>('POST', `/entregas/${id(entregaId)}/reanalizar`);

// ───────────────────────── RETROALIMENTACIÓN ─────────────────────────
export const obtenerRetroalimentacion = (entregaId: string) =>
  peticion<Retroalimentacion>('GET', `/entregas/${id(entregaId)}/retroalimentacion`);
export const editarRetroalimentacion = (entregaId: string, cambios: RetroalimentacionEditar) =>
  peticion<Retroalimentacion>('PATCH', `/entregas/${id(entregaId)}/retroalimentacion`, cambios);
export const descartarRetroalimentacion = (entregaId: string, motivo?: string) =>
  peticion<Retroalimentacion>('POST', `/entregas/${id(entregaId)}/retroalimentacion/descartar`, { motivo });
export const aprobarRetroalimentacion = (entregaId: string) =>
  peticion<EntregaDocente>('POST', `/entregas/${id(entregaId)}/retroalimentacion/aprobar`);
export const registrarCalificacion = (entregaId: string, nota: number) =>
  peticion<Calificacion>('PUT', `/entregas/${id(entregaId)}/calificacion`, { nota });
export const obtenerAuditoria = (entregaId: string) =>
  peticion<EventoAuditoria[]>('GET', `/entregas/${id(entregaId)}/auditoria`);

// ───────────────────────── ESTUDIANTE ─────────────────────────
export const listarMisTareas = (cursoId: string) =>
  peticion<TareaEstudiante[]>('GET', `/estudiantes/me/cursos/${id(cursoId)}/tareas`);
export const obtenerMiProgreso = (cursoId: string) =>
  peticion<ProgresoEstudiante>('GET', `/estudiantes/me/cursos/${id(cursoId)}/progreso`);
export const marcarRetroalimentacionLeida = (entregaId: string) =>
  peticion<void>('POST', `/entregas/${id(entregaId)}/retroalimentacion/leida`);

// ───────────────────────── DUDAS ─────────────────────────
export const listarDudas = (entregaId: string) => peticion<Duda[]>('GET', `/entregas/${id(entregaId)}/dudas`);
export const enviarDuda = (entregaId: string, pregunta: string) =>
  peticion<Duda>('POST', `/entregas/${id(entregaId)}/dudas`, { pregunta });
export const responderDuda = (dudaId: string, respuesta: string) =>
  peticion<Duda>('POST', `/dudas/${id(dudaId)}/responder`, { respuesta });

// ───────────────────────── REPORTES ─────────────────────────
export const obtenerTrayectoria = (
  cursoId: string,
  dimension: 'rae' | 'tema',
  itemId: string,
  corte: Corte,
) =>
  peticion<ReporteTrayectoria>(
    'GET',
    `/cursos/${id(cursoId)}/reportes/trayectoria${query({ dimension, itemId, corte })}`,
  );
export const obtenerErroresFrecuentes = (cursoId: string, tareaId?: string, limite?: number) =>
  peticion<ErrorFrecuente[]>(
    'GET',
    `/cursos/${id(cursoId)}/reportes/errores-frecuentes${query({ tareaId, limite })}`,
  );

// ───────────────────────── NOTIFICACIONES ─────────────────────────
export const listarNotificaciones = (soloNoLeidas = false) =>
  peticion<{ noLeidas: number; items: Notificacion[] }>(
    'GET',
    `/notificaciones${query({ noLeidas: soloNoLeidas || undefined })}`,
  );
export const marcarNotificacionLeida = (notificacionId: string) =>
  peticion<void>('POST', `/notificaciones/${id(notificacionId)}/leida`);
