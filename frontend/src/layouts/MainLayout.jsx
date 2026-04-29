import { Outlet, Link } from 'react-router-dom';

const MainLayout = () => {
  return (
    <div className="app-shell">
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
              <li>
                <Link to="/register">Регистрация</Link>
              </li>
              <li>
                <Link to="/login">Вход</Link>
              </li>
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
