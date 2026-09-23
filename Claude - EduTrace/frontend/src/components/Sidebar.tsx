import type { SVGProps } from 'react';
import type { NavId, Role } from '../types';
import { NAV_LABELS } from '../data';
import { IconBook, IconChart, IconClipboard, IconDashboard, IconUsers } from '../icons';

const ORDER: Exclude<NavId, 'perfil'>[] = ['dashboard', 'cursos', 'tareas', 'estudiantes', 'reportes'];

const ICON: Record<Exclude<NavId, 'perfil'>, (p: SVGProps<SVGSVGElement>) => JSX.Element> = {
  dashboard: IconDashboard,
  cursos: IconBook,
  tareas: IconClipboard,
  estudiantes: IconUsers,
  reportes: IconChart,
};

interface Props {
  role: Role;
  nav: NavId;
  onNav: (id: NavId) => void;
}

export default function Sidebar({ role, nav, onNav }: Props) {
  const labels = NAV_LABELS[role];

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="./logo-edutrace.png" alt="EduTrace" />
        <div>
          <div className="brand-name">
            EDU<span>-TRACE</span>
          </div>
          <div className="brand-tag">
            Acompañamiento
            <br />
            formativo
          </div>
        </div>
      </div>

      <nav className="nav">
        {ORDER.filter((id) => labels[id]).map((id) => {
          const Icon = ICON[id];
          return (
            <button
              key={id}
              type="button"
              className={`nav-item${nav === id ? ' is-active' : ''}`}
              onClick={() => onNav(id)}
            >
              <span className="icon">
                <Icon />
              </span>
              <span>{labels[id]}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
