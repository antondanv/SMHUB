import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getReports, resolveReport } from '../api/reportsApi';
import { useAuth } from '../context/useAuth';
import { isAdminUser } from '../utils/auth';

const REASON_LABELS = {
  spam: 'Спам',
  incorrect: 'Неверная информация',
  inappropriate: 'Неприемлемый контент',
  copyright: 'Нарушение авторских прав',
  other: 'Другое',
};

const STATUS_TABS = [
  { value: 'open', label: 'Открытые' },
  { value: 'resolved', label: 'Решённые' },
  { value: 'dismissed', label: 'Отклонённые' },
];

const AdminReportsPage = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState('open');
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAdmin = isAdminUser(user);

  useEffect(() => {
    if (!isAdmin) return;

    async function loadReports() {
      setIsLoading(true);
      try {
        const data = await getReports(statusFilter);
        setReports(data.items);
        setTotal(data.total);
      } catch {
        setError('Не удалось загрузить жалобы.');
      } finally {
        setIsLoading(false);
      }
    }

    loadReports();
  }, [isAdmin, statusFilter]);

  async function handle(reportId, nextStatus, action = 'none') {
    setPendingId(reportId);
    setError('');
    setSuccess('');
    try {
      await resolveReport(reportId, nextStatus, action);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setTotal((t) => t - 1);
      setSuccess('Жалоба обработана.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось обработать жалобу.');
    } finally {
      setPendingId(null);
    }
  }

  if (isAuthLoading) return <section className="page-shell"><p className="profile-muted">Загрузка...</p></section>;
  if (!isAuthenticated || !isAdmin) return <Navigate to="/" replace />;

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div className="page-hero__copy">
          <p className="caps-label">Администрирование</p>
          <h1 className="page-hero__title">Жалобы на контент</h1>
          <p className="hero-copy">Всего: {total}</p>
        </div>
      </div>

      {error && <div className="inline-alert inline-alert--warning">{error}</div>}
      {success && <div className="inline-alert">{success}</div>}

      <div className="admin-tab-group" style={{ marginBottom: 'var(--space-md)' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`admin-tab${statusFilter === tab.value ? ' is-active' : ''}`}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="profile-muted">Загрузка...</p>
      ) : reports.length === 0 ? (
        <div className="surface-card">
          <p className="profile-muted">Жалоб нет.</p>
        </div>
      ) : (
        <div className="reports-list">
          {reports.map((r) => (
            <div key={r.id} className="surface-card report-card">
              <div className="report-card__head">
                <span className="report-card__type">
                  {r.target_type === 'material' ? 'Материал' : 'Комментарий'}
                </span>
                <span className="report-card__reason">{REASON_LABELS[r.reason] || r.reason}</span>
                <span className="report-card__date">
                  {new Date(r.created_at).toLocaleString('ru-RU')}
                </span>
              </div>

              <div className="report-card__body">
                {r.target_type === 'material' ? (
                  <Link to={`/materials/${r.target_id}`} className="report-card__target">
                    <strong>{r.target_title || `Материал #${r.target_id}`}</strong>
                  </Link>
                ) : (
                  <strong>{r.target_title || `Комментарий #${r.target_id}`}</strong>
                )}
                {r.target_content && <p className="report-card__excerpt">{r.target_content}</p>}
              </div>

              <div className="report-card__meta">
                <span>
                  От: <strong>{r.reporter_full_name || r.reporter_username || 'Удалён'}</strong>
                </span>
                {r.comment && <p className="report-card__comment">«{r.comment}»</p>}
              </div>

              {statusFilter === 'open' && (
                <div className="action-row">
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={pendingId === r.id}
                    onClick={() => handle(r.id, 'resolved')}
                  >
                    Решено
                  </button>
                  {r.target_type === 'material' && (
                    <button
                      type="button"
                      className="button button--secondary"
                      disabled={pendingId === r.id}
                      onClick={() => handle(r.id, 'resolved', 'unpublish_material')}
                    >
                      Решено + снять с публикации
                    </button>
                  )}
                  {r.target_type === 'comment' && (
                    <button
                      type="button"
                      className="button button--secondary"
                      disabled={pendingId === r.id}
                      onClick={() => handle(r.id, 'resolved', 'delete_comment')}
                    >
                      Решено + удалить комментарий
                    </button>
                  )}
                  <button
                    type="button"
                    className="button button--ghost"
                    disabled={pendingId === r.id}
                    onClick={() => handle(r.id, 'dismissed')}
                  >
                    Отклонить
                  </button>
                </div>
              )}

              {r.status !== 'open' && r.resolver_username && (
                <p className="report-card__resolver">
                  Закрыл: {r.resolver_username} · {new Date(r.resolved_at).toLocaleString('ru-RU')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default AdminReportsPage;
