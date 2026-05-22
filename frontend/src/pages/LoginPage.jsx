import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { forgotPassword, registerUser } from '../api/authApi';
import { useAuth } from '../context/useAuth';
import heroImage from '../assets/hero.png';
import { PASSWORD_HINT, validatePasswordWithConfirmation } from '../utils/password';

const isDevelopment = import.meta.env.DEV;
const DEMO_CREDENTIALS_STORAGE_KEY = 'smhub-dev-demo-credentials';
const DEMO_PASSWORD = 'demo1234';

const initialLoginForm = {
  email: '',
  password: '',
};

const initialRegisterForm = {
  email: '',
  username: '',
  password: '',
  password_confirm: '',
  last_name: '',
  first_name: '',
  middle_name: '',
  course_value: '',
  program_value: '',
  group_name: '',
};

const initialForgotForm = {
  email: '',
  username: '',
  last_name: '',
  first_name: '',
  new_password: '',
  new_password_confirm: '',
};

function normalizeValue(value) {
  return value.trim().toLowerCase();
}

function getCourseOptionLabel(course) {
  return `${course.number} курс`;
}

function getProgramOptionLabel(program) {
  return `${program.code} - ${program.name}`;
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

function resolveProgramId(value, programs) {
  if (!value.trim()) {
    return null;
  }

  const normalized = normalizeValue(value);
  const program = programs.find(
    (item) => normalizeValue(getProgramOptionLabel(item)) === normalized
  );

  return program ? program.id : undefined;
}

function storeDemoCredentials(credentials) {
  if (!isDevelopment) {
    return;
  }

  try {
    localStorage.setItem(DEMO_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
  } catch (storageError) {
    console.error(storageError);
  }
}

function getStoredDemoCredentials() {
  if (!isDevelopment) {
    return null;
  }

  try {
    const storedValue = localStorage.getItem(DEMO_CREDENTIALS_STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue);

    if (
      typeof parsedValue?.email !== 'string' ||
      typeof parsedValue?.password !== 'string' ||
      !parsedValue.email.trim() ||
      !parsedValue.password.trim()
    ) {
      return null;
    }

    return parsedValue;
  } catch (storageError) {
    console.error(storageError);
    return null;
  }
}

function buildDemoRegisterForm(courses, programs) {
  const seed = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(-8);

  return {
    email: `demo.${seed}@smhub.local`,
    username: `demo_${seed}`,
    password: DEMO_PASSWORD,
    password_confirm: DEMO_PASSWORD,
    last_name: 'Тестов',
    first_name: 'Тимур',
    middle_name: 'Демо',
    course_value: courses[0] ? getCourseOptionLabel(courses[0]) : '',
    program_value: programs[0] ? getProgramOptionLabel(programs[0]) : '',
    group_name: `DEV-${seed.slice(-3).toUpperCase()}`,
  };
}

const LoginPage = ({ defaultMode = 'login' }) => {
  const [mode, setMode] = useState(defaultMode);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [forgotForm, setForgotForm] = useState(initialForgotForm);
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchReferenceData() {
      try {
        const [coursesResponse, programsResponse] = await Promise.all([
          apiClient.get('/courses'),
          apiClient.get('/programs'),
        ]);

        setCourses(coursesResponse.data);
        setPrograms(programsResponse.data);
      } catch (requestError) {
        console.error(requestError);
      }
    }

    fetchReferenceData();
  }, []);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
    setInfo('');
  }

  function handleChange(event) {
    const { name, value } = event.target;

    if (mode === 'login') {
      setLoginForm((currentForm) => ({ ...currentForm, [name]: value }));
      return;
    }

    if (mode === 'forgot') {
      setForgotForm((currentForm) => ({ ...currentForm, [name]: value }));
      return;
    }

    setRegisterForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  function fillLoginWithDemoData() {
    const storedCredentials = getStoredDemoCredentials();

    if (storedCredentials) {
      setLoginForm(storedCredentials);
      setError('');
      return;
    }

    setLoginForm({
      email: 'demo@smhub.local',
      password: DEMO_PASSWORD,
    });
    setError('');
  }

  function fillRegisterWithDemoData() {
    const demoRegisterForm = buildDemoRegisterForm(courses, programs);

    setRegisterForm(demoRegisterForm);
    storeDemoCredentials({
      email: demoRegisterForm.email,
      password: demoRegisterForm.password,
    });
    setError('');
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(loginForm);
      navigate('/');
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail || 'Не удалось войти. Проверьте email и пароль.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotSubmit(event) {
    event.preventDefault();
    setError('');
    setInfo('');

    const passwordError = validatePasswordWithConfirmation(
      forgotForm.new_password,
      forgotForm.new_password_confirm
    );
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsSubmitting(true);

    try {
      await forgotPassword({
        email: forgotForm.email,
        username: forgotForm.username,
        last_name: forgotForm.last_name,
        first_name: forgotForm.first_name,
        new_password: forgotForm.new_password,
      });
      setForgotForm(initialForgotForm);
      setLoginForm((currentForm) => ({ ...currentForm, email: forgotForm.email }));
      setMode('login');
      setInfo('Пароль изменён. Войдите с новым паролем.');
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail || 'Не удалось сбросить пароль. Проверьте данные.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setError('');

    const passwordError = validatePasswordWithConfirmation(
      registerForm.password,
      registerForm.password_confirm
    );
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsSubmitting(true);

    const courseId = resolveCourseId(registerForm.course_value, courses);
    if (courseId === undefined) {
      setError('Курс укажите как номер или выберите из подсказок.');
      setIsSubmitting(false);
      return;
    }

    const programId = resolveProgramId(registerForm.program_value, programs);
    if (programId === undefined) {
      setError('Направление укажите в формате "код - название" или выберите из подсказок.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      email: registerForm.email,
      username: registerForm.username,
      password: registerForm.password,
      last_name: registerForm.last_name,
      first_name: registerForm.first_name,
      middle_name: registerForm.middle_name || null,
      course_id: courseId,
      program_id: programId,
      group_name: registerForm.group_name || null,
    };

    try {
      await registerUser(payload);
      storeDemoCredentials({
        email: registerForm.email,
        password: registerForm.password,
      });
      await login({
        email: registerForm.email,
        password: registerForm.password,
      });
      navigate('/');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Не удалось создать аккаунт.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLogin = mode === 'login';
  const isForgot = mode === 'forgot';

  return (
    <section className="page-shell">
      <div className="auth-shell">
        <aside className="auth-aside">
          <div className="auth-aside__content">
            <div className="section-heading section-heading--compact">
              <p className="caps-label">SMHUB для студентов</p>
              <h1>{isLogin ? 'Вход в каталог и личное пространство.' : 'Присоединяйтесь к общей базе знаний.'}</h1>
              <p className="hero-copy">
                {isLogin
                  ? 'Сохраняйте полезные материалы, быстрее возвращайтесь к своим подборкам и отправляйте новые файлы на модерацию.'
                  : 'Создайте аккаунт, чтобы публиковать материалы, собирать избранное и получать персональные рекомендации по курсу и направлению.'}
              </p>
            </div>

            <div className="auth-feature-list">
              <article className="auth-feature-card">
                <strong>Каталог</strong>
                <span>Быстрый поиск по предметам и типам материалов</span>
              </article>
              <article className="auth-feature-card">
                <strong>Профиль</strong>
                <span>Персонализация по курсу, направлению и группе</span>
              </article>
              <article className="auth-feature-card">
                <strong>Публикация</strong>
                <span>Отправка материалов на модерацию без лишних шагов</span>
              </article>
            </div>
          </div>

          <div className="auth-aside__media" aria-hidden="true">
            <img alt="" src={heroImage} />
          </div>
        </aside>

        <div className="auth-card">
          <div className="section-heading section-heading--compact">
            <p className="caps-label">Аккаунт</p>
            <h2>{isForgot ? 'Восстановление пароля' : isLogin ? 'Вход в систему' : 'Регистрация'}</h2>
            <p className="hero-copy">
              {isForgot
                ? 'Подтвердите данные аккаунта, чтобы задать новый пароль.'
                : isLogin
                  ? 'Введите данные, чтобы продолжить работу в SMHUB.'
                  : 'Заполните данные аккаунта и учебный контекст.'}
            </p>
          </div>

          {isForgot ? null : (
            <div className="auth-switch" role="tablist" aria-label="Режим авторизации">
              <button
                className={isLogin ? 'is-active' : ''}
                type="button"
                onClick={() => switchMode('login')}
              >
                Вход
              </button>
              <button
                className={!isLogin ? 'is-active' : ''}
                type="button"
                onClick={() => switchMode('register')}
              >
                Регистрация
              </button>
            </div>
          )}

          {info ? <p className="form-success">{info}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          {isForgot ? (
            <form className="form-grid form-grid--two auth-form" onSubmit={handleForgotSubmit}>
              <p className="hero-copy form-field--wide" style={{ marginTop: 0 }}>
                Так как почтовый сервис не подключён, восстановление выполняется по
                личным данным: укажите email, имя пользователя и ФИО из вашего
                аккаунта.
              </p>

              <label className="form-field--wide">
                Email
                <input
                  type="email"
                  name="email"
                  value={forgotForm.email}
                  onChange={handleChange}
                  placeholder="student@university.ru"
                  required
                />
              </label>

              <label className="form-field--wide">
                Имя пользователя
                <input
                  type="text"
                  name="username"
                  value={forgotForm.username}
                  onChange={handleChange}
                  placeholder="Например, ivan_21"
                  required
                />
              </label>

              <label>
                Фамилия
                <input
                  type="text"
                  name="last_name"
                  value={forgotForm.last_name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Имя
                <input
                  type="text"
                  name="first_name"
                  value={forgotForm.first_name}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="form-field--wide">
                Новый пароль
                <input
                  type="password"
                  name="new_password"
                  value={forgotForm.new_password}
                  onChange={handleChange}
                  placeholder="Минимум 8 символов"
                  required
                />
                <small>{PASSWORD_HINT}</small>
              </label>

              <label className="form-field--wide">
                Подтверждение пароля
                <input
                  type="password"
                  name="new_password_confirm"
                  value={forgotForm.new_password_confirm}
                  onChange={handleChange}
                  placeholder="Повторите новый пароль"
                  required
                />
              </label>

              <button className="button button--primary form-button--wide" type="submit">
                {isSubmitting ? 'Сбрасываем...' : 'Задать новый пароль'}
              </button>

              <button
                className="button button--ghost form-button--wide"
                type="button"
                onClick={() => switchMode('login')}
              >
                Вернуться ко входу
              </button>
            </form>
          ) : isLogin ? (
            <form className="form-grid auth-form auth-form--login" onSubmit={handleLoginSubmit}>
              {isDevelopment ? (
                <div className="auth-dev-tools">
                  <button
                    className="button button--ghost"
                    type="button"
                    onClick={fillLoginWithDemoData}
                  >
                    Подставить демо-логин
                  </button>
                </div>
              ) : null}

              <label className="form-field--wide">
                Email
                <input
                  type="email"
                  name="email"
                  value={loginForm.email}
                  onChange={handleChange}
                  placeholder="student@university.ru"
                  required
                />
              </label>

              <label className="form-field--wide">
                Пароль
                <input
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleChange}
                  placeholder="Введите пароль"
                  required
                />
              </label>

              <button className="button button--primary form-button--wide" type="submit">
                {isSubmitting ? 'Входим...' : 'Войти'}
              </button>

              <button
                className="auth-link-button form-field--wide"
                type="button"
                onClick={() => switchMode('forgot')}
              >
                Забыли пароль?
              </button>
            </form>
          ) : (
            <form className="form-grid form-grid--two auth-form" onSubmit={handleRegisterSubmit}>
              {isDevelopment ? (
                <div className="auth-dev-tools auth-dev-tools--wide">
                  <button
                    className="button button--ghost"
                    type="button"
                    onClick={fillRegisterWithDemoData}
                  >
                    Заполнить демо-форму
                  </button>
                </div>
              ) : null}

              <label className="form-field--wide">
                Email
                <input
                  type="email"
                  name="email"
                  value={registerForm.email}
                  onChange={handleChange}
                  placeholder="student@university.ru"
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
                  placeholder="Например, ivan_21"
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
                <small>{PASSWORD_HINT}</small>
              </label>

              <label className="form-field--wide">
                Подтверждение пароля
                <input
                  type="password"
                  name="password_confirm"
                  value={registerForm.password_confirm}
                  onChange={handleChange}
                  placeholder="Повторите пароль"
                  required
                />
              </label>

              <label>
                Курс
                <input
                  type="text"
                  name="course_value"
                  value={registerForm.course_value}
                  onChange={handleChange}
                  list="course-options"
                  placeholder="Например: 2 курс"
                />
                <datalist id="course-options">
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
                  value={registerForm.program_value}
                  onChange={handleChange}
                  list="program-options"
                  placeholder="Код - название"
                />
                <datalist id="program-options">
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
                  value={registerForm.group_name}
                  onChange={handleChange}
                  placeholder="Например: ИВТ-21-1"
                />
              </label>

              <button className="button button--primary form-button--wide" type="submit">
                {isSubmitting ? 'Создаём аккаунт...' : 'Создать аккаунт'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
