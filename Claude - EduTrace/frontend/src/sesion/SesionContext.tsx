import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { leerToken, registrarAlPerderSesion } from '../api/cliente';
import { cerrarSesion, iniciarSesion, obtenerUsuarioActual } from '../api/servicios';
import type { LoginRequest, Usuario } from '../api/tipos';
import type { Role } from '../types';

/**
 * Guarda quién inició sesión y lo comparte con TODA la app, sin pasarlo
 * componente por componente. Cualquier componente puede hacer:
 *
 *   const { usuario, rol, salir } = useSesion();
 */
interface SesionValor {
  usuario: Usuario | null;
  /** Rol en el vocabulario del frontend ('profesor' | 'estudiante'). */
  rol: Role | null;
  /** true mientras se revisa si había un token guardado al abrir la página. */
  verificando: boolean;
  entrar: (datos: LoginRequest) => Promise<void>;
  salir: () => Promise<void>;
}

const SesionContext = createContext<SesionValor | null>(null);

/**
 * El contrato dice 'docente'; el frontend ya usaba 'profesor' en todas partes.
 * Esta es la ÚNICA traducción entre los dos vocabularios.
 */
export function rolDesdeApi(rol: Usuario['rol']): Role {
  return rol === 'docente' ? 'profesor' : 'estudiante';
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    // Si el backend responde 401 en cualquier llamada, volvemos al login.
    registrarAlPerderSesion(() => setUsuario(null));

    // Si había un token guardado (el usuario marcó "Mantener la sesión"), recupera el usuario.
    if (!leerToken()) {
      setVerificando(false);
    } else {
      obtenerUsuarioActual()
        .then(setUsuario)
        .catch(() => setUsuario(null))
        .finally(() => setVerificando(false));
    }
    return () => registrarAlPerderSesion(null);
  }, []);

  const valor: SesionValor = {
    usuario,
    rol: usuario ? rolDesdeApi(usuario.rol) : null,
    verificando,
    entrar: async (datos) => {
      const r = await iniciarSesion(datos); // si falla, lanza ApiError y LoginView lo muestra
      setUsuario(r.usuario);
    },
    salir: async () => {
      await cerrarSesion().catch(() => undefined);
      setUsuario(null);
    },
  };

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): SesionValor {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
  return ctx;
}
