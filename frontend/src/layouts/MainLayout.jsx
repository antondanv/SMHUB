import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getOpenReportsCount } from '../api/reportsApi';
import { useAuth } from '../context/useAuth';
import { isAdminUser } from '../utils/auth';

const MainLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canModerate = isAdminUser(user);
  const isAdmin = isAdminUser(user);
  const [openReports, setOpenReports] = useState(0);

  useEffect(() => {
    if (!canModerate) {
      setOpenReports(0);
      return;
    }
    getOpenReportsCount().then(setOpenReports).catch(() => setOpenReports(0));
  }, [canModerate, location.pathname]);
  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';
  const isOnMaterials = location.pathname === '/materials';

  const [headerQuery, setHeaderQuery] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    setHeaderQuery(isOnMaterials ? (searchParams.get('search') || '') : '');
  }, [isOnMaterials, searchParams]);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  function handleSearchSubmit(e) {
    e.preventDefault();
    const trimmed = headerQuery.trim();
    navigate(trimmed ? `/materials?search=${encodeURIComponent(trimmed)}` : '/materials');
    if (!isOnMaterials) setHeaderQuery('');
  }

  function getNavLinkClassName({ isActive }) {
    return `site-nav__link${isActive ? ' is-active' : ''}`;
  }

  function getGuestAction() {
    if (isLoginPage) {
      return {
        label: 'Регистрация',
        to: '/register',
      };
    }

    if (isRegisterPage) {
      return {
        label: 'Войти',
        to: '/login',
      };
    }

    return {
      label: 'Войти',
      to: '/login',
    };
  }

  const guestAction = getGuestAction();

  return (
    <div className="app-shell">
      <div className="background-orb" aria-hidden="true" />

      <header className="site-header">
        <div className="site-header__inner">
          <div className="brand-block">
            <Link to="/" className="brand">
              SMHUB
            </Link>
          </div>

          <nav className="site-nav" aria-label="Основная навигация">
            <ul>
              <li>
                <NavLink to="/" className={getNavLinkClassName} end>
                  Главная
                </NavLink>
              </li>
              <li>
                <NavLink to="/materials" className={getNavLinkClassName}>
                  Каталог
                </NavLink>
              </li>
              {isAuthenticated ? (
                <>
                  <li>
                    <NavLink to="/favorites" className={getNavLinkClassName}>
                      Избранное
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/my-materials" className={getNavLinkClassName}>
                      Мои материалы
                    </NavLink>
                  </li>
                  {canModerate ? (
                    <>
                      <li>
                        <NavLink to="/moderation" className={getNavLinkClassName}>
                          Модерация
                        </NavLink>
                      </li>
                      <li>
                        <NavLink to="/admin" className={getNavLinkClassName}>
                          Админка
                        </NavLink>
                      </li>
                      <li>
                        <NavLink to="/admin/reports" className={getNavLinkClassName}>
                          Жалобы
                          {openReports > 0 && (
                            <span className="nav-badge">{openReports}</span>
                          )}
                        </NavLink>
                      </li>
                      <li>
                        <NavLink to="/admin/audit" className={getNavLinkClassName}>
                          Аудит
                        </NavLink>
                      </li>
                    </>
                  ) : null}
                  {isAdmin ? (
                    <li>
                      <NavLink to="/admin/featured" className={getNavLinkClassName}>
                        Витрина
                      </NavLink>
                    </li>
                  ) : null}
                </>
              ) : null}
            </ul>
          </nav>

          <div className="header-tools">
            {isAuthenticated ? (
              <Link className="button button--header" to="/materials/create">
                Загрузить
              </Link>
            ) : null}
            <form
              className="header-search"
              onSubmit={handleSearchSubmit}
              role="search"
              aria-label="Поиск по материалам"
            >
              <span className="header-search__icon">⌕</span>
              <input
                ref={searchInputRef}
                type="search"
                value={headerQuery}
                onChange={(e) => setHeaderQuery(e.target.value)}
                placeholder="Поиск по материалам..."
              />
              <span className="header-search__hint">⌘K</span>
            </form>
            {!isAuthenticated ? (
              <Link className="button button--header" to={guestAction.to}>
                {guestAction.label}
              </Link>
            ) : null}
            {isAuthenticated ? (
              <>
                <button className="header-icon-button" type="button" aria-label="Уведомления">
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path
                      d="M12 4a4 4 0 0 0-4 4v2.3c0 .7-.2 1.3-.6 1.9L6 14.2V16h12v-1.8l-1.4-2c-.4-.6-.6-1.2-.6-1.9V8a4 4 0 0 0-4-4Z"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M10 18a2 2 0 0 0 4 0"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
                <Link className="header-avatar" to="/profile">
                  {user?.username?.slice(0, 1)?.toUpperCase() || 'U'}
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>SMHUB Digital</p>
        <div className="site-footer__links">
          <a href="/">Условия</a>
          <a href="/">Конфиденциальность</a>
          <a href="/">Помощь</a>
          <a href="/">API</a>
        </div>
        <p>© 2026 SMHUB. Все права защищены.</p>
      </footer>
    </div>
  );
};

export default MainLayout;
