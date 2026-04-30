import { Link } from 'react-router-dom';

const highlights = [
  'Конспекты',
  'Лабы',
  'Подборки',
  'Профиль',
];

const cards = [
  {
    tag: 'Каталог',
    title: 'Всё по предметам',
    text: 'Нужные материалы без хаоса.',
  },
  {
    tag: 'Подборки',
    title: 'Сессия и практика',
    text: 'Готовые наборы под конкретные задачи.',
  },
  {
    tag: 'Профиль',
    title: 'Личное пространство',
    text: 'Сохранённое, история и быстрый доступ.',
  },
];

const HomePage = () => {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="home-page__content">
          <p className="eyebrow">Student materials hub</p>
          <h1>SMHUB</h1>
          <p className="lead">
            Единое место для учебных материалов, заметок и полезных подборок.
          </p>

          <div className="home-actions">
            <Link className="button button--primary" to="/materials">
              Материалы
            </Link>
            <Link className="button button--secondary" to="/register">
              Регистрация
            </Link>
          </div>
        </div>

        <aside className="home-panel" aria-label="Ключевые возможности">
          <div className="home-panel__header">
            <span>Beta</span>
            <strong>2026</strong>
          </div>

          <div className="home-panel__chips">
            {highlights.map((item) => (
              <span key={item} className="home-chip">
                {item}
              </span>
            ))}
          </div>

          <div className="home-panel__footer">
            <span>Скоро</span>
            <strong>Живой каталог</strong>
          </div>
        </aside>
      </section>

      <section className="home-section">
        <div className="section-heading section-heading--compact">
          <p className="eyebrow">Основное</p>
          <h2>Аккуратная база знаний для студентов.</h2>
        </div>

        <div className="collection-grid">
          {cards.map((item) => (
            <article key={item.title} className="collection-card">
              <span>{item.tag}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
