import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const MaterialsPage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section className="materials-page">
      <div className="materials-page__header">
        <div>
          <p className="eyebrow">Каталог</p>
          <h1>Материалы</h1>
          <p className="materials-page__lead">
            Здесь появится каталог учебных материалов с фильтрами, поиском и переходом к карточкам.
          </p>
        </div>

        <div className="materials-page__actions">
          <Link
            className="button button--primary"
            to={isAuthenticated ? '/materials/create' : '/login'}
          >
            {isAuthenticated ? 'Загрузить материал' : 'Войти и загрузить'}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MaterialsPage;
