import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getDashboardSummary, getDashboardTimeseries } from '../api/adminApi';
import { useAuth } from '../context/useAuth';

const PERIODS = [
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: '90d', label: '90 дней' },
];

const METRICS = [
  { value: 'visits', label: 'Просмотры' },
  { value: 'downloads', label: 'Скачивания' },
  { value: 'likes', label: 'Лайки' },
  { value: 'registrations', label: 'Регистрации' },
  { value: 'uploads', label: 'Загрузки' },
  { value: 'logins', label: 'Входы' },
];

function SparkLine({ data }) {
  if (!data || data.length === 0) return <p className="profile-muted">Нет данных</p>;

  const counts = data.map((d) => d.count);
  const max = Math.max(...counts, 1);
  const width = 600;
  const height = 120;
  const padX = 8;
  const padY = 8;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const step = innerW / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const x = padX + i * step;
    const y = padY + innerH - (d.count / max) * innerH;
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padX},${padY + innerH}`,
    ...points,
    `${padX + innerW},${padY + innerH}`,
  ].join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <polygon points={areaPoints} className="sparkline__area" />
      <polyline points={points.join(' ')} className="sparkline__line" />
      {data.map((d, i) => {
        const x = padX + i * step;
        const y = padY + innerH - (d.count / max) * innerH;
        return (
          <circle
            key={d.date}
            cx={x}
            cy={y}
            r="3"
            className="sparkline__dot"
          />
        );
      })}
    </svg>
  );
}

function XAxisLabels({ data, period }) {
  if (!data || data.length === 0) return null;
  const skip = period === '90d' ? 14 : period === '30d' ? 5 : 1;
  return (
    <div className="sparkline-axis">
      {data
        .filter((_, i) => i % skip === 0 || i === data.length - 1)
        .map((d) => (
          <span key={d.date}>
            {d.date.slice(5)}
          </span>
        ))}
    </div>
  );
}

const AdminDashboardPage = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  const [selectedMetric, setSelectedMetric] = useState('visits');
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [tsData, setTsData] = useState(null);
  const [tsLoading, setTsLoading] = useState(true);
  const [tsError, setTsError] = useState(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    getDashboardSummary()
      .then(setSummary)
      .catch(setSummaryError)
      .finally(() => setSummaryLoading(false));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    setTsLoading(true);
    setTsError(null);
    getDashboardTimeseries(selectedMetric, selectedPeriod)
      .then((d) => setTsData(d.data))
      .catch(setTsError)
      .finally(() => setTsLoading(false));
  }, [isAdmin, selectedMetric, selectedPeriod]);

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

      {summaryLoading && (
        <div className="catalog-state">
          <p>Загрузка данных...</p>
        </div>
      )}

      {!summaryLoading && summaryError && (
        <div className="catalog-state catalog-state--error">
          <p>Не удалось загрузить статистику. Попробуйте обновить страницу.</p>
        </div>
      )}

      {!summaryLoading && !summaryError && summary && (
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
              <span className="admin-kpi-card__value">
                {summary.views_total.toLocaleString('ru-RU')}
              </span>
              <span className="admin-kpi-card__label">Просмотров</span>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-card__value">
                {summary.downloads_total.toLocaleString('ru-RU')}
              </span>
              <span className="admin-kpi-card__label">Скачиваний</span>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-card__value">
                {summary.likes_total.toLocaleString('ru-RU')}
              </span>
              <span className="admin-kpi-card__label">Лайков</span>
            </div>
          </div>

          <div className="surface-card admin-chart-card">
            <div className="admin-chart-header">
              <h2 className="admin-table-heading">Динамика активности</h2>
              <div className="admin-chart-controls">
                <div className="admin-tab-group">
                  {METRICS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      className={`admin-tab${selectedMetric === m.value ? ' is-active' : ''}`}
                      onClick={() => setSelectedMetric(m.value)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="admin-tab-group">
                  {PERIODS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      className={`admin-tab${selectedPeriod === p.value ? ' is-active' : ''}`}
                      onClick={() => setSelectedPeriod(p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {tsLoading && <p className="profile-muted">Загрузка графика...</p>}
            {!tsLoading && tsError && <p className="profile-muted">Ошибка загрузки графика.</p>}
            {!tsLoading && !tsError && tsData && (
              <div className="sparkline-wrap">
                <SparkLine data={tsData} />
                <XAxisLabels data={tsData} period={selectedPeriod} />
              </div>
            )}
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
