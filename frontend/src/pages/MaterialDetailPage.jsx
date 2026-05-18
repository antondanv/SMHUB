import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { downloadMaterial, getMaterialById } from '../api/materialsApi';
import StatusBadge from '../components/StatusBadge';

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
  const [material, setMaterial] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadPending, setIsDownloadPending] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadMaterial() {
      setIsLoading(true);
      setError('');
      setErrorCode(null);

      try {
        const materialResponse = await getMaterialById(id);

        if (isActive) {
          setMaterial(materialResponse);
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

  if (isLoading) {
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
                <button className="button button--secondary" type="button" disabled>
                  Избранное позже
                </button>
              </div>
            </div>
          </div>

          {actionMessage && <div className="inline-alert inline-alert--warning">{actionMessage}</div>}

          <div className="preview-card">
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
              <h2>Дальнейшее расширение</h2>
            </div>

            <div className="inline-alert">
              Эта страница уже подключена к реальному detail/download API. Комментарии, лайки,
              рейтинг и избранное будут добавлены следующими задачами.
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
                <span>Избранное</span>
                <strong>{material.favorites_count}</strong>
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
