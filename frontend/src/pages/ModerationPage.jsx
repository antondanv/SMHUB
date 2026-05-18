import StatusBadge from '../components/StatusBadge';
import { moderationQueue } from '../data/mockContent';

const ModerationPage = () => {
  const activeMaterial = moderationQueue[0];

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div>
          <p className="caps-label">Рабочее место модератора</p>
          <h1>Модерация материалов</h1>
          <p className="hero-copy">
            Быстрый просмотр контекста, метаданных и статуса публикации без лишних переходов.
          </p>
        </div>
      </div>

      <div className="moderation-layout">
        <aside className="surface-card surface-card--queue">
          <div className="section-heading section-heading--compact">
            <p className="caps-label">Очередь</p>
            <h2>{moderationQueue.length} материала на проверке</h2>
          </div>

          <div className="queue-list">
            {moderationQueue.map((material) => (
              <article
                key={material.id}
                className={`queue-item${material.id === activeMaterial.id ? ' is-active' : ''}`}
              >
                <div className="queue-item__head">
                  <strong>{material.title}</strong>
                  <StatusBadge status={material.status} />
                </div>
                <p>{material.subject}</p>
                <span>
                  {material.author} · {material.uploadedAt}
                </span>
              </article>
            ))}
          </div>
        </aside>

        <div className="surface-card surface-card--moderation">
          <div className="section-heading">
            <p className="caps-label">Активный материал</p>
            <h2>{activeMaterial.title}</h2>
          </div>

          <div className="meta-list meta-list--wide">
            <div>
              <dt>Предмет</dt>
              <dd>{activeMaterial.subject}</dd>
            </div>
            <div>
              <dt>Тип</dt>
              <dd>{activeMaterial.type}</dd>
            </div>
            <div>
              <dt>Автор</dt>
              <dd>{activeMaterial.author}</dd>
            </div>
            <div>
              <dt>Курс</dt>
              <dd>{activeMaterial.course}</dd>
            </div>
            <div>
              <dt>Направление</dt>
              <dd>{activeMaterial.program}</dd>
            </div>
            <div>
              <dt>Файл</dt>
              <dd>
                {activeMaterial.fileType} · {activeMaterial.fileSize}
              </dd>
            </div>
          </div>

          <div className="inline-alert">
            Перед публикацией проверьте качество текста, соответствие предмету и полноту описания.
          </div>

          <div className="action-row action-row--moderation">
            <button className="button button--primary" type="button">
              Одобрить
            </button>
            <button className="button button--secondary" type="button">
              Отклонить
            </button>
            <button className="button button--ghost" type="button">
              Отправить в архив
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ModerationPage;
