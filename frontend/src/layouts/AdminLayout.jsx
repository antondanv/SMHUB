import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { getOpenReportsCount } from '../api/reportsApi';
import { useAuth } from '../context/useAuth';
import { isAdminUser } from '../utils/auth';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Дашборд', end: true },
  { to: '/admin/users', label: 'Пользователи' },
  { to: '/admin/references', label: 'Справочники' },
  { to: '/admin/reports', label: 'Жалобы', badge: 'reports' },
  { to: '/admin/moderation', label: 'Модерация' },
  { to: '/admin/audit', label: 'Аудит' },
  { to: '/admin/featured', label: 'Витрина' },
];

const AdminLayout = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const location = useLocation();
  const isAdmin = isAdminUser(user);
  const [openReports, setOpenReports] = useState(0);

  useEffect(() => {
    if (!isAdmin) {
      setOpenReports(0);
      return;
    }
    getOpenReportsCount().then(setOpenReports).catch(() => setOpenReports(0));
  }, [isAdmin, location.pathname]);

  if (isAuthLoading) {
    return (
      <section className="page-shell">
        <p className="profile-muted">Загрузка...</p>
      </section>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-layout">
      <nav className="admin-menu" aria-label="Разделы администрирования">
        {ADMIN_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `admin-menu__link${isActive ? ' is-active' : ''}`
            }
          >
            {link.label}
            {link.badge === 'reports' && openReports > 0 && (
              <span className="nav-badge">{openReports}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
};

export default AdminLayout;
