import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, registerAdmin } from '../api/authApi';
import heroImage from '../assets/hero.png';
import { useAuth } from '../context/useAuth';

const initialRegisterForm = {
  email: '',
  username: '',
  password: '',
  last_name: '',
  first_name: '',
  middle_name: '',
  admin_secret: '',
};

const AdminRegisterPage = () => {
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  function handleChange(event) {
    const { name, value } = event.target;
    setRegisterForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const payload = {
      email: registerForm.email,
      username: registerForm.username,
      password: registerForm.password,
      last_name: registerForm.last_name,
      first_name: registerForm.first_name,
      middle_name: registerForm.middle_name || null,
      course_id: null,
      program_id: null,
      group_name: null,
      admin_secret: registerForm.admin_secret,
    };

    try {
      await registerAdmin(payload);
      await loginUser({
        email: registerForm.email,
        password: registerForm.password,
      });
      await refreshUser();
      navigate('/admin');
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail || 'Не удалось создать аккаунт администратора.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page-shell">
      <div className="auth-shell">
        <aside className="auth-aside">
          <div className="auth-aside__content">
            <div className="section-heading section-heading--compact">
              <p className="caps-label">SMHUB Admin</p>
              <h1>Регистрация администратора для первого доступа в систему.</h1>
              <p className="hero-copy">
                Заполните базовые данные аккаунта и секретный код. После успешной
                регистрации вы сразу попадёте в админскую часть SMHUB.
              </p>
            </div>

            <div className="auth-feature-list">
              <article className="auth-feature-card">
                <strong>Доступ</strong>
                <span>Полный доступ к админке, модерации и управлению справочниками</span>
              </article>
              <article className="auth-feature-card">
                <strong>Безопасность</strong>
                <span>Создание админа разрешено только при наличии секретного кода</span>
              </article>
              <article className="auth-feature-card">
                <strong>Старт</strong>
                <span>После регистрации не нужен отдельный шаг входа</span>
              </article>
            </div>
          </div>

          <div className="auth-aside__media" aria-hidden="true">
            <img alt="" src={heroImage} />
          </div>
        </aside>

        <div className="auth-card">
          <div className="section-heading section-heading--compact">
            <p className="caps-label">Админ-доступ</p>
            <h2>Создать аккаунт администратора</h2>
            <p className="hero-copy">
              Для этого сценария не нужен учебный профиль, только данные аккаунта и секретный код.
            </p>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <form className="form-grid form-grid--two auth-form" onSubmit={handleSubmit}>
            <label className="form-field--wide">
              Секретный код
              <input
                type="password"
                name="admin_secret"
                value={registerForm.admin_secret}
                onChange={handleChange}
                placeholder="Введите секретный код"
                required
              />
            </label>

            <label className="form-field--wide">
              Email
              <input
                type="email"
                name="email"
                value={registerForm.email}
                onChange={handleChange}
                placeholder="admin@university.ru"
                required
              />
            </label>

            <label className="form-field--wide">
              Имя пользователя
              <input
                type="text"
                name="username"
                value={registerForm.username}
                onChange={handleChange}
                placeholder="Например, admin_ivanov"
                required
              />
            </label>

            <label>
              Фамилия
              <input
                type="text"
                name="last_name"
                value={registerForm.last_name}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Имя
              <input
                type="text"
                name="first_name"
                value={registerForm.first_name}
                onChange={handleChange}
                required
              />
            </label>

            <label className="form-field--wide">
              Отчество
              <input
                type="text"
                name="middle_name"
                value={registerForm.middle_name}
                onChange={handleChange}
              />
            </label>

            <label className="form-field--wide">
              Пароль
              <input
                type="password"
                name="password"
                value={registerForm.password}
                onChange={handleChange}
                placeholder="Минимум 8 символов"
                required
              />
            </label>

            <button className="button button--primary form-button--wide" type="submit">
              {isSubmitting ? 'Создаём админа...' : 'Создать аккаунт администратора'}
            </button>
          </form>

          <p className="profile-muted" style={{ marginTop: 'var(--space-md)' }}>
            Уже есть доступ? <Link to="/login">Перейти ко входу</Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default AdminRegisterPage;
