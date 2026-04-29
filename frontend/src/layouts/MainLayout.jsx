import { Outlet, Link } from 'react-router-dom';

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold">SMHUB</Link>
          <nav>
            <ul className="flex space-x-4">
              <li><Link to="/" className="hover:underline">Главная</Link></li>
              <li><Link to="/materials" className="hover:underline">Материалы</Link></li>
              <li><Link to="/profile" className="hover:underline">Профиль</Link></li>
              <li><Link to="/login" className="hover:underline">Вход</Link></li>
            </ul>
          </nav>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto p-4">
        <Outlet />
      </main>
      
      <footer className="bg-gray-200 p-4 text-center">
        <p>&copy; 2026 SMHUB - Система обмена учебными материалами</p>
      </footer>
    </div>
  );
};

export default MainLayout;
