import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const MainLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <div className="background-orb" aria-hidden="true" />

      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="brand">
            SMHUB
          </Link>

          <nav className="site-nav" aria-label="Основная навигация">
            <ul>
              <li>
                <Link to="/">Главная</Link>
              </li>
              <li>
                <Link to="/materials">Материалы</Link>
              </li>
              {isAuthenticated ? (
                <>
                  <li>
                    <Link to="/profile" className="nav-user">
                      {user.username}
                    </Link>
                  </li>
                  <li>
                    <button className="nav-button" type="button" onClick={handleLogout}>
                      Выйти
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <Link to="/login">Войти</Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>SMHUB, 2026</p>
        <p>Система обмена учебными материалами</p>
      </footer>
    </div>
  );
};

export default MainLayout;
