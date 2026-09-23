import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Lee .env, .env.local, .env.[modo]… (solo las variables que empiezan por VITE_).
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  // `npm run dev:mock` arranca Vite en modo "mock": habla con el servidor falso (Prism, puerto 4010),
  // que sirve las rutas del contrato SIN el prefijo /api/v1.
  const esMock = mode === 'mock';

  return {
    plugins: [react()],
    base: './',
    server: {
      // En desarrollo, todo lo que empiece por /api se reenvía al backend (o al mock).
      // Para el navegador, front y back están en el mismo origen: no hay problemas de CORS.
      proxy: {
        '/api': {
          target: esMock ? 'http://localhost:4010' : env.VITE_BACKEND_URL || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: esMock ? (ruta) => ruta.replace(/^\/api\/v1/, '') : undefined,
        },
      },
    },
  };
});
