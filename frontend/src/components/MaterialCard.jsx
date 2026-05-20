import { Link, useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

function MaterialCard({ material, showStatus = false, actionLabel = 'Открыть' }) {
  const navigate = useNavigate();

  function handleCardClick() {
    navigate(`/materials/${material.id}`);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/materials/${material.id}`);
    }
  }

  return (
    <article
      className="material-card"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="link"
      aria-label={`Открыть материал: ${material.title}`}
    >
      <div className="material-card__top">
        <div className="material-card__file">
          <span>{material.fileType}</span>
          <strong>{material.fileSize}</strong>
        </div>
        <button
          className={`bookmark-button${material.isFavorite ? ' is-active' : ''}`}
          type="button"
          aria-label={material.isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          onClick={(e) => e.stopPropagation()}
        >
          {material.isFavorite ? 'Сохранено' : 'Сохранить'}
        </button>
      </div>

      <div className="material-card__body">
        <div className="material-card__meta-row">
          <span className="caps-label">{material.subject}</span>
          {showStatus ? <StatusBadge status={material.status} /> : null}
        </div>

        <h3>{material.title}</h3>
        <p>{material.excerpt}</p>

        <div className="tag-row">
          <span>{material.type}</span>
          <span>{material.course}</span>
          <span>{material.program.split(' - ')[0]}</span>
        </div>
      </div>

      <div className="material-card__footer">
        <div className="material-card__author">
          <strong>{material.author}</strong>
          <span>{material.publishedAt}</span>
        </div>

        <div className="metric-row">
          <span>{material.views} просмотров</span>
          <span>{material.downloads} скачиваний</span>
          <span>{material.rating} ★</span>
        </div>
      </div>

      <div className="material-card__actions">
        <Link className="button button--ghost" to={`/materials/${material.id}`}>
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}

export default MaterialCard;
