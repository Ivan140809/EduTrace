import { useState } from 'react';
import { listarCursos, listarNotificaciones } from './api/servicios';
import LoginView from './components/LoginView';
import Placeholder from './components/Placeholder';
import ProfessorDashboard from './components/ProfessorDashboard';
import ReportsView from './components/ReportsView';
import Sidebar from './components/Sidebar';
import StudentPanel from './components/StudentPanel';
import TopBar from './components/TopBar';
import { CRUMBS } from './data';
import { useConsulta } from './hooks/useConsulta';
import { useSesion } from './sesion/SesionContext';
import type { NavId } from './types';

export default function App() {
  // ANTES: el rol se guardaba aquí con useState y el login solo lo cambiaba.
  // AHORA: el usuario real viene del backend a través de la sesión.
  const { usuario, rol, verificando, salir } = useSesion();

  const [nav, setNav] = useState<NavId>('dashboard');

  // Datos compartidos por varias pantallas. `null` = no pedir nada si no hay sesión.
  const cursos = useConsulta(usuario ? listarCursos : null, [usuario?.id]);
  const notificaciones = useConsulta(usuario ? () => listarNotificaciones(true) : null, [usuario?.id]);

  if (verificando) return <p className="aviso">Cargando…</p>;
  if (!usuario || !rol) return <LoginView />;

  const isStudent = rol === 'estudiante';
  // Por ahora se trabaja con el primer curso del usuario. Cuando exista la pantalla
  // "Cursos", el curso elegido se guardará en un useState aquí.
  const curso = cursos.datos?.[0] ?? null;

  return (
    <div className="app">
      <Sidebar role={rol} nav={nav} onNav={setNav} />

      <main className="main">
        <TopBar
          crumb={CRUMBS[rol][nav]}
          role={isStudent ? 'ESTUDIANTE' : 'PROFESOR'}
          name={usuario.nombre}
          initials={usuario.iniciales}
          email={usuario.correo}
          badge={notificaciones.datos?.noLeidas || null}
          onProfile={() => setNav('perfil')}
          onLogout={() => {
            void salir();
            setNav('dashboard');
          }}
        />

        {cursos.error ? (
          <p className="aviso aviso-error">{cursos.error.message}</p>
        ) : nav === 'perfil' ? (
          <Placeholder
            title="Mi perfil"
            backLabel={isStudent ? 'Volver a mi panel' : 'Volver al tablero'}
            onBack={() => setNav('dashboard')}
          />
        ) : nav === 'reportes' && !isStudent ? (
          <ReportsView />
        ) : nav !== 'dashboard' ? (
          <Placeholder
            title={CRUMBS[rol][nav]}
            backLabel={isStudent ? 'Volver a mi panel' : 'Volver al tablero'}
            onBack={() => setNav('dashboard')}
          />
        ) : isStudent ? (
          curso ? (
            <StudentPanel curso={curso} />
          ) : (
            <p className="aviso">{cursos.cargando ? 'Cargando cursos…' : 'No estás inscrito en ningún curso.'}</p>
          )
        ) : curso ? (
          <ProfessorDashboard curso={curso} />
        ) : (
          <p className="aviso">{cursos.cargando ? 'Cargando cursos…' : 'No tienes cursos asignados.'}</p>
        )}
      </main>
    </div>
  );
}
