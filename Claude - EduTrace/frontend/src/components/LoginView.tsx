import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/cliente';
import { useSesion } from '../sesion/SesionContext';

// ANTES: LoginView recibía `onLogin(role)` y no validaba nada.
// AHORA: llama al backend (POST /auth/login). El rol lo decide el backend según la cuenta.

/** Solo para rellenar el correo rápido en la demo. Bórralo cuando haya usuarios reales. */
const CUENTAS_DEMO = [
  { label: 'Docente', correo: 'pperez@javeriana.edu.co', nombre: 'Cuenta docente de prueba' },
  { label: 'Estudiante', correo: 'jperezg@javeriana.edu.co', nombre: 'Cuenta estudiante de prueba' },
];

export default function LoginView() {
  const { entrar } = useSesion();
  const [correo, setCorreo] = useState(CUENTAS_DEMO[0].correo);
  const [clave, setClave] = useState('');
  const [mantenerSesion, setMantenerSesion] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault(); // evita que el navegador recargue la página
    setEnviando(true);
    setError(null);
    try {
      await entrar({ correo, contrasena: clave, mantenerSesion });
      // Si sale bien, SesionProvider guarda el usuario y App muestra el tablero solo.
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Correo o contraseña incorrectos.'
          : err instanceof Error
            ? err.message
            : 'No se pudo iniciar sesión.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <section className="login-aside">
        <div className="login-brand">
          <img src="./logo-edutrace.png" alt="EduTrace" />
          <div>
            <div className="login-name">
              EDU<span>-TRACE</span>
            </div>
            <div className="login-tag">Acompañamiento formativo</div>
          </div>
        </div>

        <div className="login-pitch">
          <h1>
            Retroalimentación formativa en cursos introductorios de programación, con el docente
            como decisor.
          </h1>
          <p>
            EduTrace analiza cada entrega y redacta un borrador de retroalimentación. El profesor lo
            revisa, lo ajusta y decide qué se envía. Nada se publica sin su aprobación.
          </p>
        </div>

        <ol className="login-flow">
          <li>
            <span>1</span>El estudiante entrega su código
          </li>
          <li>
            <span>2</span>EduTrace analiza y redacta el borrador
          </li>
          <li>
            <span>3</span>El docente revisa y aprueba
          </li>
          <li>
            <span>4</span>El estudiante corrige y vuelve a intentar
          </li>
        </ol>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={enviar}>
          <h2>Iniciar sesión</h2>
          <p className="login-sub">Usa tu cuenta institucional.</p>

          <div className="login-roles">
            {CUENTAS_DEMO.map((c) => (
              <button
                key={c.correo}
                type="button"
                className={`login-role${correo === c.correo ? ' is-active' : ''}`}
                aria-pressed={correo === c.correo}
                onClick={() => setCorreo(c.correo)}
              >
                <strong>{c.label}</strong>
                <span>{c.nombre}</span>
              </button>
            ))}
          </div>

          <div className="login-field">
            <label htmlFor="login-correo">Correo institucional</label>
            <input
              id="login-correo"
              className="login-input"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-clave">Contraseña</label>
            <input
              id="login-clave"
              className="login-input"
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="login-row">
            <label className="login-check">
              <input
                type="checkbox"
                checked={mantenerSesion}
                onChange={(e) => setMantenerSesion(e.target.checked)}
              />
              <span>Mantener la sesión abierta</span>
            </label>
            <a href="#recuperar" onClick={(e) => e.preventDefault()}>
              Olvidé mi contraseña
            </a>
          </div>

          {error && (
            <p className="aviso aviso-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary login-submit" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </div>
  );
}
