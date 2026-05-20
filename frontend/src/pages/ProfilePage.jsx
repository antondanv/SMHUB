import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import CourseSelect from '../components/selectors/CourseSelect';
import ProgramSelect from '../components/selectors/ProgramSelect';
import { useAuth } from '../context/useAuth';
import { useReferenceData } from '../context/useReferenceData';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();
  const { setUser: setAuthUser, logout } = useAuth();
  const {
    courses,
    programs,
    isLoading: isReferenceDataLoading,
    error: referenceDataError,
  } = useReferenceData();

  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    course_id: '',
    program_id: '',
    group_name: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await apiClient.get('/users/me');

        setUser(userRes.data);

        setFormData({
          username: userRes.data.username || '',
          first_name: userRes.data.first_name || '',
          last_name: userRes.data.last_name || '',
          middle_name: userRes.data.middle_name || '',
          course_id: userRes.data.course_id ? String(userRes.data.course_id) : '',
          program_id: userRes.data.program_id ? String(userRes.data.program_id) : '',
          group_name: userRes.data.group_name || '',
        });
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить данные профиля. Убедитесь, что вы авторизованы.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    try {
      const submissionData = {
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || null,
        course_id: formData.course_id ? Number(formData.course_id) : null,
        program_id: formData.program_id ? Number(formData.program_id) : null,
        group_name: formData.group_name || null,
      };

      const response = await apiClient.patch('/users/me', submissionData);
      setUser(response.data);
      setAuthUser(response.data);
      setSuccess('Профиль успешно обновлен!');
    } catch (err) {
      console.error(err);
      setError('Ошибка при обновлении профиля.');
    }
  };

  if (loading) {
    return (
      <section className="page-shell">
        <div className="surface-card surface-card--single">
          <p className="profile-muted">Загрузка...</p>
        </div>
      </section>
    );
  }

  if (error && !user) {
    return (
      <section className="page-shell">
        <div className="surface-card surface-card--single">
          <p className="form-error">{error}</p>
          <div className="profile-actions">
            <Link className="button button--primary" to="/login">
              Перейти к входу
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="profile-layout">
        <aside className="surface-card surface-card--sidebar">
          <div className="section-heading section-heading--compact">
            <p className="caps-label">Профиль</p>
            <h1>{user?.first_name || user?.username || 'Пользователь'}</h1>
          </div>

          <p className="body-copy">
            Обновите учебный контекст и контактные данные, чтобы персональные подборки на главной
            были точнее.
          </p>

          <div className="metric-stack metric-stack--profile">
            <div className="metric-stack__item">
              <strong>{formData.course_id || '—'}</strong>
              <span>Выбранный курс</span>
            </div>
            <div className="metric-stack__item">
              <strong>{formData.program_id || '—'}</strong>
              <span>Направление</span>
            </div>
            <div className="metric-stack__item">
              <strong>{formData.group_name || 'Не указана'}</strong>
              <span>Учебная группа</span>
            </div>
          </div>

          <button
            type="button"
            className="button button--ghost"
            style={{ marginTop: 'auto', width: '100%' }}
            onClick={() => { logout(); navigate('/'); }}
          >
            Выйти из аккаунта
          </button>
        </aside>

        <div className="surface-card surface-card--form">
          <div className="section-heading">
            <p className="caps-label">Личный кабинет</p>
            <h2>Редактирование профиля</h2>
            <p className="hero-copy">Изменения будут использоваться в SMHUB для каталога и рекомендаций.</p>
          </div>

          {success && <p className="form-success">{success}</p>}
          {error && <p className="form-error">{error}</p>}
          {referenceDataError && (
            <p className="form-error">
              Не удалось загрузить справочники. Селекторы могут быть временно недоступны.
            </p>
          )}

          <form onSubmit={handleSubmit} className="form-grid form-grid--two profile-form">
            <label className="form-field--wide">
              Email
              <input type="text" value={user?.email || ''} disabled />
              <small>Email нельзя изменить</small>
            </label>

            <label className="form-field--wide">
              Имя пользователя <span>*</span>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Фамилия <span>*</span>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Имя <span>*</span>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </label>

            <label className="form-field--wide">
              Отчество
              <input
                type="text"
                name="middle_name"
                value={formData.middle_name}
                onChange={handleChange}
              />
            </label>

            <label>
              Курс
              <CourseSelect
                name="course_id"
                value={formData.course_id}
                onChange={handleChange}
                courses={courses}
                isLoading={isReferenceDataLoading}
                hasError={Boolean(referenceDataError)}
              />
            </label>

            <label>
              Направление
              <ProgramSelect
                name="program_id"
                value={formData.program_id}
                onChange={handleChange}
                programs={programs}
                isLoading={isReferenceDataLoading}
                hasError={Boolean(referenceDataError)}
              />
            </label>

            <label className="form-field--wide">
              Группа
              <input
                type="text"
                name="group_name"
                value={formData.group_name}
                onChange={handleChange}
                placeholder="Напр. ИВТ-21-1"
              />
            </label>

            <button type="submit" className="button button--primary form-button--wide">
              Сохранить изменения
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;
