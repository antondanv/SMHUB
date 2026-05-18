import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getModerationQueue, moderateMaterial } from '../api/materialsApi';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/useAuth';
import { formatMaterialDate, formatMaterialFileSize } from '../utils/materials';

function getErrorMessage(error, fallbackMessage) {
  const detail = error.response?.data?.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  return fallbackMessage;
}

const ModerationPage = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [activeMaterialId, setActiveMaterialId] = useState(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hasModerationAccess = user?.role_name === 'moderator' || user?.role_name === 'admin';
  const activeMaterial = materials.find((material) => material.id === activeMaterialId) || null;

  useEffect(() => {
    if (!isAuthenticated || !hasModerationAccess) {
      return;
    }

    let isActive = true;

    async function loadQueue() {
      setIsPageLoading(true);
      setError('');

      try {
        const response = await getModerationQueue();

        if (!isActive) {
          return;
        }

        setMaterials(response.items);
        setActiveMaterialId(response.items[0]?.id || null);
      } catch (requestError) {
        if (isActive) {
          setError(
            getErrorMessage(
              requestError,
              'Не удалось загрузить очередь модерации.'
            )
          );
        }
      } finally {
        if (isActive) {
          setIsPageLoading(false);
        }
      }
    }

    loadQueue();

    return () => {
      isActive = false;
    };
  }, [hasModerationAccess, isAuthenticated]);

  async function handleModerationAction(nextStatus) {
    if (!activeMaterial) {
      return;
    }

    setPendingAction(nextStatus);
    setError('');
    setSuccess('');

    try {
      const updatedMaterial = await moderateMaterial(activeMaterial.id, nextStatus);
      const nextMaterials = materials.filter((material) => material.id !== activeMaterial.id);

      setMaterials(nextMaterials);
      setActiveMaterialId(nextMaterials[0]?.id || null);
      setSuccess(`Материал "${updatedMaterial.title}" получил статус "${updatedMaterial.status}".`);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Не удалось изменить статус материала.'
        )
      );
    } finally {
      setPendingAction('');
    }
  }

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isLoading && isAuthenticated && !hasModerationAccess) {
    return (
      <section className="page-shell">
        <div className="empty-state">
          <p className="caps-label">Недостаточно прав</p>
          <h1>Доступ к модерации открыт только модератору или администратору.</h1>
          <p>Если это ошибка, проверьте назначенную роль пользователя в системе.</p>
        </div>
      </section>
    );
  }

  if (isLoading || isPageLoading) {
    return (
      <section className="page-shell">
        <div className="surface-card surface-card--single">
          <p className="profile-muted">Загружаем очередь модерации...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div>
          <p className="caps-label">Рабочее место модератора</p>
          <h1>Модерация материалов</h1>
          <p className="hero-copy">
            Проверяйте pending-материалы, подтверждайте публикацию и снимайте спорные файлы с
            общего доступа.
          </p>
        </div>
      </div>

      {error && <div className="inline-alert inline-alert--warning">{error}</div>}
      {success && <div className="inline-alert">{success}</div>}

      <div className="moderation-layout">
        <aside className="surface-card surface-card--queue">
          <div className="section-heading section-heading--compact">
            <p className="caps-label">Очередь</p>
            <h2>{materials.length} материала на проверке</h2>
          </div>

          {materials.length === 0 ? (
            <div className="empty-inline">Очередь модерации сейчас пуста.</div>
          ) : (
            <div className="queue-list">
              {materials.map((material) => (
                <button
                  key={material.id}
                  type="button"
                  className={`queue-item${material.id === activeMaterialId ? ' is-active' : ''}`}
                  onClick={() => setActiveMaterialId(material.id)}
                >
                  <div className="queue-item__head">
                    <strong>{material.title}</strong>
                    <StatusBadge status={material.status} />
                  </div>
                  <p>{material.subject.name}</p>
                  <span>
                    {material.author.full_name} · {formatMaterialDate(material.created_at)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="surface-card surface-card--moderation">
          {activeMaterial ? (
            <>
              <div className="section-heading">
                <p className="caps-label">Активный материал</p>
                <h2>{activeMaterial.title}</h2>
                <p className="hero-copy">
                  {activeMaterial.description || 'Описание пока не добавлено автором.'}
                </p>
              </div>

              <div className="meta-list meta-list--wide">
                <div>
                  <dt>Предмет</dt>
                  <dd>{activeMaterial.subject.name}</dd>
                </div>
                <div>
                  <dt>Тип</dt>
                  <dd>{activeMaterial.material_type.name}</dd>
                </div>
                <div>
                  <dt>Автор</dt>
                  <dd>{activeMaterial.author.full_name}</dd>
                </div>
                <div>
                  <dt>Курс</dt>
                  <dd>{activeMaterial.course.name}</dd>
                </div>
                <div>
                  <dt>Направление</dt>
                  <dd>{activeMaterial.program.code} - {activeMaterial.program.name}</dd>
                </div>
                <div>
                  <dt>Файл</dt>
                  <dd>
                    {activeMaterial.file_name} · {formatMaterialFileSize(activeMaterial.file_size)}
                  </dd>
                </div>
              </div>

              <div className="inline-alert">
                Перед публикацией проверьте соответствие предмету, полноту описания и пригодность
                файла для общего каталога.
              </div>

              <div className="action-row action-row--moderation">
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => handleModerationAction('published')}
                  disabled={Boolean(pendingAction)}
                >
                  {pendingAction === 'published' ? 'Публикуем...' : 'Одобрить'}
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => handleModerationAction('rejected')}
                  disabled={Boolean(pendingAction)}
                >
                  {pendingAction === 'rejected' ? 'Отклоняем...' : 'Отклонить'}
                </button>
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => handleModerationAction('archived')}
                  disabled={Boolean(pendingAction)}
                >
                  {pendingAction === 'archived' ? 'Архивируем...' : 'Отправить в архив'}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p className="caps-label">Все обработано</p>
              <h1>Новых pending-материалов пока нет.</h1>
              <p>Когда авторы отправят новые файлы на проверку, они появятся в этой очереди.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ModerationPage;
