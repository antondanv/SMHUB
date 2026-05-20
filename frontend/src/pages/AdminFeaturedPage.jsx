import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  createFeatured,
  deleteFeatured,
  listFeaturedAdmin,
  updateFeatured,
} from '../api/featuredApi';
import { getMaterials } from '../api/materialsApi';
import { useAuth } from '../context/useAuth';

const SECTIONS = [
  { value: 'hero', label: 'Главное' },
  { value: 'recommended', label: 'Рекомендуем' },
  { value: 'editorial', label: 'От редакции' },
  { value: 'seasonal', label: 'Сезонное' },
];

function getErrorMessage(error, fallbackMessage) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  return fallbackMessage;
}

const AdminFeaturedPage = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isAdmin = user?.role_name === 'admin';

  const [items, setItems] = useState([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formSection, setFormSection] = useState('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [formPosition, setFormPosition] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const [pendingItemId, setPendingItemId] = useState(null);

  const grouped = useMemo(() => {
    const result = Object.fromEntries(SECTIONS.map((s) => [s.value, []]));
    for (const item of items) {
      if (result[item.section]) result[item.section].push(item);
    }
    for (const key of Object.keys(result)) {
      result[key].sort((a, b) => a.position - b.position);
    }
    return result;
  }, [items]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    let isActive = true;

    async function loadFeaturedItems() {
      setIsPageLoading(true);
      try {
        const data = await listFeaturedAdmin();
        if (isActive) setItems(data);
      } catch (err) {
        if (isActive) setError(getErrorMessage(err, 'Не удалось загрузить витрину.'));
      } finally {
        if (isActive) setIsPageLoading(false);
      }
    }

    loadFeaturedItems();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isAdmin]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      function resetSearchState() {
        setSearchResults([]);
        setIsSearching(false);
      }

      resetSearchState();
      return undefined;
    }

    let isActive = true;
    function scheduleSearch() {
      setIsSearching(true);
      return setTimeout(() => {
        getMaterials({ search: trimmed, per_page: 10 })
          .then((data) => {
            if (isActive) setSearchResults(data.items || []);
          })
          .catch(() => {
            if (isActive) setSearchResults([]);
          })
          .finally(() => {
            if (isActive) setIsSearching(false);
          });
      }, 300);
    }

    const timer = scheduleSearch();

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  async function handleAdd(event) {
    event.preventDefault();
    if (!selectedMaterialId) {
      setError('Выберите материал из поиска.');
      return;
    }

    setIsCreating(true);
    setError('');
    setSuccess('');
    try {
      const created = await createFeatured({
        section: formSection,
        material_id: Number(selectedMaterialId),
        position: Number(formPosition) || 0,
        is_active: true,
      });
      setItems((prev) => [...prev, created]);
      setSuccess(`Добавлен материал "${created.material_title}" в секцию.`);
      setSelectedMaterialId('');
      setSearchQuery('');
      setSearchResults([]);
      setFormPosition(0);
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось добавить материал в витрину.'));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(item, patch) {
    setPendingItemId(item.id);
    setError('');
    setSuccess('');
    try {
      const updated = await updateFeatured(item.id, patch);
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось обновить позицию.'));
    } finally {
      setPendingItemId(null);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Удалить "${item.material_title}" из витрины?`)) return;

    setPendingItemId(item.id);
    setError('');
    setSuccess('');
    try {
      await deleteFeatured(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось удалить позицию.'));
    } finally {
      setPendingItemId(null);
    }
  }

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isLoading && isAuthenticated && !isAdmin) {
    return (
      <section className="page-shell">
        <div className="empty-state">
          <p className="caps-label">Недостаточно прав</p>
          <h1>Управление витриной доступно только администратору.</h1>
        </div>
      </section>
    );
  }

  if (isLoading || isPageLoading) {
    return (
      <section className="page-shell">
        <div className="surface-card surface-card--single">
          <p className="profile-muted">Загружаем витрину...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div>
          <p className="caps-label">Администрирование</p>
          <h1>Витрина главной страницы</h1>
          <p className="hero-copy">
            Выбирайте материалы для блоков на главной. Снимайте флаг активности, чтобы временно скрыть
            позицию, или меняйте порядок через поле «Позиция».
          </p>
        </div>
      </div>

      {error && <div className="inline-alert inline-alert--warning">{error}</div>}
      {success && <div className="inline-alert">{success}</div>}

      <div className="surface-card surface-card--single">
        <div className="section-heading section-heading--compact">
          <p className="caps-label">Добавить позицию</p>
          <h2>Найдите материал и выберите секцию.</h2>
        </div>

        <form className="admin-featured-form" onSubmit={handleAdd}>
          <div className="admin-featured-form__row">
            <label>
              <span>Секция</span>
              <select
                value={formSection}
                onChange={(e) => setFormSection(e.target.value)}
              >
                {SECTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Позиция</span>
              <input
                type="number"
                min="0"
                value={formPosition}
                onChange={(e) => setFormPosition(e.target.value)}
              />
            </label>
          </div>

          <label>
            <span>Поиск материала</span>
            <input
              type="search"
              placeholder="Название или описание..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedMaterialId('');
              }}
            />
          </label>

          {searchQuery.trim() && (
            <div className="admin-featured-results">
              {isSearching && <p className="profile-muted">Ищем...</p>}
              {!isSearching && searchResults.length === 0 && (
                <p className="profile-muted">Ничего не найдено.</p>
              )}
              {searchResults.map((m) => (
                <label key={m.id} className="admin-featured-result">
                  <input
                    type="radio"
                    name="material"
                    value={m.id}
                    checked={String(selectedMaterialId) === String(m.id)}
                    onChange={() => setSelectedMaterialId(m.id)}
                  />
                  <span>
                    <strong>{m.title}</strong>
                    <em>{m.subject?.name} · {m.author?.full_name}</em>
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className="action-row">
            <button
              type="submit"
              className="button button--primary"
              disabled={isCreating || !selectedMaterialId}
            >
              {isCreating ? 'Добавляем...' : 'Добавить в витрину'}
            </button>
          </div>
        </form>
      </div>

      {SECTIONS.map((section) => (
        <div className="surface-card surface-card--single" key={section.value}>
          <div className="section-heading section-heading--row">
            <div>
              <p className="caps-label">{section.label}</p>
              <h2>{grouped[section.value].length} {grouped[section.value].length === 1 ? 'материал' : 'материалов'}</h2>
            </div>
          </div>

          {grouped[section.value].length === 0 ? (
            <div className="empty-inline">В этой секции пока пусто.</div>
          ) : (
            <div className="admin-featured-list">
              {grouped[section.value].map((item) => (
                <div key={item.id} className={`admin-featured-item${item.is_active ? '' : ' is-inactive'}`}>
                  <div className="admin-featured-item__main">
                    <strong>{item.material_title}</strong>
                    <span>ID материала: {item.material_id}</span>
                  </div>
                  <label className="admin-featured-item__position">
                    <span>Позиция</span>
                    <input
                      type="number"
                      min="0"
                      defaultValue={item.position}
                      disabled={pendingItemId === item.id}
                      onBlur={(e) => {
                        const next = Number(e.target.value);
                        if (next !== item.position) {
                          handleUpdate(item, { position: next });
                        }
                      }}
                    />
                  </label>
                  <label className="admin-featured-item__toggle">
                    <input
                      type="checkbox"
                      checked={item.is_active}
                      disabled={pendingItemId === item.id}
                      onChange={(e) => handleUpdate(item, { is_active: e.target.checked })}
                    />
                    <span>Активна</span>
                  </label>
                  <button
                    type="button"
                    className="button button--ghost"
                    disabled={pendingItemId === item.id}
                    onClick={() => handleDelete(item)}
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
};

export default AdminFeaturedPage;
