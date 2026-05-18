import { Navigate } from 'react-router-dom';
import MaterialCard from '../components/MaterialCard';
import { mockMaterials } from '../data/mockContent';
import { useAuth } from '../context/useAuth';

const FavoritesPage = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const favoriteMaterials = mockMaterials.filter((material) => material.isFavorite);

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div>
          <p className="caps-label">Избранное</p>
          <h1>Сохранённые материалы</h1>
          <p className="hero-copy">
            Здесь лежат файлы, к которым вы хотите быстро возвращаться перед занятиями и сессией.
          </p>
        </div>
      </div>

      <div className="material-grid">
        {favoriteMaterials.map((material) => (
          <MaterialCard key={material.id} material={material} actionLabel="Открыть материал" />
        ))}
      </div>
    </section>
  );
};

export default FavoritesPage;
