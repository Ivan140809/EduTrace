/**
 * Nombres cortos para los tipos del contrato.
 *
 * `esquema.ts` se GENERA desde contrato/openapi.yaml con `npm run api:tipos`.
 * No lo edites a mano: si el contrato cambia, se regenera y TypeScript te
 * marca en rojo cada parte del frontend que quedó desalineada.
 */
import type { components } from './esquema';

type S = components['schemas'];

// Sesión y usuarios
export type LoginRequest = S['LoginRequest'];
export type LoginResponse = S['LoginResponse'];
export type Usuario = S['Usuario'];
export type UsuarioResumen = S['UsuarioResumen'];
export type RolApi = S['Rol']; // 'docente' | 'estudiante'

// Cursos y syllabus
export type Curso = S['Curso'];
export type Rae = S['Rae'];
export type Tema = S['Tema'];
export type Corte = S['Corte'];

// Tareas
export type Tarea = S['Tarea'];
export type TareaCrear = S['TareaCrear'];
export type ResumenTarea = S['ResumenTarea'];

// Entregas
export type EstadoEntrega = S['EstadoEntrega'];
export type TipoEntrega = S['TipoEntrega'];
export type EntregaCrear = S['EntregaCrear'];
export type EntregaResumen = S['EntregaResumen'];
export type EntregaDocente = S['EntregaDocente'];
export type EntregaEstudiante = S['EntregaEstudiante'];
export type ArchivoCodigo = S['ArchivoCodigo'];
export type ResultadoAnalisis = S['ResultadoAnalisis'];
export type LineaMarcada = S['LineaMarcada'];
export type Intento = S['Intento'];

// Retroalimentación
export type SeccionesFeedback = S['SeccionesFeedback'];
export type Retroalimentacion = S['Retroalimentacion'];
export type RetroalimentacionEditar = S['RetroalimentacionEditar'];
export type RetroalimentacionPublicada = S['RetroalimentacionPublicada'];
export type Calificacion = S['Calificacion'];
export type EventoAuditoria = S['EventoAuditoria'];

// Estudiante
export type TareaEstudiante = S['TareaEstudiante'];
export type ProgresoEstudiante = S['ProgresoEstudiante'];

// Dudas, reportes, notificaciones
export type Duda = S['Duda'];
export type ReporteTrayectoria = S['ReporteTrayectoria'];
export type PuntoTrayectoria = S['PuntoTrayectoria'];
export type ErrorFrecuente = S['ErrorFrecuente'];
export type Notificacion = S['Notificacion'];
export type Pagina = S['Pagina'];

/** Cuerpo de error que devuelve el backend en cualquier 4xx/5xx. */
export type ErrorApi = S['Error'];

/**
 * `GET /entregas/{id}` devuelve una forma distinta según el rol.
 * Esta función le dice a TypeScript cuál de las dos llegó.
 * La vista del docente es la única que trae `analisis`.
 */
export function esEntregaDocente(
  e: EntregaDocente | EntregaEstudiante,
): e is EntregaDocente {
  return 'analisis' in e;
}
