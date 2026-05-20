import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  addMaterialToFavorites,
  getMaterials,
  removeMaterialFromFavorites,
} from '../api/materialsApi';
import MaterialCard from '../components/MaterialCard';
import { useAuth } from '../context/useAuth';
import { useReferenceData } from '../context/useReferenceData';

const DEFAULT_FILTERS = {
  search: '',
  subject_id: '',
  material_type_id: '',
  course_id: '',
  program_id: '',
  sort: 'new',
};

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
    rating: null,
    favoritesCount: m.favorites_count || 0,
    isFavorite: Boolean(m.is_favorite),
    status: m.status || 'published',
  };
}

function getPaginationPages(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
  if (page >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', page - 1, page, page + 1, '...', totalPages];
}

const MaterialsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { subjects, materialTypes, courses, programs } = useReferenceData();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [materials, setMaterials] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingMaterialId, setPendingMaterialId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (key !== 'search') setPage(1);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  const hasActiveFilters =
    filters.subject_id ||
    filters.material_type_id ||
    filters.course_id ||
    filters.program_id ||
    filters.search;

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);

    const params = { page, per_page: 12, sort: filters.sort };
    if (debouncedSearch) params.search = debouncedSearch;
    if (filters.subject_id) params.subject_id = filters.subject_id;
    if (filters.material_type_id) params.material_type_id = filters.material_type_id;
    if (filters.course_id) params.course_id = filters.course_id;
    if (filters.program_id) params.program_id = filters.program_id;

    getMaterials(params)
      .then((data) => {
        if (!isActive) return;
        setMaterials(data.items.map(normalizeApiMaterial));
        setTotalPages(data.total_pages);
        setTotal(data.total);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [debouncedSearch, filters.subject_id, filters.material_type_id, filters.course_id, filters.program_id, filters.sort, page]);

  async function handleToggleFavorite(material) {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setPendingMaterialId(material.id);
    setError(null);

    try {
      const response = material.isFavorite
        ? await removeMaterialFromFavorites(material.id)
        : await addMaterialToFavorites(material.id);

      setMaterials((currentMaterials) =>
        currentMaterials.map((item) =>
          item.id === material.id
            ? {
                ...item,
                isFavorite: response.is_favorite,
                favoritesCount: response.favorites_count,
              }
            : item
        )
      );
    } catch (requestError) {
      setError(requestError);
    } finally {
      setPendingMaterialId(null);
    }
  }

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div className="page-hero__copy">
          <p className="caps-label">Каталог</p>
          <h1 className="page-hero__title">Материалы</h1>
          <p className="hero-copy">
            Исследуйте материалы по предметам, типам, курсам и направлениям.
            {total > 0 && !isLoading && <span> Найдено: {total}</span>}
          </p>
        </div>
        <Link className="button button--primary" to="/materials/create">
          Загрузить материал
        </Link>
      </div>

      <div className="catalog-layout catalog-layout--stitch">
        <aside className="catalog-rail">
          <div className="catalog-rail__intro">
            <h2>Фильтры каталога</h2>
            <p>Просматривайте материалы по разделам и типам.</p>
            <Link className="button button--primary" to="/materials/create">
              Загрузить материал
            </Link>
          </div>

          <nav className="catalog-rail__nav">
            <button
              className={`catalog-rail__link${!filters.subject_id ? ' is-active' : ''}`}
              type="button"
              onClick={() => updateFilter('subject_id', '')}
            >
              Все предметы
            </button>
            {subjects.map((subject) => (
              <button
                key={subject.id}
                className={`catalog-rail__link${filters.subject_id === String(subject.id) ? ' is-active' : ''}`}
                type="button"
                onClick={() => updateFilter('subject_id', String(subject.id))}
              >
                {subject.name}
              </button>
            ))}
          </nav>
        </aside>

        <div className="catalog-content">
          <div className="catalog-topbar">
            <label className="catalog-search" aria-label="Поиск по каталогу">
              <span>⌕</span>
              <input
                type="search"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Поиск материалов..."
              />
              <em>⌘K</em>
            </label>

            <label className="catalog-sort">
              <span>Сортировка:</span>
              <select value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}>
                <option value="new">Сначала новые</option>
                <option value="popular">Сначала популярные</option>
              </select>
            </label>
          </div>

          <div className="catalog-filters-row">
            <label className="field-group">
              <span>Тип материала</span>
              <select
                value={filters.material_type_id}
                onChange={(e) => updateFilter('material_type_id', e.target.value)}
              >
                <option value="">Все типы</option>
                {materialTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span>Курс</span>
              <select
                value={filters.course_id}
                onChange={(e) => updateFilter('course_id', e.target.value)}
              >
                <option value="">Все курсы</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span>Направление</span>
              <select
                value={filters.program_id}
                onChange={(e) => updateFilter('program_id', e.target.value)}
              >
                <option value="">Все направления</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            {hasActiveFilters && (
              <button className="button button--ghost" type="button" onClick={resetFilters}>
                Сбросить
              </button>
            )}
          </div>

          {isLoading && (
            <div className="catalog-state">
              <p>Загрузка...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="catalog-state catalog-state--error">
              <p>Ошибка загрузки материалов. Попробуйте обновить страницу.</p>
            </div>
          )}

          {!isLoading && !error && materials.length === 0 && (
            <div className="catalog-state catalog-state--empty">
              <p>Материалы не найдены. Попробуйте изменить фильтры.</p>
              {hasActiveFilters && (
                <button className="button button--ghost" type="button" onClick={resetFilters}>
                  Сбросить фильтры
                </button>
              )}
            </div>
          )}

          {!isLoading && !error && materials.length > 0 && (
            <>
              <div className="catalog-grid">
                {materials.map((material) => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    onToggleFavorite={handleToggleFavorite}
                    isFavoritePending={pendingMaterialId === material.id}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="catalog-pagination">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ←
                  </button>
                  {getPaginationPages(page, totalPages).map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`}>…</span>
                    ) : (
                      <button
                        key={p}
                        className={page === p ? 'is-active' : ''}
                        type="button"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default MaterialsPage;
