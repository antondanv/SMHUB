import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  bulkModerate,
  getModerationHistory,
  getModerationQueue,
  moderateMaterial,
} from '../api/materialsApi';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/useAuth';
import { useReferenceData } from '../context/useReferenceData';
import { formatMaterialDate, formatMaterialFileSize } from '../utils/materials';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'На проверке' },
  { value: 'published', label: 'Опубликованные' },
  { value: 'rejected', label: 'Отклонённые' },
  { value: 'archived', label: 'Архивные' },
];

const ACTION_LABELS = {
  approved: 'Одобрен',
  rejected: 'Отклонён',
  returned: 'Возвращён на доработку',
};

function HistoryTimeline({ history }) {
  if (!history || history.length === 0) {
    return <p className="profile-muted">История решений пуста.</p>;
  }
  return (
    <ol className="mod-timeline">
      {history.map((entry) => (
        <li key={entry.id} className={`mod-timeline__item mod-timeline__item--${entry.action}`}>
          <span className="mod-timeline__action">{ACTION_LABELS[entry.action] || entry.action}</span>
          <span className="mod-timeline__meta">
            {entry.actor_full_name || entry.actor_username || 'Система'} ·{' '}
            {formatMaterialDate(entry.created_at)}
          </span>
          {entry.comment && <p className="mod-timeline__comment">{entry.comment}</p>}
        </li>
      ))}
    </ol>
  );
}

function FilePreview({ material }) {
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const fileUrl = `${backendUrl}/materials/${material.id}/file`;
  const isPdf = material.mime_type === 'application/pdf' || material.file_name?.endsWith('.pdf');

  if (isPdf) {
    return (
      <div className="mod-preview">
        <embed src={fileUrl} type="application/pdf" className="mod-preview__embed" />
      </div>
    );
  }

  return (
    <div className="mod-preview mod-preview--no-embed">
      <p className="profile-muted">Предпросмотр недоступен для этого типа файла.</p>
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="button button--ghost">
        Открыть файл ↗
      </a>
    </div>
  );
}

const ModerationPage = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { subjects } = useReferenceData();
  const [searchParams, setSearchParams] = useSearchParams();

  const [materials, setMaterials] = useState([]);
  const [total, setTotal] = useState(0);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [activeMaterialId, setActiveMaterialId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const statusFilter = searchParams.get('status') || 'pending';
  const subjectFilter = searchParams.get('subject_id') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';

  const hasModerationAccess = user?.role_name === 'admin' || user?.role === 'admin';
  const activeMaterial = materials.find((m) => m.id === activeMaterialId) || null;
  const allSelected = materials.length > 0 && selected.size === materials.length;

  function updateFilter(key, value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }

  useEffect(() => {
    if (!isAuthenticated || !hasModerationAccess) return;

    let isActive = true;
    setIsPageLoading(true);
    setError('');
    setSelected(new Set());

    const params = { status: statusFilter };
    if (subjectFilter) params.subject_id = subjectFilter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    getModerationQueue(params)
      .then((data) => {
        if (!isActive) return;
        setMaterials(data.items);
        setTotal(data.total);
        setActiveMaterialId(data.items[0]?.id || null);
      })
      .catch(() => {
        if (isActive) setError('Не удалось загрузить очередь модерации.');
      })
      .finally(() => {
        if (isActive) setIsPageLoading(false);
      });

    return () => { isActive = false; };
  }, [isAuthenticated, hasModerationAccess, statusFilter, subjectFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!activeMaterialId) { setHistory(null); return; }
    setHistoryLoading(true);
    getModerationHistory(activeMaterialId)
      .then((data) => setHistory(data.entries))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
    setRejectComment('');
  }, [activeMaterialId]);

  async function handleAction(nextStatus) {
    if (!activeMaterial) return;
    if (nextStatus === 'rejected' && !rejectComment.trim()) {
      setError('Укажите причину отклонения.');
      return;
    }
    setPendingAction(nextStatus);
    setError('');
    setSuccess('');
    try {
      await moderateMaterial(activeMaterial.id, nextStatus, rejectComment.trim() || null);
      const next = materials.filter((m) => m.id !== activeMaterial.id);
      setMaterials(next);
      setTotal((t) => t - 1);
      setActiveMaterialId(next[0]?.id || null);
      setSuccess(`Статус материала «${activeMaterial.title}» изменён.`);
      setRejectComment('');
    } catch {
      setError('Не удалось изменить статус материала.');
    } finally {
      setPendingAction('');
    }
  }

  async function handleBulkAction(action) {
    if (selected.size === 0) return;
    if (action === 'rejected' && !rejectComment.trim()) {
      setError('Укажите причину для массового отклонения.');
      return;
    }
    setPendingAction(`bulk-${action}`);
    setError('');
    setSuccess('');
    try {
      const result = await bulkModerate([...selected], action, rejectComment.trim() || null);
      setMaterials((prev) => prev.filter((m) => !selected.has(m.id)));
      setTotal((t) => t - result.updated);
      setSelected(new Set());
      setActiveMaterialId(null);
      setSuccess(`Обновлено: ${result.updated}. Пропущено: ${result.skipped}.`);
      setRejectComment('');
    } catch {
      setError('Не удалось выполнить массовое действие.');
    } finally {
      setPendingAction('');
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(materials.map((m) => m.id)));
    }
  }

  if (!isLoading && !isAuthenticated) return <Navigate to="/login" replace />;

  if (!isLoading && isAuthenticated && !hasModerationAccess) {
    return (
      <section className="page-shell">
        <div className="empty-state">
          <p className="caps-label">Недостаточно прав</p>
          <h1>Доступ к модерации открыт только администратору.</h1>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="page-shell">
        <p className="profile-muted">Загрузка...</p>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div>
          <p className="caps-label">Рабочее место</p>
          <h1>Модерация материалов</h1>
          <p className="hero-copy">Найдено: {total}</p>
        </div>
      </div>

      {error && <div className="inline-alert inline-alert--warning">{error}</div>}
      {success && <div className="inline-alert">{success}</div>}

      <div className="mod-layout">
        <aside className="mod-sidebar surface-card">
          <div className="mod-filters">
            <label className="field-group">
              <span>Статус</span>
              <select value={statusFilter} onChange={(e) => updateFilter('status', e.target.value)}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span>Предмет</span>
              <select value={subjectFilter} onChange={(e) => updateFilter('subject_id', e.target.value)}>
                <option value="">Все</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>

            <label className="field-group">
              <span>Дата с</span>
              <input type="date" value={dateFrom} onChange={(e) => updateFilter('date_from', e.target.value)} />
            </label>

            <label className="field-group">
              <span>Дата по</span>
              <input type="date" value={dateTo} onChange={(e) => updateFilter('date_to', e.target.value)} />
            </label>
          </div>

          {selected.size > 0 && (
            <div className="mod-bulk-bar">
              <span>{selected.size} выбрано</span>
              <button
                type="button"
                className="button button--primary"
                disabled={Boolean(pendingAction)}
                onClick={() => handleBulkAction('published')}
              >
                Одобрить все
              </button>
              <button
                type="button"
                className="button button--secondary"
                disabled={Boolean(pendingAction)}
                onClick={() => handleBulkAction('rejected')}
              >
                Отклонить все
              </button>
            </div>
          )}

          <div className="section-heading section-heading--compact">
            <p className="caps-label">Очередь · {total}</p>
          </div>

          {isPageLoading ? (
            <p className="profile-muted">Загрузка...</p>
          ) : materials.length === 0 ? (
            <p className="profile-muted">Нет материалов по выбранным фильтрам.</p>
          ) : (
            <div className="queue-list">
              <label className="queue-select-all">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                <span>Выбрать все</span>
              </label>
              {materials.map((m) => (
                <div
                  key={m.id}
                  className={`queue-item${m.id === activeMaterialId ? ' is-active' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="queue-item__check"
                    checked={selected.has(m.id)}
                    onChange={() => toggleSelect(m.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    className="queue-item__body"
                    onClick={() => setActiveMaterialId(m.id)}
                  >
                    <div className="queue-item__head">
                      <strong>{m.title}</strong>
                      <StatusBadge status={m.status} />
                    </div>
                    <p>{m.subject?.name}</p>
                    <span>
                      {m.author?.full_name || m.author?.username} ·{' '}
                      {formatMaterialDate(m.created_at)}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        <div className="mod-detail surface-card">
          {!activeMaterial ? (
            <div className="empty-state">
              <p className="caps-label">Выберите материал</p>
              <h2>Нажмите на элемент в очереди слева.</h2>
            </div>
          ) : (
            <>
              <div className="section-heading">
                <p className="caps-label">Материал #{activeMaterial.id}</p>
                <h2>{activeMaterial.title}</h2>
                <p className="hero-copy">
                  {activeMaterial.description || 'Описание не добавлено.'}
                </p>
              </div>

              <div className="meta-list meta-list--wide">
                <div><dt>Предмет</dt><dd>{activeMaterial.subject?.name}</dd></div>
                <div><dt>Тип</dt><dd>{activeMaterial.material_type?.name}</dd></div>
                <div><dt>Автор</dt><dd>{activeMaterial.author?.full_name || activeMaterial.author?.username}</dd></div>
                <div><dt>Курс</dt><dd>{activeMaterial.course?.name}</dd></div>
                <div><dt>Файл</dt><dd>{activeMaterial.file_name} · {formatMaterialFileSize(activeMaterial.file_size)}</dd></div>
                <div><dt>Загружен</dt><dd>{formatMaterialDate(activeMaterial.created_at)}</dd></div>
              </div>

              <FilePreview material={activeMaterial} />

              <label className="field-group mod-reject-comment">
                <span>Причина решения {statusFilter === 'pending' ? '(обязательно при отклонении)' : ''}</span>
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  rows={3}
                  placeholder="Опишите причину решения..."
                />
              </label>

              <div className="action-row action-row--moderation">
                <button
                  className="button button--primary"
                  type="button"
                  disabled={Boolean(pendingAction)}
                  onClick={() => handleAction('published')}
                >
                  {pendingAction === 'published' ? 'Публикуем...' : 'Одобрить'}
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={Boolean(pendingAction)}
                  onClick={() => handleAction('rejected')}
                >
                  {pendingAction === 'rejected' ? 'Отклоняем...' : 'Отклонить'}
                </button>
                <button
                  className="button button--ghost"
                  type="button"
                  disabled={Boolean(pendingAction)}
                  onClick={() => handleAction('archived')}
                >
                  {pendingAction === 'archived' ? 'Архивируем...' : 'В архив'}
                </button>
              </div>

              <div className="mod-history">
                <h3>История решений</h3>
                {historyLoading ? (
                  <p className="profile-muted">Загрузка истории...</p>
                ) : (
                  <HistoryTimeline history={history} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default ModerationPage;
