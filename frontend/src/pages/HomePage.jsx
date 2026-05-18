import { Link } from 'react-router-dom';
import MaterialCard from '../components/MaterialCard';
import {
  featuredSubjects,
  homeSections,
} from '../data/mockContent';
import { useAuth } from '../context/useAuth';
import heroImage from '../assets/hero.png';

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="page-shell home-page">
      <section className="stitch-hero">
        <div className="stitch-hero__content">
          <p className="stitch-pill">База знаний 2.0</p>
          <h1>Ваше академическое преимущество начинается здесь.</h1>
          <p className="hero-copy">
            Доступ к конспектам, подборкам, презентациям и проверенным материалам по предметам,
            курсам и направлениям. Без лишнего шума, с акцентом на быстрый поиск и качество.
          </p>

          <div className="hero-actions">
            <Link className="button button--primary" to="/materials">
              Перейти в каталог
            </Link>
            <Link
              className="button button--secondary"
              to={isAuthenticated ? '/materials/create' : '/register'}
            >
              {isAuthenticated ? 'Загрузить материал' : 'Создать аккаунт'}
            </Link>
          </div>
        </div>

        <div className="stitch-hero__visual" aria-hidden="true">
          <img alt="" src={heroImage} />
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading section-heading--row">
          <h2>Популярные предметы</h2>
          <Link className="section-link" to="/materials">
            Смотреть всё
          </Link>
        </div>

        <div className="subject-chip-grid">
          {featuredSubjects.map((subject) => (
            <button key={subject} className="subject-chip" type="button">
              {subject}
            </button>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="caps-label">Последние материалы</p>
          <h2>Недавно загруженные и проверенные сообществом материалы.</h2>
        </div>

        <div className="home-bento">
          <article className="bento-card bento-card--large">
            <div className="bento-card__top">
              <span className="bento-file-tag">PDF</span>
              <button className="icon-link" type="button">
                Сохранить
              </button>
            </div>
            <div className="bento-card__body">
              <p className="caps-label">CS 301 • Гайд к экзамену</p>
              <h3>{homeSections.latest[0].title}</h3>
              <p>{homeSections.latest[0].description}</p>
            </div>
            <div className="bento-card__footer">
              <span>{homeSections.latest[0].author}</span>
              <span>{homeSections.latest[0].views} просмотров</span>
              <span className="status-inline">Проверено</span>
            </div>
          </article>

          <article className="bento-card">
            <div className="bento-card__top">
              <span className="bento-file-tag bento-file-tag--accent">DOCX</span>
              <button className="icon-link" type="button">
                Сохранить
              </button>
            </div>
            <div className="bento-card__body">
              <p className="caps-label">{homeSections.latest[1].subject}</p>
              <h3>{homeSections.latest[1].title}</h3>
              <p>{homeSections.latest[1].rating} ★</p>
            </div>
          </article>

          <article className="bento-card">
            <div className="bento-card__top">
              <span className="bento-file-tag bento-file-tag--blue">PPTX</span>
              <button className="icon-link" type="button">
                Сохранить
              </button>
            </div>
            <div className="bento-card__body">
              <p className="caps-label">{homeSections.latest[2].subject}</p>
              <h3>{homeSections.latest[2].title}</h3>
              <p>{homeSections.latest[2].downloads} скачиваний</p>
            </div>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="caps-label">Популярное</p>
          <h2>Что чаще всего сохраняют и скачивают.</h2>
        </div>
        <div className="material-grid">
          {homeSections.popular.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      </section>

      <section className="how-it-works">
        <div className="section-heading section-heading--center">
          <h2>Как работает SMHUB</h2>
          <p className="hero-copy">Короткий, понятный сценарий для поиска, проверки и сохранения материалов.</p>
        </div>
        <div className="steps-grid">
          <article className="step-card">
            <div className="step-card__icon">⌕</div>
            <h3>1. Найдите</h3>
            <p>Ищите по предмету, курсу, типу материала и ключевым словам.</p>
          </article>
          <article className="step-card step-card--active">
            <div className="step-card__icon">✓</div>
            <h3>2. Проверьте</h3>
            <p>Ориентируйтесь на рейтинг, сохранения и статус модерации.</p>
          </article>
          <article className="step-card">
            <div className="step-card__icon">＋</div>
            <h3>3. Сохраните или загрузите</h3>
            <p>Добавляйте материалы в избранное или делитесь своими файлами.</p>
          </article>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
