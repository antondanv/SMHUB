import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { deleteMaterial, getMyMaterials } from '../api/materialsApi';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/useAuth';

const STATUS_FILTERS = [
  { value: '', label: 'Все' },
  { value: 'published', label: 'Опубликованные' },
  { value: 'pending', label: 'На проверке' },
  { value: 'rejected', label: 'Отклонённые' },
  { value: 'draft', label: 'Черновики' },
  { value: 'archived', label: 'Архив' },
];

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${bytes} Б`;
}

const MyMaterialsPage = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [materials, setMaterials] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isActive = true;

    async function loadMyMaterials() {
      setIsLoading(true);
      setError(null);

      const params = { per_page: 50 };
      if (statusFilter) params.status = statusFilter;

      try {
        const data = await getMyMaterials(params);
        if (!isActive) return;
        setMaterials(data.items);
        setTotal(data.total);
      } catch (err) {
        if (isActive) setError(err);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadMyMaterials();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, statusFilter]);

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  async function handleDelete(id) {
    if (!window.confirm('Удалить материал? Это действие необратимо.')) return;
    setDeletingId(id);
    try {
      await deleteMaterial(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div>
          <p className="caps-label">Личный кабинет автора</p>
          <h1>Мои материалы</h1>
          <p className="hero-copy">
            Следите за статусом публикации, управляйте материалами и просматривайте итоги модерации.
          </p>
        </div>
        <Link className="button button--primary" to="/materials/create">
          Загрузить материал
        </Link>
      </div>

      <div className="catalog-filters-row" style={{ marginBottom: '1.5rem' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`button${statusFilter === f.value ? ' button--primary' : ' button--ghost'}`}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="catalog-state">
          <p>Загрузка...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="catalog-state catalog-state--error">
          <p>Ошибка загрузки. Попробуйте обновить страницу.</p>
        </div>
      )}

      {!isLoading && !error && materials.length === 0 && (
        <div className="catalog-state catalog-state--empty">
          <p>
            {statusFilter
              ? 'Нет материалов с выбранным статусом.'
              : 'Вы ещё не загружали материалы.'}
          </p>
          <Link className="button button--primary" to="/materials/create">
            Загрузить первый материал
          </Link>
        </div>
      )}

      {!isLoading && !error && materials.length > 0 && (
        <>
          <p className="caps-label" style={{ marginBottom: '1rem' }}>
            {total} {total === 1 ? 'материал' : 'материалов'}
          </p>

          <div className="dashboard-list">
            {materials.map((material) => (
              <div className="dashboard-card" key={material.id}>
                <div className="dashboard-card__head">
                  <div>
                    <p className="caps-label">{material.subject?.name || ''}</p>
                    <h2>{material.title}</h2>
                  </div>
                  <StatusBadge status={material.status} />
                </div>

                {material.description && <p>{material.description}</p>}

                {material.status === 'rejected' && (
                  <div className="inline-alert inline-alert--warning">
                    Материал отклонён модератором. Отредактируйте и загрузите заново.
                  </div>
                )}

                <div className="dashboard-card__footer">
                  <div className="tag-row">
                    <span>{material.material_type?.name || ''}</span>
                    <span>{material.course?.name || ''}</span>
                    <span>{formatFileSize(material.file_size)}</span>
                    <span>
                      {material.views_count} просм. · {material.downloads_count} скач.
                    </span>
                  </div>

                  <div className="action-row">
                    <Link className="button button--ghost" to={`/materials/${material.id}`}>
                      Открыть
                    </Link>
                    <Link
                      className="button button--secondary"
                      to={`/materials/${material.id}/edit`}
                    >
                      Редактировать
                    </Link>
                    <button
                      className="button button--ghost"
                      type="button"
                      disabled={deletingId === material.id}
                      onClick={() => handleDelete(material.id)}
                    >
                      {deletingId === material.id ? 'Удаление...' : 'Удалить'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default MyMaterialsPage;
