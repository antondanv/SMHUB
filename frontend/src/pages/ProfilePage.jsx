import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/useAuth';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { setUser: setAuthUser } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    course_id: '',
    program_id: '',
    group_name: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, coursesRes, programsRes] = await Promise.all([
        apiClient.get('/users/me'),
        apiClient.get('/courses'),
        apiClient.get('/programs')
        ]);

        setUser(userRes.data);
        setCourses(coursesRes.data);
        setPrograms(programsRes.data);

        setFormData({
          username: userRes.data.username || '',
          first_name: userRes.data.first_name || '',
          last_name: userRes.data.last_name || '',
          middle_name: userRes.data.middle_name || '',
          course_id: userRes.data.course_id || '',
          program_id: userRes.data.program_id || '',
          group_name: userRes.data.group_name || ''
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    try {
      const submissionData = {
        ...formData,
        course_id: formData.course_id ? Number(formData.course_id) : null,
        program_id: formData.program_id ? Number(formData.program_id) : null
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
      <section className="profile-page">
        <div className="profile-card">
          <p className="profile-muted">Загрузка...</p>
        </div>
      </section>
    );
  }

  if (error && !user) {
    return (
      <section className="profile-page">
        <div className="profile-card">
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
    <section className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <p className="eyebrow">Личный кабинет</p>
          <h1>Профиль</h1>
          <p className="form-intro">Обновите данные, которые будут использоваться в SMHUB.</p>
        </div>

        {success && (
          <p className="form-success">
            {success}
          </p>
        )}

        {error && (
          <p className="form-error">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="form-grid form-grid--two profile-form">
          <label className="form-field--wide">
            Email
            <input
              type="text"
              value={user?.email || ''}
              disabled
            />
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
            <select
              name="course_id"
              value={formData.course_id}
              onChange={handleChange}
            >
              <option value="">Выберите курс</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Направление
            <select
              name="program_id"
              value={formData.program_id}
              onChange={handleChange}
            >
              <option value="">Выберите направление</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.code} - {program.name}
                </option>
              ))}
            </select>
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

          <button
            type="submit"
            className="button button--primary form-button--wide"
          >
            Сохранить изменения
          </button>
        </form>
      </div>
    </section>
  );
};

export default ProfilePage;
