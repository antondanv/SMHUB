import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { getAuditLog } from '../api/adminApi';
import { useAuth } from '../context/useAuth';
import { isAdminUser } from '../utils/auth';

const ACTION_LABELS = {
  'user.role.change': 'Смена роли',
  'user.active.change': 'Блокировка / разблокировка',
  'report.resolved': 'Жалоба решена',
  'report.dismissed': 'Жалоба отклонена',
  'report.open': 'Жалоба открыта',
  'material.moderate.published': 'Модерация: одобрено',
  'material.moderate.rejected': 'Модерация: отклонено',
  'material.moderate.archived': 'Модерация: в архив',
  'material.moderate.pending': 'Модерация: возвращено',
  'reference.subject.create': 'Справочник: создание предмета',
  'reference.subject.update': 'Справочник: правка предмета',
  'reference.subject.delete': 'Справочник: удаление предмета',
  'reference.material_type.create': 'Справочник: создание типа',
  'reference.material_type.update': 'Справочник: правка типа',
  'reference.material_type.delete': 'Справочник: удаление типа',
  'reference.course.create': 'Справочник: создание курса',
  'reference.course.update': 'Справочник: правка курса',
  'reference.course.delete': 'Справочник: удаление курса',
  'reference.program.create': 'Справочник: создание направления',
  'reference.program.update': 'Справочник: правка направления',
  'reference.program.delete': 'Справочник: удаление направления',
};

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ru-RU');
}

const AdminAuditPage = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isAdmin = isAdminUser(user);

  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  const actorId = searchParams.get('actor_id') || '';
  const action = searchParams.get('action') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  const page = Number(searchParams.get('page') || '1');

  function setParam(key, value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  }

  useEffect(() => {
    if (!isAdmin) return;
    setIsLoading(true);
    setError('');
    const params = { page, per_page: 50 };
    if (actorId) params.actor_id = actorId;
    if (action) params.action = action;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    getAuditLog(params)
      .then((data) => {
        setEntries(data.items);
        setTotal(data.total);
        setTotalPages(data.total_pages);
      })
      .catch(() => setError('Не удалось загрузить аудит-лог.'))
      .finally(() => setIsLoading(false));
  }, [isAdmin, actorId, action, dateFrom, dateTo, page]);

  if (!isAuthLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAuthLoading && isAuthenticated && !isAdmin) {
    return (
      <section className="page-shell">
        <div className="empty-state">
          <p className="caps-label">Недостаточно прав</p>
          <h1>Аудит-лог доступен только администратору.</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div>
          <p className="caps-label">Администрирование</p>
          <h1>Аудит-лог</h1>
          <p className="hero-copy">
            Список ключевых действий администратора: смена ролей, блокировки, изменения справочников
            и решения по жалобам. Записи иммутабельны.
          </p>
        </div>
      </div>

      <div className="surface-card surface-card--single">
        <div className="section-heading section-heading--compact">
          <p className="caps-label">Фильтры</p>
          <h2>Найдите нужную запись</h2>
        </div>

        <div className="audit-filters">
          <label>
            <span>ID администратора</span>
            <input
              type="number"
              min="1"
              value={actorId}
              onChange={(e) => setParam('actor_id', e.target.value)}
              placeholder="Например: 1"
            />
          </label>
          <label>
            <span>Префикс действия</span>
            <input
              type="search"
              value={action}
              onChange={(e) => setParam('action', e.target.value)}
              placeholder="user.role, reference.subject..."
            />
          </label>
          <label>
            <span>С</span>
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => setParam('date_from', e.target.value)}
            />
          </label>
          <label>
            <span>По</span>
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => setParam('date_to', e.target.value)}
            />
          </label>
        </div>
      </div>

      {error && <div className="inline-alert inline-alert--warning">{error}</div>}

      <div className="surface-card surface-card--single">
        <div className="section-heading section-heading--row">
          <div>
            <p className="caps-label">Журнал</p>
            <h2>{total} записей</h2>
          </div>
        </div>

        {isLoading ? (
          <p className="profile-muted">Загрузка...</p>
        ) : entries.length === 0 ? (
          <div className="empty-inline">Записей под фильтр пока нет.</div>
        ) : (
          <div className="audit-list">
            {entries.map((entry) => (
              <div key={entry.id} className="audit-entry">
                <div className="audit-entry__head">
                  <div>
                    <strong>{ACTION_LABELS[entry.action] || entry.action}</strong>
                    <span className="audit-entry__code">{entry.action}</span>
                  </div>
                  <span className="audit-entry__time">{formatDateTime(entry.created_at)}</span>
                </div>
                <div className="audit-entry__meta">
                  <span>
                    Админ: {entry.actor_username || `#${entry.actor_id || '—'}`}
                  </span>
                  {entry.target_type && (
                    <span>
                      Цель: {entry.target_type}
                      {entry.target_id != null ? ` #${entry.target_id}` : ''}
                    </span>
                  )}
                  {entry.ip && <span>IP: {entry.ip}</span>}
                </div>
                {entry.payload && (
                  <details
                    open={expanded === entry.id}
                    onToggle={(e) => setExpanded(e.target.open ? entry.id : null)}
                  >
                    <summary>Подробности</summary>
                    <pre className="audit-entry__payload">
                      {JSON.stringify(entry.payload, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="action-row">
            <button
              type="button"
              className="button button--ghost"
              disabled={page <= 1}
              onClick={() => setParam('page', String(page - 1))}
            >
              Назад
            </button>
            <span className="profile-muted">Страница {page} из {totalPages}</span>
            <button
              type="button"
              className="button button--ghost"
              disabled={page >= totalPages}
              onClick={() => setParam('page', String(page + 1))}
            >
              Вперёд
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminAuditPage;
