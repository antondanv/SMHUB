import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteMaterial, getMaterialById } from '../api/materialsApi';
import { useAuth } from '../context/useAuth';

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${bytes} Б`;
}

function getFileType(fileName) {
  if (!fileName) return '';
  return fileName.split('.').pop().toUpperCase();
}

const MaterialDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [material, setMaterial] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

    getMaterialById(id)
      .then((data) => {
        if (isActive) setMaterial(data);
      })
      .catch((err) => {
        if (isActive) setError(err);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <section className="page-shell">
        <div className="catalog-state">
          <p>Загрузка...</p>
        </div>
      </section>
    );
  }

  if (error || !material) {
    return (
      <section className="page-shell">
        <div className="empty-state">
          <p className="caps-label">Материал не найден</p>
          <h1>Такой страницы не существует.</h1>
          <p>Проверьте ссылку или вернитесь в каталог.</p>
          <Link className="button button--primary" to="/materials">
            Перейти в каталог
          </Link>
        </div>
      </section>
    );
  }

  const canEdit =
    user &&
    (user.id === material.author_id ||
      user.role === 'admin' ||
      user.role === 'moderator');

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteMaterial(id);
      navigate('/materials');
    } catch {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <section className="page-shell">
      <div className="detail-stitch-layout">
        <div className="detail-stitch-main">
          <div className="detail-header-card">
            <div className="detail-header-card__head">
              <div>
                <div className="detail-inline-meta">
                  <span className="status-inline">{material.status}</span>
                  <span>{material.views_count} просмотров</span>
                </div>
                <h1>{material.title}</h1>
                <p className="hero-copy">{material.description}</p>
              </div>

              <div className="detail-actions detail-actions--stack">
                <button className="button button--primary" type="button">
                  Скачать
                </button>
                <button className="button button--secondary" type="button">
                  Сохранить
                </button>
                {canEdit && (
                  <>
                    <Link
                      className="button button--ghost"
                      to={`/materials/${id}/edit`}
                    >
                      Редактировать
                    </Link>
                    <button
                      className="button button--danger"
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Удалить
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {showDeleteConfirm && (
            <div className="surface-card">
              <p>Вы уверены, что хотите удалить материал? Это действие необратимо.</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  className="button button--danger"
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  {isDeleting ? 'Удаление...' : 'Да, удалить'}
                </button>
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          <div className="preview-card">
            <div className="preview-card__toolbar">
              <div className="preview-card__file">
                <span>{getFileType(material.file_name)}</span>
                <strong>{material.file_name}</strong>
              </div>
            </div>

            <div className="preview-card__canvas">
              <div className="preview-page">
                <div className="preview-line preview-line--title" />
                <div className="preview-line" />
                <div className="preview-line" />
                <div className="preview-line preview-line--short" />
                <div className="preview-block" />
              </div>
            </div>
          </div>

          <div className="surface-card">
            <div className="section-heading section-heading--compact">
              <h2>Отзывы и обсуждение</h2>
            </div>

            <div className="comment-compose">
              <div className="header-avatar">U</div>
              <div className="comment-compose__form">
                <textarea placeholder="Добавьте комментарий или вопрос..." rows={4} />
                <div className="comment-compose__actions">
                  <button className="button button--primary" type="button">
                    Отправить
                  </button>
                </div>
              </div>
            </div>

            <div className="comment-list">
              <div className="empty-inline">Пока нет комментариев.</div>
            </div>
          </div>
        </div>

        <aside className="detail-sidebar">
          <div className="surface-card detail-meta-card">
            <div className="section-heading section-heading--compact">
              <h2>Детали</h2>
            </div>
            <dl className="meta-list">
              <div>
                <dt>Автор</dt>
                <dd>{material.author?.full_name || '—'}</dd>
              </div>
              <div>
                <dt>Курс</dt>
                <dd>{material.course?.name || '—'}</dd>
              </div>
              <div>
                <dt>Предмет</dt>
                <dd>{material.subject?.name || '—'}</dd>
              </div>
              <div>
                <dt>Направление</dt>
                <dd>{material.program?.name || '—'}</dd>
              </div>
              <div>
                <dt>Тип</dt>
                <dd>
                  {getFileType(material.file_name)} · {material.material_type?.name || '—'}
                </dd>
              </div>
              <div>
                <dt>Размер</dt>
                <dd>{formatFileSize(material.file_size)}</dd>
              </div>
              <div>
                <dt>Дата добавления</dt>
                <dd>{formatDate(material.created_at)}</dd>
              </div>
            </dl>

            <div className="detail-stat-cards">
              <div>
                <span>Просмотры</span>
                <strong>{material.views_count}</strong>
              </div>
              <div>
                <span>Скачивания</span>
                <strong>{material.downloads_count}</strong>
              </div>
              <div>
                <span>Лайки</span>
                <strong>{material.likes_count}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default MaterialDetailPage;
