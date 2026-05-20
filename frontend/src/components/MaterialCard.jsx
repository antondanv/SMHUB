import { Link, useNavigate } from 'react-router-dom';
import LikeButton from './LikeButton';
import StatusBadge from './StatusBadge';

function MaterialCard({
  material,
  showStatus = false,
  actionLabel = 'Открыть',
  onLikeToggle,
}) {
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
      </div>

      <div className="material-card__body">
        <div className="material-card__meta-row">
          <span className="caps-label">{material.subject}</span>
          {material.isEditorial && <span className="editorial-badge">От редакции</span>}
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
          {material.rating ? <span>{material.rating} ★</span> : null}
          <span onClick={(e) => e.stopPropagation()}>
            <LikeButton
              materialId={material.id}
              initialCount={material.likes || 0}
              initialIsLiked={material.isLiked || false}
              onToggle={onLikeToggle}
            />
          </span>
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
