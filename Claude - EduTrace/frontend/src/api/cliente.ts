/**
 * Cliente HTTP: el ÚNICO archivo del frontend que llama a `fetch`.
 *
 * Se encarga de:
 *  - armar la URL completa (`/api/v1` + ruta),
 *  - poner el token en el header `Authorization`,
 *  - convertir el cuerpo a JSON (ida y vuelta),
 *  - convertir cualquier respuesta 4xx/5xx en un `ApiError` con el mensaje del backend.
 *
 * Los componentes NUNCA llaman a fetch directamente: usan las funciones de `servicios.ts`.
 */
import type { ErrorApi } from './tipos';

/**
 * En desarrollo vale '/api/v1' y Vite reenvía esas peticiones al backend
 * (ver `server.proxy` en vite.config.ts). En producción se puede poner la URL
 * completa del backend en la variable VITE_API_URL del archivo .env.
 */
const BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api/v1';

const CLAVE_TOKEN = 'edutrace.token';

/** Error que lanzan todas las llamadas cuando el backend responde con error. */
export class ApiError extends Error {
  /** Código HTTP (401, 403, 404, 409, 422, 500…). 0 = no hubo respuesta (red caída, backend apagado). */
  readonly status: number;
  /** Código del contrato: 'ESTADO_INVALIDO', 'INTENTOS_AGOTADOS', 'VALIDACION'… */
  readonly codigo: string;
  readonly detalles: NonNullable<ErrorApi['error']['detalles']>;

  constructor(status: number, codigo: string, mensaje: string, detalles: ApiError['detalles'] = []) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

// ───────────────────────── token ─────────────────────────
// "Mantener la sesión abierta" → localStorage (sobrevive a cerrar el navegador).
// Si no → sessionStorage (se borra al cerrar la pestaña).
// Nota de seguridad: un token en storage es legible por cualquier script de la página.
// Para el MVP es aceptable; la alternativa más segura es una cookie httpOnly puesta por el backend.

export function guardarToken(token: string, mantenerSesion: boolean): void {
  borrarToken();
  (mantenerSesion ? localStorage : sessionStorage).setItem(CLAVE_TOKEN, token);
}

export function leerToken(): string | null {
  return sessionStorage.getItem(CLAVE_TOKEN) ?? localStorage.getItem(CLAVE_TOKEN);
}

export function borrarToken(): void {
  sessionStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_TOKEN);
}

/** Lo registra SesionProvider: si el backend responde 401, se cierra la sesión en la UI. */
let alPerderSesion: (() => void) | null = null;
export function registrarAlPerderSesion(fn: (() => void) | null): void {
  alPerderSesion = fn;
}

// ───────────────────────── petición genérica ─────────────────────────
type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Hace la petición y devuelve el JSON ya tipado.
 * @param metodo  GET, POST, PUT, PATCH o DELETE
 * @param ruta    ruta del contrato con los IDs ya puestos, p. ej. `/entregas/${id}`
 * @param cuerpo  objeto que se envía como JSON (no se usa en GET/DELETE)
 */
export async function peticion<T>(metodo: Metodo, ruta: string, cuerpo?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = leerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';

  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE_URL}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    // fetch solo lanza si NO hubo respuesta: backend apagado, sin internet, CORS mal configurado.
    throw new ApiError(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor. ¿Está encendido el backend?');
  }

  if (respuesta.status === 204) return undefined as T; // "No Content": éxito sin cuerpo

  const texto = await respuesta.text();
  const datos: unknown = texto ? JSON.parse(texto) : undefined;

  if (!respuesta.ok) {
    if (respuesta.status === 401 && ruta !== '/auth/login') {
      borrarToken();
      alPerderSesion?.();
    }
    const err = (datos as ErrorApi | undefined)?.error;
    throw new ApiError(
      respuesta.status,
      err?.codigo ?? `HTTP_${respuesta.status}`,
      err?.mensaje ?? `El servidor respondió con error ${respuesta.status}.`,
      err?.detalles ?? [],
    );
  }

  return datos as T;
}
