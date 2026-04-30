import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/useAuth';

function normalizeValue(value) {
  return value.trim().toLowerCase();
}

function getCourseOptionLabel(course) {
  return `${course.number} курс`;
}

function resolveCourseId(value, courses) {
  if (!value.trim()) {
    return null;
  }

  const normalized = normalizeValue(value);

  const course = courses.find((item) => {
    const number = String(item.number);
    const optionLabel = normalizeValue(getCourseOptionLabel(item));

    return normalized === number || normalized === optionLabel;
  });

  return course ? course.id : undefined;
}

function getProgramOptionLabel(program) {
  return `${program.code} - ${program.name}`;
}

function resolveProgramId(value, programs) {
  if (!value.trim()) {
    return null;
  }

  const normalized = normalizeValue(value);

  const program = programs.find((item) => {
    const optionLabel = normalizeValue(getProgramOptionLabel(item));

    return normalized === optionLabel;
  });

  return program ? program.id : undefined;
}

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
    course_value: '',
    program_value: '',
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

        const selectedCourse = coursesRes.data.find((course) => course.id === userRes.data.course_id);
        const selectedProgram = programsRes.data.find((program) => program.id === userRes.data.program_id);

        setFormData({
          username: userRes.data.username || '',
          first_name: userRes.data.first_name || '',
          last_name: userRes.data.last_name || '',
          middle_name: userRes.data.middle_name || '',
          course_value: selectedCourse ? getCourseOptionLabel(selectedCourse) : '',
          program_value: selectedProgram ? getProgramOptionLabel(selectedProgram) : '',
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
      const courseId = resolveCourseId(formData.course_value, courses);
      if (courseId === undefined) {
        setError('Курс укажите как номер или выберите из подсказок.');
        return;
      }

      const programId = resolveProgramId(formData.program_value, programs);
      if (programId === undefined) {
        setError('Направление укажите в формате "код - название" или выберите из подсказок.');
        return;
      }

      const submissionData = {
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || null,
        course_id: courseId,
        program_id: programId,
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
            <input
              type="text"
              name="course_value"
              list="profile-course-options"
              value={formData.course_value}
              onChange={handleChange}
              placeholder="1 или 1 курс"
            />
            <datalist id="profile-course-options">
              {courses.map((course) => (
                <option key={course.id} value={getCourseOptionLabel(course)} />
              ))}
            </datalist>
          </label>

          <label>
            Направление
            <input
              type="text"
              name="program_value"
              list="profile-program-options"
              value={formData.program_value}
              onChange={handleChange}
              placeholder="09.03.03 - Прикладная информатика"
            />
            <datalist id="profile-program-options">
              {programs.map((program) => (
                <option key={program.id} value={getProgramOptionLabel(program)} />
              ))}
            </datalist>
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
