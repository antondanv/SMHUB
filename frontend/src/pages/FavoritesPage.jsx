import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import MaterialCard from '../components/MaterialCard';
import { getMyFavorites } from '../api/materialsApi';
import { useAuth } from '../context/useAuth';
import { toMaterialCardView } from '../utils/materials';

function getErrorMessage(error) {
  const detail = error.response?.data?.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  return 'Не удалось загрузить избранные материалы.';
}

const FavoritesPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [pageError, setPageError] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isActive = true;

    async function loadFavorites() {
      setIsPageLoading(true);
      setPageError('');

      try {
        const response = await getMyFavorites();

        if (!isActive) {
          return;
        }

        setMaterials(response.items);
      } catch (requestError) {
        if (isActive) {
          setPageError(getErrorMessage(requestError));
        }
      } finally {
        if (isActive) {
          setIsPageLoading(false);
        }
      }
    }

    loadFavorites();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated]);

  function handleLikeToggle(materialId, isLiked) {
    if (!isLiked) {
      setMaterials((current) => current.filter((item) => item.id !== materialId));
    }
  }

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading || isPageLoading) {
    return (
      <section className="page-shell">
        <div className="surface-card surface-card--single">
          <p className="profile-muted">Загружаем избранные материалы...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div>
          <p className="caps-label">Избранное</p>
          <h1>Сохранённые материалы</h1>
          <p className="hero-copy">
            Здесь собраны материалы, которые вы отметили для быстрого повторного доступа.
          </p>
        </div>
      </div>

      {pageError && <div className="inline-alert inline-alert--warning">{pageError}</div>}

      {materials.length === 0 ? (
        <div className="empty-state">
          <p className="caps-label">Пока пусто</p>
          <h1>У вас ещё нет избранных материалов.</h1>
          <p>Сохраните нужные файлы из каталога или со страницы материала, и они появятся здесь.</p>
        </div>
      ) : (
        <div className="material-grid">
          {materials.map((material) => {
            const materialView = toMaterialCardView(material);

            return (
              <MaterialCard
                key={material.id}
                material={materialView}
                actionLabel="Открыть материал"
                onLikeToggle={(isLiked) => handleLikeToggle(material.id, isLiked)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

export default FavoritesPage;
