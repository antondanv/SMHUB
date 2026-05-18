import { Link, useParams } from 'react-router-dom';
import MaterialCard from '../components/MaterialCard';
import { getMaterialById, getRelatedMaterials } from '../data/mockContent';

function formatDate(dateString) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

const MaterialDetailPage = () => {
  const { id } = useParams();
  const material = getMaterialById(id);

  if (!material) {
    return (
      <section className="page-shell">
        <div className="empty-state">
          <p className="caps-label">Материал не найден</p>
          <h1>Такой страницы пока нет в демо-каталоге.</h1>
          <p>Проверьте ссылку или вернитесь в каталог, чтобы открыть другой материал.</p>
          <Link className="button button--primary" to="/materials">
            Перейти в каталог
          </Link>
        </div>
      </section>
    );
  }

  const relatedMaterials = getRelatedMaterials(material.id, material.subject).slice(0, 3);

  return (
    <section className="page-shell">
      <div className="detail-stitch-layout">
        <div className="detail-stitch-main">
          <div className="detail-header-card">
            <div className="detail-header-card__head">
              <div>
                <div className="detail-inline-meta">
                  <span className="status-inline">Проверено</span>
                  <span>{material.views} просмотров</span>
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
              </div>
            </div>
          </div>

          <div className="preview-card">
            <div className="preview-card__toolbar">
              <div className="preview-card__file">
                <span>{material.fileType}</span>
                <strong>{material.title}.pdf</strong>
              </div>
              <div className="preview-card__controls">
                <button type="button">−</button>
                <span>100%</span>
                <button type="button">+</button>
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

            <div className="rating-summary">
              <strong>{material.rating}</strong>
              <div>
                <div className="rating-stars">★★★★☆</div>
                <span>{material.ratingCount} оценок</span>
              </div>
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
              {material.comments.length > 0 ? (
                material.comments.map((comment) => (
                  <article className="comment-card" key={comment.id}>
                    <div className="comment-card__head">
                      <strong>{comment.author}</strong>
                      <span>{comment.date}</span>
                    </div>
                    <div className="rating-stars rating-stars--small">★★★★★</div>
                    <p>{comment.text}</p>
                  </article>
                ))
              ) : (
                <div className="empty-inline">Пока нет комментариев.</div>
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
                <dd>{material.author}</dd>
              </div>
              <div>
                <dt>Курс</dt>
                <dd>{material.course}</dd>
              </div>
              <div>
                <dt>Предмет</dt>
                <dd>{material.subject}</dd>
              </div>
              <div>
                <dt>Направление</dt>
                <dd>{material.program}</dd>
              </div>
              <div>
                <dt>Тип</dt>
                <dd>
                  {material.fileType} · {material.type}
                </dd>
              </div>
              <div>
                <dt>Дата добавления</dt>
                <dd>{formatDate(material.publishedAt)}</dd>
              </div>
            </dl>

            <div className="detail-stat-cards">
              <div>
                <span>Просмотры</span>
                <strong>{material.views}</strong>
              </div>
              <div>
                <span>Скачивания</span>
                <strong>{material.downloads}</strong>
              </div>
              <div>
                <span>Избранное</span>
                <strong>{material.likes}</strong>
              </div>
            </div>
          </div>

          <div className="surface-card">
            <div className="section-heading section-heading--compact">
              <h2>Похожие материалы</h2>
            </div>
            <div className="related-list">
              {relatedMaterials.map((relatedMaterial) => (
                <Link
                  key={relatedMaterial.id}
                  className="related-item"
                  to={`/materials/${relatedMaterial.id}`}
                >
                  <div className="related-item__icon">{relatedMaterial.fileType}</div>
                  <div>
                    <strong>{relatedMaterial.title}</strong>
                    <span>
                      {relatedMaterial.type} · {relatedMaterial.fileSize}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default MaterialDetailPage;
