/// <reference types="vite/client" />

// Variables de entorno que usa el frontend (se definen en .env / .env.local).
interface ImportMetaEnv {
  /** URL base del API. En desarrollo déjala vacía: se usa '/api/v1' y el proxy de Vite. */
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
