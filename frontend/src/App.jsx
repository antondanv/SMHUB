import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';

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
            element={
              <StubPage
                title="Вход"
                description="Здесь будет форма входа для студентов и модераторов."
              />
            }
          />
          <Route
            path="register"
            element={
              <StubPage
                title="Регистрация"
                description="Здесь будет форма создания аккаунта пользователя."
              />
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
