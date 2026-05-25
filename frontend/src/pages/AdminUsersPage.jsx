import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  approveRoleRequest,
  deleteAdminUser,
  getAdminUser,
  getAdminUsers,
  rejectRoleRequest,
  updateAdminUser,
} from '../api/adminApi';
import { useAuth } from '../context/useAuth';
import { isAdminUser } from '../utils/auth';

function ConfirmModal({ title, message, confirmLabel = 'Подтвердить', danger = false, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        {title ? <h3>{title}</h3> : null}
        <p>{message}</p>
        <div className="action-row">
          <button
            type="button"
            className={danger ? 'button button--danger' : 'button button--primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button type="button" className="button button--ghost" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

const ROLE_LABELS = {
  admin: 'Администратор',
  teacher: 'Преподаватель',
  student: 'Студент',
};

const AdminUsersPage = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activeUserId, setActiveUserId] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [pendingAction, setPendingAction] = useState(null);
  const [modal, setModal] = useState(null);

  const isAdmin = isAdminUser(user);

  const search = searchParams.get('search') || '';
  const roleFilter = searchParams.get('role') || '';
  const activeFilter = searchParams.get('is_active') || '';
  const requestFilter = searchParams.get('has_role_request') || '';
  const page = Number(searchParams.get('page') || '1');

  function updateFilter(key, value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    });
  }

  useEffect(() => {
    if (!isAdmin) return;

    async function loadUsers() {
      setIsLoading(true);
      setError('');
      const params = { page, per_page: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (activeFilter !== '') params.is_active = activeFilter === 'true';
      if (requestFilter === 'true') params.has_role_request = true;

      try {
        const data = await getAdminUsers(params);
        setUsers(data.items);
        setTotal(data.total);
        setTotalPages(data.total_pages);
      } catch {
        setError('Не удалось загрузить список пользователей.');
      } finally {
        setIsLoading(false);
      }
    }

    loadUsers();
  }, [isAdmin, search, roleFilter, activeFilter, requestFilter, page]);

  useEffect(() => {
    if (!activeUserId) {
      function resetUserDetail() {
        setActiveUser(null);
      }

      resetUserDetail();
      return;
    }

    async function loadUserDetail() {
      setDetailLoading(true);
      try {
        setActiveUser(await getAdminUser(activeUserId));
      } catch {
        setActiveUser(null);
      } finally {
        setDetailLoading(false);
      }
    }

    loadUserDetail();
  }, [activeUserId]);

  function askAction(action) {
    const name = activeUser?.full_name || activeUser?.username;
    const requested = activeUser?.requested_role;
    const requestedLabel = ROLE_LABELS[requested] || requested || 'роль';
    const messages = {
      'make-admin': `Назначить ${name} администратором?`,
      'make-student': `Снять права администратора у ${name}?`,
      'approve-role': `Одобрить заявку ${name} на роль «${requestedLabel}»?`,
      'reject-role': `Отклонить заявку ${name} на роль «${requestedLabel}»?`,
      'deactivate': `Заблокировать ${name}? Пользователь не сможет входить.`,
      'activate': `Разблокировать ${name}?`,
      'delete':
        `Безвозвратно удалить ${name} из базы данных? ` +
        `Вместе с аккаунтом будут удалены все его материалы (${activeUser?.materials_total ?? 0}) ` +
        'и реакции на них. Это действие нельзя отменить.',
    };
    setModal({
      action,
      title: action === 'delete' ? 'Удаление пользователя' : undefined,
      message: messages[action],
      danger: action === 'delete',
      confirmLabel: action === 'delete' ? 'Удалить навсегда' : 'Подтвердить',
    });
  }

  async function executeAction() {
    if (!modal || !activeUserId) return;
    const { action } = modal;
    setModal(null);
    setPendingAction(action);
    setError('');
    setSuccess('');

    if (action === 'delete') {
      try {
        const deletedName = activeUser?.full_name || activeUser?.username;
        await deleteAdminUser(activeUserId);
        setUsers((prev) => prev.filter((u) => u.id !== activeUserId));
        setTotal((prev) => Math.max(0, prev - 1));
        setActiveUserId(null);
        setActiveUser(null);
        setSuccess(`Пользователь ${deletedName} удалён.`);
      } catch (err) {
        setError(err.response?.data?.detail || 'Не удалось удалить пользователя.');
      } finally {
        setPendingAction(null);
      }
      return;
    }

    if (action === 'approve-role' || action === 'reject-role') {
      try {
        const result =
          action === 'approve-role'
            ? await approveRoleRequest(activeUserId)
            : await rejectRoleRequest(activeUserId);
        setActiveUser((prev) =>
          prev ? { ...prev, role: result.role, requested_role: null } : prev
        );
        setUsers((prev) =>
          prev.map((u) =>
            u.id === activeUserId ? { ...u, role: result.role, requested_role: null } : u
          )
        );
        setSuccess(
          action === 'approve-role'
            ? 'Заявка на роль одобрена.'
            : 'Заявка на роль отклонена.'
        );
      } catch (err) {
        setError(err.response?.data?.detail || 'Не удалось обработать заявку.');
      } finally {
        setPendingAction(null);
      }
      return;
    }

    const payload = {};
    if (action === 'make-admin') payload.role = 'admin';
    if (action === 'make-student') payload.role = 'student';
    if (action === 'deactivate') payload.is_active = false;
    if (action === 'activate') payload.is_active = true;

    try {
      const updated = await updateAdminUser(activeUserId, payload);
      setActiveUser((prev) => prev ? { ...prev, ...updated, role: updated.role, is_active: updated.is_active } : prev);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === activeUserId ? { ...u, role: updated.role, is_active: updated.is_active } : u
        )
      );
      setSuccess('Изменения сохранены.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось выполнить действие.');
    } finally {
      setPendingAction(null);
    }
  }

  if (isAuthLoading) return <section className="page-shell"><p className="profile-muted">Загрузка...</p></section>;
  if (!isAuthenticated || !isAdmin) return <Navigate to="/" replace />;

  return (
    <section className="page-shell">
      {modal && (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          confirmLabel={modal.confirmLabel}
          danger={modal.danger}
          onConfirm={executeAction}
          onCancel={() => setModal(null)}
        />
      )}

      <div className="page-hero page-hero--compact">
        <div className="page-hero__copy">
          <p className="caps-label">Администрирование</p>
          <h1 className="page-hero__title">Пользователи</h1>
          <p className="hero-copy">Всего: {total}</p>
        </div>
      </div>

      {error && <div className="inline-alert inline-alert--warning">{error}</div>}
      {success && <div className="inline-alert">{success}</div>}

      <div className="admin-users-layout">
        <div className="surface-card">
          <div className="catalog-topbar">
            <input
              type="search"
              className="catalog-search-inline"
              placeholder="Поиск по email или username..."
              value={search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
            <select value={roleFilter} onChange={(e) => updateFilter('role', e.target.value)}>
              <option value="">Все роли</option>
              <option value="admin">Администратор</option>
              <option value="teacher">Преподаватель</option>
              <option value="student">Студент</option>
            </select>
            <select value={activeFilter} onChange={(e) => updateFilter('is_active', e.target.value)}>
              <option value="">Все статусы</option>
              <option value="true">Активные</option>
              <option value="false">Заблокированные</option>
            </select>
            <select
              value={requestFilter}
              onChange={(e) => updateFilter('has_role_request', e.target.value)}
            >
              <option value="">Все заявки</option>
              <option value="true">Только заявки на роль</option>
            </select>
          </div>

          {isLoading ? (
            <p className="profile-muted">Загрузка...</p>
          ) : users.length === 0 ? (
            <p className="profile-muted">Пользователи не найдены.</p>
          ) : (
            <table className="admin-table admin-users-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Материалов</th>
                  <th>Регистрация</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className={`admin-users-row${u.id === activeUserId ? ' is-active' : ''}`}
                    onClick={() => setActiveUserId(u.id)}
                  >
                    <td><strong>{u.full_name || u.username}</strong><br /><span className="profile-muted">@{u.username}</span></td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge role-badge--${u.role}`}>{ROLE_LABELS[u.role] || u.role}</span>
                      {u.requested_role ? (
                        <>
                          {' '}
                          <span className="role-badge role-badge--pending" title="Заявка на роль">
                            Заявка: {ROLE_LABELS[u.requested_role] || u.requested_role}
                          </span>
                        </>
                      ) : null}
                    </td>
                    <td>
                      <span className={u.is_active ? 'status-active' : 'status-blocked'}>
                        {u.is_active ? 'Активен' : 'Заблокирован'}
                      </span>
                    </td>
                    <td>{u.materials_count}</td>
                    <td>{u.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totalPages > 1 && (
            <div className="catalog-pagination">
              <button type="button" disabled={page === 1} onClick={() => updateFilter('page', String(page - 1))}>←</button>
              <span>{page} / {totalPages}</span>
              <button type="button" disabled={page === totalPages} onClick={() => updateFilter('page', String(page + 1))}>→</button>
            </div>
          )}
        </div>

        <aside className="surface-card admin-user-detail">
          {!activeUser && !detailLoading && (
            <p className="profile-muted">Выберите пользователя из таблицы.</p>
          )}
          {detailLoading && <p className="profile-muted">Загрузка...</p>}
          {activeUser && !detailLoading && (
            <>
              <div className="section-heading section-heading--compact">
                <p className="caps-label">Карточка пользователя</p>
                <h2>{activeUser.full_name || activeUser.username}</h2>
                <p className="profile-muted">@{activeUser.username} · {activeUser.email}</p>
              </div>

              <div className="metric-stack metric-stack--profile">
                <div className="metric-stack__item">
                  <strong>{activeUser.materials_published}</strong>
                  <span>Опубликовано</span>
                </div>
                <div className="metric-stack__item">
                  <strong>{activeUser.materials_pending}</strong>
                  <span>На модерации</span>
                </div>
                <div className="metric-stack__item">
                  <strong>{activeUser.materials_rejected}</strong>
                  <span>Отклонено</span>
                </div>
                <div className="metric-stack__item">
                  <strong>{activeUser.created_at?.slice(0, 10)}</strong>
                  <span>Дата регистрации</span>
                </div>
              </div>

              {activeUser.requested_role ? (
                <div className="action-row action-row--column admin-user-request">
                  <p className="profile-muted">
                    Заявка на роль: <strong>{ROLE_LABELS[activeUser.requested_role] || activeUser.requested_role}</strong>
                  </p>
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={Boolean(pendingAction)}
                    onClick={() => askAction('approve-role')}
                  >
                    Одобрить заявку
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    disabled={Boolean(pendingAction)}
                    onClick={() => askAction('reject-role')}
                  >
                    Отклонить заявку
                  </button>
                </div>
              ) : null}

              <div className="action-row action-row--column">
                {activeUser.role === 'admin' ? (
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={Boolean(pendingAction) || activeUser.id === user?.id}
                    onClick={() => askAction('make-student')}
                  >
                    Снять права администратора
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={Boolean(pendingAction)}
                    onClick={() => askAction('make-admin')}
                  >
                    Назначить администратором
                  </button>
                )}

                {activeUser.is_active ? (
                  <button
                    type="button"
                    className="button button--ghost"
                    disabled={Boolean(pendingAction) || activeUser.id === user?.id}
                    onClick={() => askAction('deactivate')}
                  >
                    Заблокировать
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button button--ghost"
                    disabled={Boolean(pendingAction)}
                    onClick={() => askAction('activate')}
                  >
                    Разблокировать
                  </button>
                )}
              </div>

              <div className="admin-user-danger">
                <p className="caps-label">Опасная зона</p>
                <p className="profile-muted">
                  Полное удаление аккаунта и всех его материалов. Действие необратимо.
                </p>
                <button
                  type="button"
                  className="button button--danger"
                  disabled={Boolean(pendingAction) || activeUser.id === user?.id}
                  onClick={() => askAction('delete')}
                >
                  {activeUser.id === user?.id ? 'Нельзя удалить себя' : 'Удалить пользователя'}
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
};

export default AdminUsersPage;
