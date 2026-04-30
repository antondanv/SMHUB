import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';

const StubPage = ({ title, description }) => (
  <section className="stub-page">
    <p className="eyebrow">Раздел в разработке</p>
    <h1>{title}</h1>
    <p>{description}</p>
  </section>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route
            path="materials"
            element={
              <StubPage
                title="Материалы"
                description="Здесь появится каталог учебных материалов с фильтрами и поиском."
              />
            }
          />
          <Route
            path="login"
            element={<LoginPage />}
          />
          <Route
            path="register"
            element={<LoginPage defaultMode="register" />}
          />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
