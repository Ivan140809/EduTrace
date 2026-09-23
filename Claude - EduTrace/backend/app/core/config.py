"""Configuración global. Valores fijos a propósito: es un MVP sin archivo .env."""

PREFIJO_API = "/api/v1"

# Orígenes del frontend a los que se permite llamar al API (CORS).
# En desarrollo el frontend usa el proxy de Vite, así que esto solo importa si
# el navegador llama al backend directamente.
ORIGENES_CORS = ["http://localhost:5173", "http://127.0.0.1:5173"]

# Duración de la sesión (token opaco, no JWT).
DURACION_SESION_HORAS = 8
DURACION_SESION_LARGA_DIAS = 30  # cuando el usuario marca "Mantener la sesión abierta"

# Tamaño máximo del código entregado (suma de todos los archivos).
MAX_BYTES_ENTREGA = 200 * 1024
