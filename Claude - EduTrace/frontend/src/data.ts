import type { NavId, Role } from './types';

/** Solo lo usa ReportsView mientras los reportes sigan con datos de demostración. */
export const COURSE = 'Introducción a la Programación (demo)';

export const NAV_LABELS: Record<Role, Partial<Record<NavId, string>>> = {
  profesor: {
    dashboard: 'Dashboard',
    cursos: 'Cursos',
    tareas: 'Entregas',
    estudiantes: 'Estudiantes',
    reportes: 'Reportes',
  },
  estudiante: {
    dashboard: 'Dashboard',
    cursos: 'Mis cursos',
    tareas: 'Mis entregas',
    reportes: 'Mi progreso',
  },
};

export const CRUMBS: Record<Role, Record<NavId, string>> = {
  profesor: {
    dashboard: 'Docente · Tablero de seguimiento',
    cursos: 'Cursos',
    tareas: 'Entregas',
    estudiantes: 'Estudiantes',
    reportes: 'Reportes · Trayectoria y desempeño por RAE',
    perfil: 'Mi perfil',
  },
  estudiante: {
    dashboard: 'Estudiante · Mi panel',
    cursos: 'Mis cursos',
    tareas: 'Mis entregas',
    estudiantes: 'Estudiantes',
    reportes: 'Mi progreso',
    perfil: 'Mi perfil',
  },
};

export const PIPELINE = [
  'Entrega recibida',
  'Analisis realizado',
  'Feedback generado',
  'Feedback enviado',
];
