import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/cliente';

/**
 * Carga datos del backend cuando el componente aparece (o cuando cambian `deps`).
 *
 * Uso:
 *   const { datos, cargando, error, recargar } =
 *     useConsulta(() => obtenerResumenTarea(tareaId), [tareaId]);
 *
 *   if (cargando) return <p>Cargando…</p>;
 *   if (error)    return <p>{error.message}</p>;
 *   // aquí `datos` ya tiene la respuesta tipada
 *
 * `recargar()` vuelve a pedir los datos (p. ej. después de aprobar una retroalimentación).
 * Pasa `null` como función para no cargar nada todavía (p. ej. si aún no hay entregaId).
 */
export function useConsulta<T>(fn: (() => Promise<T>) | null, deps: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState<boolean>(fn !== null);
  const [error, setError] = useState<ApiError | null>(null);
  const [version, setVersion] = useState(0);

  // `ejecutar` solo cambia cuando cambian `deps` (así no se repite la petición en cada render).
  const ejecutar = useCallback(fn ?? (() => Promise.resolve(null as T)), deps);

  useEffect(() => {
    if (fn === null) {
      setDatos(null); // sin consulta no hay datos (evita mostrar los de una consulta anterior)
      setCargando(false);
      return;
    }
    let vigente = true; // evita actualizar el estado si el componente ya se desmontó
    setCargando(true);
    setError(null);
    ejecutar()
      .then((r) => vigente && setDatos(r))
      .catch((e: unknown) => {
        if (!vigente) return;
        setError(e instanceof ApiError ? e : new ApiError(0, 'DESCONOCIDO', String(e)));
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [ejecutar, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  return { datos, cargando, error, recargar, setDatos };
}
