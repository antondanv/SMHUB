import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  addMaterialToFavorites,
  getMaterials,
  removeMaterialFromFavorites,
} from '../api/materialsApi';
import MaterialCard from '../components/MaterialCard';
import heroImage from '../assets/hero.png';
import { useAuth } from '../context/useAuth';
import { useReferenceData } from '../context/useReferenceData';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${bytes} Б`;
}

function getFileType(fileName) {
  if (!fileName) return '';
  return fileName.split('.').pop().toUpperCase();
}

function normalizeApiMaterial(m) {
  return {
    id: m.id,
    title: m.title,
    excerpt: m.description || '',
    subject: m.subject?.name || '',
    type: m.material_type?.name || '',
    course: m.course?.name || '',
    program: m.program?.name || '',
    author: m.author?.full_name || '',
    fileType: getFileType(m.file_name),
    fileSize: formatFileSize(m.file_size),
    publishedAt: m.created_at ? m.created_at.split('T')[0] : '',
    views: m.views_count || 0,
    downloads: m.downloads_count || 0,
    likes: m.likes_count || 0,
    rating: m.avg_rating || null,
    favoritesCount: m.favorites_count || 0,
    isFavorite: Boolean(m.is_favorite),
    status: m.status || 'published',
  };
}

function useMaterialsSection(params) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    getMaterials(params)
      .then((data) => {
        if (isActive) setItems(data.items.map(normalizeApiMaterial));
      })
      .catch(() => {})
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  return { items, setItems, isLoading };
}

const HomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { subjects } = useReferenceData();
  const {
    items: latestMaterials,
    setItems: setLatestMaterials,
    isLoading: latestLoading,
  } = useMaterialsSection({ sort: 'new', per_page: 3 });
  const {
    items: popularMaterials,
    setItems: setPopularMaterials,
    isLoading: popularLoading,
  } = useMaterialsSection({ sort: 'popular', per_page: 3 });
  const [pendingMaterialId, setPendingMaterialId] = useState(null);

  const featuredSubjects = subjects.slice(0, 8);

  async function handleToggleFavorite(material) {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setPendingMaterialId(material.id);

    try {
      const response = material.isFavorite
        ? await removeMaterialFromFavorites(material.id)
        : await addMaterialToFavorites(material.id);

      const updateItems = (items) =>
        items.map((item) =>
          item.id === material.id
            ? {
                ...item,
                isFavorite: response.is_favorite,
                favoritesCount: response.favorites_count,
              }
            : item
        );

      setLatestMaterials((items) => updateItems(items));
      setPopularMaterials((items) => updateItems(items));
    } finally {
      setPendingMaterialId(null);
    }
  }

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

      {isAuthenticated && user && (
        <section className="section-block section-block--accent">
          <div className="section-heading section-heading--row">
            <div>
              <p className="caps-label">Личный кабинет</p>
              <h2>
                {user.first_name ? `Привет, ${user.first_name}!` : `Привет, ${user.username}!`}
              </h2>
            </div>
          </div>

          <div className="quick-actions-grid">
            <Link className="quick-action-card" to="/materials/create">
              <span className="quick-action-card__icon">＋</span>
              <strong>Загрузить материал</strong>
              <span>Поделитесь знаниями с сообществом</span>
            </Link>
            <Link className="quick-action-card" to="/my-materials">
              <span className="quick-action-card__icon">⊡</span>
              <strong>Мои материалы</strong>
              <span>Управляйте загруженными файлами</span>
            </Link>
            <Link className="quick-action-card" to="/favorites">
              <span className="quick-action-card__icon">♥</span>
              <strong>Избранное</strong>
              <span>Ваши сохранённые материалы</span>
            </Link>
            <Link className="quick-action-card" to="/materials">
              <span className="quick-action-card__icon">⌕</span>
              <strong>Каталог</strong>
              <span>Найти материалы по предмету</span>
            </Link>
          </div>
        </section>
      )}

      {!isAuthenticated && (
        <section className="section-block section-block--cta">
          <div className="section-heading section-heading--center">
            <p className="caps-label">Присоединяйтесь</p>
            <h2>Загружайте и находите учебные материалы</h2>
            <p className="hero-copy">
              Зарегистрируйтесь, чтобы загружать материалы, ставить оценки и сохранять в избранное.
            </p>
          </div>
          <div className="hero-actions hero-actions--center">
            <Link className="button button--primary" to="/register">
              Создать аккаунт
            </Link>
            <Link className="button button--secondary" to="/login">
              Войти
            </Link>
          </div>
        </section>
      )}

      {featuredSubjects.length > 0 && (
        <section className="section-block">
          <div className="section-heading section-heading--row">
            <h2>Популярные предметы</h2>
            <Link className="section-link" to="/materials">
              Смотреть всё
            </Link>
          </div>

          <div className="subject-chip-grid">
            {featuredSubjects.map((subject) => (
              <Link
                key={subject.id}
                className="subject-chip"
                to={`/materials?subject_id=${subject.id}`}
              >
                {subject.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section-block">
        <div className="section-heading section-heading--row">
          <div>
            <p className="caps-label">Последние материалы</p>
            <h2>Недавно загруженные и проверенные сообществом.</h2>
          </div>
          <Link className="section-link" to="/materials?sort=new">
            Смотреть всё
          </Link>
        </div>

        {latestLoading ? (
          <div className="catalog-state"><p>Загрузка...</p></div>
        ) : latestMaterials.length > 0 ? (
          <div className="material-grid">
            {latestMaterials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onToggleFavorite={handleToggleFavorite}
                isFavoritePending={pendingMaterialId === material.id}
              />
            ))}
          </div>
        ) : (
          <div className="catalog-state catalog-state--empty"><p>Материалов пока нет.</p></div>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading section-heading--row">
          <div>
            <p className="caps-label">Популярное</p>
            <h2>Что чаще всего скачивают и просматривают.</h2>
          </div>
          <Link className="section-link" to="/materials?sort=popular">
            Смотреть всё
          </Link>
        </div>

        {popularLoading ? (
          <div className="catalog-state"><p>Загрузка...</p></div>
        ) : popularMaterials.length > 0 ? (
          <div className="material-grid">
            {popularMaterials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                onToggleFavorite={handleToggleFavorite}
                isFavoritePending={pendingMaterialId === material.id}
              />
            ))}
          </div>
        ) : (
          <div className="catalog-state catalog-state--empty"><p>Материалов пока нет.</p></div>
        )}
      </section>

      <section className="how-it-works">
        <div className="section-heading section-heading--center">
          <h2>Как работает SMHUB</h2>
          <p className="hero-copy">Короткий, понятный сценарий для поиска, проверки и сохранения материалов.</p>
        </div>
        <div className="steps-grid">
          <Link className="step-card" to="/materials?focus=search">
            <div className="step-card__icon">⌕</div>
            <h3>1. Найдите</h3>
            <p>Ищите по предмету, курсу, типу материала и ключевым словам.</p>
          </Link>
          <Link className="step-card step-card--active" to="/materials?sort=popular">
            <div className="step-card__icon">✓</div>
            <h3>2. Проверьте</h3>
            <p>Ориентируйтесь на рейтинг, сохранения и статус модерации.</p>
          </Link>
          <Link className="step-card" to={isAuthenticated ? '/materials/create' : '/login'}>
            <div className="step-card__icon">＋</div>
            <h3>3. Сохраните или загрузите</h3>
            <p>Добавляйте материалы в избранное или делитесь своими файлами.</p>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
