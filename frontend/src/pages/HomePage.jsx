import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <section className="home-page">
      <div className="home-page__content">
        <p className="eyebrow">Учебные материалы в одном месте</p>
        <h1>SMHUB</h1>
        <p className="lead">
          Каркас платформы для обмена конспектами, лекциями, лабораторными и
          полезными материалами между студентами.
        </p>

        <div className="home-actions">
          <Link className="button button--primary" to="/materials">
            Смотреть материалы
          </Link>
          <Link className="button button--secondary" to="/register">
            Создать аккаунт
          </Link>
        </div>
      </div>

      <div className="home-panel" aria-label="Заглушка будущего каталога">
        <div>
          <span>Каталог</span>
          <strong>Скоро</strong>
        </div>
        <div>
          <span>Профиль</span>
          <strong>Скоро</strong>
        </div>
        <div>
          <span>Загрузка</span>
          <strong>Скоро</strong>
        </div>
      </div>
    </section>
  );
};

export default HomePage;
