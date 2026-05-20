import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getDashboardSummary } from '../api/adminApi';
import { useAuth } from '../context/useAuth';

const AdminDashboardPage = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;

    getDashboardSummary()
      .then(setSummary)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [isAdmin]);

  if (isAuthLoading) {
    return (
      <section className="page-shell">
        <p className="profile-muted">Загрузка...</p>
      </section>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div className="page-hero__copy">
          <p className="caps-label">Администрирование</p>
          <h1 className="page-hero__title">Дашборд</h1>
          <p className="hero-copy">Сводная статистика платформы.</p>
        </div>
      </div>

      {isLoading && (
        <div className="catalog-state">
          <p>Загрузка данных...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="catalog-state catalog-state--error">
          <p>Не удалось загрузить статистику. Попробуйте обновить страницу.</p>
        </div>
      )}

      {!isLoading && !error && summary && (
        <>
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <span className="admin-kpi-card__value">{summary.users_total}</span>
              <span className="admin-kpi-card__label">Пользователей</span>
              <span className="admin-kpi-card__sub">+{summary.users_new_last_7d} за 7 дней</span>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-card__value">{summary.users_active}</span>
              <span className="admin-kpi-card__label">Активных</span>
              <Link className="admin-kpi-card__link" to="/admin/users">
                Управление →
              </Link>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-card__value">{summary.materials_total}</span>
              <span className="admin-kpi-card__label">Материалов</span>
              <Link className="admin-kpi-card__link" to="/materials">
                Каталог →
              </Link>
            </div>
            <div className="admin-kpi-card admin-kpi-card--warn">
              <span className="admin-kpi-card__value">{summary.materials_pending_count}</span>
              <span className="admin-kpi-card__label">На модерации</span>
              <Link className="admin-kpi-card__link" to="/moderation">
                Проверить →
              </Link>
            </div>
            <div className="admin-kpi-card admin-kpi-card--danger">
              <span className="admin-kpi-card__value">{summary.materials_rejected_count}</span>
              <span className="admin-kpi-card__label">Отклонено</span>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-card__value">{summary.views_total.toLocaleString('ru-RU')}</span>
              <span className="admin-kpi-card__label">Просмотров</span>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-card__value">{summary.downloads_total.toLocaleString('ru-RU')}</span>
              <span className="admin-kpi-card__label">Скачиваний</span>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-card__value">{summary.likes_total.toLocaleString('ru-RU')}</span>
              <span className="admin-kpi-card__label">Лайков</span>
            </div>
          </div>

          <div className="admin-tables-grid">
            <div className="surface-card">
              <h2 className="admin-table-heading">Топ-10 материалов по просмотрам</h2>
              {summary.top_materials.length === 0 ? (
                <p className="profile-muted">Нет данных</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Материал</th>
                      <th>Автор</th>
                      <th>Просмотры</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.top_materials.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <Link to={`/materials/${m.id}`}>{m.title}</Link>
                        </td>
                        <td>{m.author}</td>
                        <td>{m.views.toLocaleString('ru-RU')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="surface-card">
              <h2 className="admin-table-heading">Топ-10 авторов по публикациям</h2>
              {summary.top_authors.length === 0 ? (
                <p className="profile-muted">Нет данных</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Автор</th>
                      <th>Материалов</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.top_authors.map((a) => (
                      <tr key={a.user_id}>
                        <td>{a.full_name || a.username}</td>
                        <td>{a.materials_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default AdminDashboardPage;
