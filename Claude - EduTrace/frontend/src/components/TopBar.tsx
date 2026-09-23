import { useEffect, useRef, useState } from 'react';
import { IconBell, IconLogout, IconUser } from '../icons';

interface Props {
  crumb: string;
  role: string;
  name: string;
  initials: string;
  email: string;
  badge: number | null;
  onProfile: () => void;
  onLogout: () => void;
}

export default function TopBar({
  crumb,
  role,
  name,
  initials,
  email,
  badge,
  onProfile,
  onLogout,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <header className="topbar">
      <span className="crumb">{crumb}</span>
      <div className="topbar-right">
        <button type="button" className="bell" aria-label="Notificaciones">
          <span className="icon">
            <IconBell />
          </span>
          {badge ? <span className="bell-count">{badge}</span> : null}
        </button>

        <div className="user-wrap" ref={wrap}>
          <button
            type="button"
            className={`user${open ? ' is-open' : ''}`}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="avatar">{initials}</span>
            <span className="user-text">
              <span className="user-role">{role}</span>
              <span className="user-name">{name}</span>
            </span>
          </button>

          {open && (
            <div className="user-menu" role="menu">
              <div className="user-menu-head">
                <div className="avatar">{initials}</div>
                <div>
                  <div className="user-menu-name">{name}</div>
                  <div className="user-menu-mail">{email}</div>
                </div>
              </div>
              <button
                type="button"
                role="menuitem"
                className="user-menu-item"
                onClick={() => {
                  setOpen(false);
                  onProfile();
                }}
              >
                <span className="icon">
                  <IconUser />
                </span>
                Ver perfil
              </button>
              <button
                type="button"
                role="menuitem"
                className="user-menu-item is-danger"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
              >
                <span className="icon">
                  <IconLogout />
                </span>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
