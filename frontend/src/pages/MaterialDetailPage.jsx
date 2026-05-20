import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  addMaterialToFavorites,
  createMaterialComment,
  deleteMaterial,
  deleteMaterialComment,
  downloadMaterial,
  getMaterialById,
  getMaterialComments,
  getMaterialFileUrl,
  removeMaterialFromFavorites,
  updateMaterialComment,
} from '../api/materialsApi';
import LikeButton from '../components/LikeButton';
import RatingStars from '../components/RatingStars';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/useAuth';

function formatDate(dateString) {
  if (!dateString) {
    return 'Дата не указана';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 Б';
  }

  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const formattedSize = size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1);

  return `${formattedSize} ${units[unitIndex]}`;
}

function getFileTypeLabel(material) {
  const fileExtension = material.file_name?.split('.').pop();

  if (fileExtension) {
    return fileExtension.toUpperCase();
  }

  return 'FILE';
}

function getErrorMessage(error, fallbackMessage) {
  const detail = error.response?.data?.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  return fallbackMessage;
}

const MaterialDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const [material, setMaterial] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadPending, setIsDownloadPending] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [isViewerLoading, setIsViewerLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadMaterial() {
      setIsLoading(true);
      setError('');
      setErrorCode(null);
      setActionMessage('');
      setComments([]);

      try {
        const [materialResult, commentsResult] = await Promise.allSettled([
          getMaterialById(id),
          getMaterialComments(id),
        ]);

        if (materialResult.status !== 'fulfilled') {
          throw materialResult.reason;
        }

        if (isActive) {
          setMaterial(materialResult.value);
          setComments(commentsResult.status === 'fulfilled' ? commentsResult.value : []);
          setIsViewerLoading(true);

          if (commentsResult.status !== 'fulfilled') {
            setActionMessage(
              'Материал открыт, но обсуждение временно недоступно. Попробуйте обновить страницу позже.'
            );
          }
        }
      } catch (requestError) {
        if (isActive) {
          setErrorCode(requestError.response?.status || null);
          setError(
            getErrorMessage(
              requestError,
              'Не удалось загрузить материал. Попробуйте обновить страницу позже.'
            )
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadMaterial();

    return () => {
      isActive = false;
    };
  }, [id]);

  async function handleDownload() {
    if (!material) {
      return;
    }

    setActionMessage('');
    setIsDownloadPending(true);

    try {
      const { blob, contentType } = await downloadMaterial(material.id);
      const blobUrl = window.URL.createObjectURL(
        new Blob([blob], { type: contentType || material.mime_type })
      );
      const link = document.createElement('a');

      link.href = blobUrl;
      link.download = material.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setMaterial((currentMaterial) => ({
        ...currentMaterial,
        downloads_count: currentMaterial.downloads_count + 1,
      }));
    } catch (requestError) {
      setActionMessage(
        getErrorMessage(requestError, 'Не удалось скачать материал. Попробуйте позже.')
      );
    } finally {
      setIsDownloadPending(false);
    }
  }

  async function handleToggleFavorite() {
    if (!material) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setActionMessage('');
    setIsFavoritePending(true);

    try {
      const response = material.is_favorite
        ? await removeMaterialFromFavorites(material.id)
        : await addMaterialToFavorites(material.id);

      setMaterial((currentMaterial) => ({
        ...currentMaterial,
        is_favorite: response.is_favorite,
        favorites_count: response.favorites_count,
      }));
    } catch (requestError) {
      setActionMessage(
        getErrorMessage(
          requestError,
          'Не удалось обновить избранное. Попробуйте позже.'
        )
      );
    } finally {
      setIsFavoritePending(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setActionMessage('');
    try {
      await deleteMaterial(id);
      navigate('/materials');
    } catch (requestError) {
      setActionMessage(
        getErrorMessage(requestError, 'Не удалось удалить материал.')
      );
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();

    if (!commentDraft.trim()) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setActionMessage('');
    setIsCommentSubmitting(true);

    try {
      const createdComment = await createMaterialComment(id, commentDraft.trim());

      setComments((currentComments) => [...currentComments, createdComment]);
      setMaterial((currentMaterial) => ({
        ...currentMaterial,
        comments_count: currentMaterial.comments_count + 1,
      }));
      setCommentDraft('');
    } catch (requestError) {
      setActionMessage(
        getErrorMessage(
          requestError,
          'Не удалось отправить комментарий. Попробуйте позже.'
        )
      );
    } finally {
      setIsCommentSubmitting(false);
    }
  }

  function startEditingComment(comment) {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
    setActionMessage('');
  }

  function cancelEditingComment() {
    setEditingCommentId(null);
    setEditingContent('');
  }

  async function handleCommentUpdate(commentId) {
    if (!editingContent.trim()) {
      return;
    }

    setActionMessage('');

    try {
      const updatedComment = await updateMaterialComment(commentId, editingContent.trim());

      setComments((currentComments) =>
        currentComments.map((comment) => (comment.id === commentId ? updatedComment : comment))
      );
      cancelEditingComment();
    } catch (requestError) {
      setActionMessage(
        getErrorMessage(
          requestError,
          'Не удалось сохранить изменения комментария.'
        )
      );
    }
  }

  async function handleCommentDelete(commentId) {
    setActionMessage('');

    try {
      await deleteMaterialComment(commentId);
      setComments((currentComments) =>
        currentComments.filter((comment) => comment.id !== commentId)
      );
      setMaterial((currentMaterial) => ({
        ...currentMaterial,
        comments_count: Math.max(currentMaterial.comments_count - 1, 0),
      }));
    } catch (requestError) {
      setActionMessage(
        getErrorMessage(
          requestError,
          'Не удалось удалить комментарий.'
        )
      );
    }
  }

  if (isLoading || isAuthLoading) {
    return (
      <section className="page-shell">
        <div className="surface-card surface-card--single">
          <p className="profile-muted">Загружаем материал...</p>
        </div>
      </section>
    );
  }

  if (!material) {
    return (
      <section className="page-shell">
        <div className="empty-state">
          <p className="caps-label">
            {errorCode === 404 ? 'Материал не найден' : 'Материал недоступен'}
          </p>
          <h1>
            {errorCode === 403
              ? 'У вас нет доступа к этому материалу.'
              : 'Не удалось открыть страницу материала.'}
          </h1>
          <p>{error}</p>
          <Link className="button button--primary" to="/materials">
            Перейти в каталог
          </Link>
        </div>
      </section>
    );
  }

  const canEdit =
    !!user &&
    (user.id === material.author?.id ||
      user.role_name === 'admin' ||
      user.role === 'admin');
  const viewerUrl = getMaterialFileUrl(material.id);

  return (
    <section className="page-shell">
      <div className="detail-stitch-layout">
        <div className="detail-stitch-main">
          <div className="detail-header-card">
            <div className="detail-header-card__head">
              <div>
                <div className="detail-inline-meta">
                  <StatusBadge status={material.status} />
                  <span>{material.views_count} просмотров</span>
                </div>
                <h1>{material.title}</h1>
                <p className="hero-copy">
                  {material.description || 'Автор пока не добавил описание к этому материалу.'}
                </p>
              </div>

              <div className="detail-actions detail-actions--stack">
                <button
                  className="button button--primary"
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloadPending}
                >
                  {isDownloadPending ? 'Скачиваем...' : 'Скачать'}
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={handleToggleFavorite}
                  disabled={isFavoritePending}
                >
                  {material.is_favorite ? 'Убрать из избранного' : 'Сохранить'}
                </button>
                <LikeButton
                  materialId={material.id}
                  initialCount={material.likes_count}
                  initialIsLiked={material.is_liked}
                />
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

          {actionMessage && <div className="inline-alert inline-alert--warning">{actionMessage}</div>}

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

          <div className="preview-card" id="material-preview">
            <div className="preview-card__toolbar">
              <div className="preview-card__file">
                <span>{getFileTypeLabel(material)}</span>
                <strong>{material.file_name}</strong>
              </div>
              <div className="preview-card__controls">
                <span>{formatFileSize(material.file_size)}</span>
              </div>
            </div>

            <div className="preview-card__canvas">
              <div className="material-viewer-shell">
                {isViewerLoading && (
                  <div className="preview-page preview-page--loading">
                    <div className="section-heading section-heading--compact">
                      <h2>Открываем встроенный viewer</h2>
                    </div>
                    <p>
                      Файл загружается прямо в страницу. Если браузер не покажет PDF,
                      материал всё равно можно скачать кнопкой выше.
                    </p>
                    <div className="preview-line preview-line--title" />
                    <div className="preview-line" />
                    <div className="preview-line" />
                    <div className="preview-line preview-line--short" />
                    <div className="preview-block" />
                  </div>
                )}
                <iframe
                  src={viewerUrl}
                  title={material.title}
                  className="material-viewer"
                  onLoad={() => setIsViewerLoading(false)}
                />
                <p className="profile-muted material-viewer__fallback">
                  Если встроенный просмотрщик не отображается, используйте кнопку
                  «Скачать».
                </p>
              </div>
            </div>
          </div>

          <div className="surface-card">
            <div className="section-heading section-heading--compact">
              <h2>Отзывы и обсуждение</h2>
            </div>

            <div className="rating-summary">
              <RatingStars
                materialId={material.id}
                initialAvg={material.avg_rating}
                initialCount={material.ratings_count}
                initialUserRating={material.user_rating}
              />
            </div>

            <div className="comment-compose">
              <div className="header-avatar">
                {user?.first_name?.[0] || user?.username?.[0] || 'U'}
              </div>
              <form className="comment-compose__form" onSubmit={handleCommentSubmit}>
                <textarea
                  placeholder={
                    isAuthenticated
                      ? 'Добавьте комментарий или вопрос...'
                      : 'Войдите, чтобы оставить комментарий.'
                  }
                  rows={4}
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  disabled={!isAuthenticated || isCommentSubmitting}
                />
                <div className="comment-compose__actions">
                  <button className="button button--primary" type="submit" disabled={!isAuthenticated || isCommentSubmitting}>
                    {isCommentSubmitting ? 'Отправляем...' : 'Отправить'}
                  </button>
                </div>
              </form>
            </div>

            <div className="comment-list">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <article className="comment-card" key={comment.id}>
                    <div className="comment-card__head">
                      <strong>{comment.author.full_name}</strong>
                      <span>{formatDate(comment.updated_at || comment.created_at)}</span>
                    </div>

                    {editingCommentId === comment.id ? (
                      <>
                        <textarea
                          rows={4}
                          value={editingContent}
                          onChange={(event) => setEditingContent(event.target.value)}
                        />
                        <div className="comment-compose__actions">
                          <button
                            className="button button--primary"
                            type="button"
                            onClick={() => handleCommentUpdate(comment.id)}
                          >
                            Сохранить
                          </button>
                          <button
                            className="button button--ghost"
                            type="button"
                            onClick={cancelEditingComment}
                          >
                            Отменить
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p>{comment.content}</p>
                        {comment.can_edit && (
                          <div className="comment-compose__actions">
                            <button
                              className="button button--ghost"
                              type="button"
                              onClick={() => startEditingComment(comment)}
                            >
                              Редактировать
                            </button>
                            <button
                              className="button button--ghost"
                              type="button"
                              onClick={() => handleCommentDelete(comment.id)}
                            >
                              Удалить
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </article>
                ))
              ) : (
                <div className="empty-inline">Пока нет комментариев. Начните обсуждение первым.</div>
              )}
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
                <dd>{material.author.full_name}</dd>
              </div>
              <div>
                <dt>Курс</dt>
                <dd>{material.course.name}</dd>
              </div>
              <div>
                <dt>Предмет</dt>
                <dd>{material.subject.name}</dd>
              </div>
              <div>
                <dt>Направление</dt>
                <dd>{material.program.code} - {material.program.name}</dd>
              </div>
              <div>
                <dt>Тип</dt>
                <dd>{material.material_type.name}</dd>
              </div>
              <div>
                <dt>Размер</dt>
                <dd>{formatFileSize(material.file_size)}</dd>
              </div>
              <div>
                <dt>Дата добавления</dt>
                <dd>{formatDate(material.published_at || material.created_at)}</dd>
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
              <div>
                <span>Комментарии</span>
                <strong>{material.comments_count}</strong>
              </div>
            </div>
          </div>

          <div className="surface-card">
            <div className="section-heading section-heading--compact">
              <h2>Навигация</h2>
            </div>
            <div className="related-list">
              <Link className="related-item" to="/materials">
                <div className="related-item__icon">⌕</div>
                <div>
                  <strong>Вернуться в каталог</strong>
                  <span>Открыть другой материал или перейти к фильтрам</span>
                </div>
              </Link>
              <Link className="related-item" to="/materials/create">
                <div className="related-item__icon">＋</div>
                <div>
                  <strong>Загрузить материал</strong>
                  <span>Отправить собственный файл на модерацию</span>
                </div>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default MaterialDetailPage;
