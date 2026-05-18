import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MaterialCard from '../components/MaterialCard';
import { mockMaterials } from '../data/mockContent';

const MaterialsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSort, setSelectedSort] = useState('new');

  const subjects = [...new Set(mockMaterials.map((material) => material.subject))];
  const types = [...new Set(mockMaterials.map((material) => material.type))];
  const courses = [...new Set(mockMaterials.map((material) => material.course))];

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const visibleMaterials = mockMaterials.filter((material) => {
      const matchesQuery =
        !normalizedQuery ||
        material.title.toLowerCase().includes(normalizedQuery) ||
        material.subject.toLowerCase().includes(normalizedQuery) ||
        material.excerpt.toLowerCase().includes(normalizedQuery);

      const matchesSubject = !selectedSubject || material.subject === selectedSubject;
      const matchesType = !selectedType || material.type === selectedType;
      const matchesCourse = !selectedCourse || material.course === selectedCourse;

      return matchesQuery && matchesSubject && matchesType && matchesCourse;
    });

    return visibleMaterials.sort((left, right) => {
      if (selectedSort === 'popular') {
        return right.likes + right.downloads - (left.likes + left.downloads);
      }

      return new Date(right.publishedAt) - new Date(left.publishedAt);
    });
  }, [searchQuery, selectedCourse, selectedSort, selectedSubject, selectedType]);

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div className="page-hero__copy">
          <p className="caps-label">Каталог</p>
          <h1 className="page-hero__title">Материалы</h1>
          <p className="hero-copy">
            Исследуйте материалы по предметам, типам, курсам и направлениям. Основной акцент
            редизайна здесь на поиске, фильтрах и карточках.
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
            <button className="catalog-rail__link is-active" type="button">
              Все материалы
            </button>
            <button className="catalog-rail__link" type="button">
              Предметы
            </button>
            <button className="catalog-rail__link" type="button">
              Курсы
            </button>
            <button className="catalog-rail__link" type="button">
              Направления
            </button>
          </nav>
        </aside>

        <div className="catalog-content">
          <div className="catalog-topbar">
            <label className="catalog-search" aria-label="Поиск по каталогу">
              <span>⌕</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск материалов и предметов..."
              />
              <em>⌘K</em>
            </label>

            <label className="catalog-sort">
              <span>Сортировка:</span>
              <select value={selectedSort} onChange={(event) => setSelectedSort(event.target.value)}>
                <option value="new">Сначала новые</option>
                <option value="popular">Сначала популярные</option>
              </select>
            </label>
          </div>

          <div className="catalog-filters-row">
            <label className="field-group">
              <span>Предмет</span>
              <select
                value={selectedSubject}
                onChange={(event) => setSelectedSubject(event.target.value)}
              >
                <option value="">Все предметы</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span>Тип материала</span>
              <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
                <option value="">Все типы</option>
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span>Курс</span>
              <select
                value={selectedCourse}
                onChange={(event) => setSelectedCourse(event.target.value)}
              >
                <option value="">Все курсы</option>
                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="catalog-grid">
            {filteredMaterials.slice(0, 6).map((material) => (
              <MaterialCard key={material.id} material={material} />
            ))}
          </div>

          <div className="catalog-pagination">
            <button type="button" disabled>
              ←
            </button>
            <button className="is-active" type="button">
              1
            </button>
            <button type="button">2</button>
            <button type="button">3</button>
            <span>…</span>
            <button type="button">12</button>
            <button type="button">→</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MaterialsPage;
