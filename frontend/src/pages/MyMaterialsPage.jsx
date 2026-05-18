import { Navigate } from 'react-router-dom';
import MaterialCard from '../components/MaterialCard';
import StatusBadge from '../components/StatusBadge';
import { myMaterials } from '../data/mockContent';
import { useAuth } from '../context/useAuth';

const MyMaterialsPage = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div>
          <p className="caps-label">Личный кабинет автора</p>
          <h1>Мои материалы</h1>
          <p className="hero-copy">
            Следите за статусом публикации, быстро возвращайтесь к черновикам и готовьте обновления.
          </p>
        </div>
      </div>

      <div className="dashboard-list">
        {myMaterials.map((material) => (
          <div className="dashboard-card" key={material.id}>
            <div className="dashboard-card__head">
              <div>
                <p className="caps-label">{material.subject}</p>
                <h2>{material.title}</h2>
              </div>
              <StatusBadge status={material.status} />
            </div>

            <p>{material.ownerNote}</p>

            {material.rejectReason ? (
              <div className="inline-alert inline-alert--warning">
                Причина отклонения: {material.rejectReason}
              </div>
            ) : null}

            <div className="dashboard-card__footer">
              <div className="tag-row">
                <span>{material.type}</span>
                <span>{material.course}</span>
                <span>{material.fileType}</span>
              </div>

              <div className="action-row">
                <button className="button button--ghost" type="button">
                  Открыть
                </button>
                <button className="button button--secondary" type="button">
                  Редактировать
                </button>
                <button className="button button--ghost" type="button">
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-block">
        <div className="section-heading">
          <p className="caps-label">Карточки</p>
          <h2>Как материал выглядит в каталоге</h2>
        </div>
        <div className="material-grid">
          {myMaterials.slice(0, 2).map((material) => (
            <MaterialCard key={material.id} material={material} showStatus />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MyMaterialsPage;
