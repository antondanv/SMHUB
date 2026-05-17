import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { registerUser } from '../api/authApi';
import { useAuth } from '../context/useAuth';

const isDevelopment = import.meta.env.DEV;
const DEMO_CREDENTIALS_STORAGE_KEY = 'smhub-dev-demo-credentials';
const DEMO_PASSWORD = 'demo123';

const initialLoginForm = {
  email: '',
  password: '',
};

const initialRegisterForm = {
  email: '',
  username: '',
  password: '',
  last_name: '',
  first_name: '',
  middle_name: '',
  course_value: '',
  program_value: '',
  group_name: '',
};

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

    return {
      email: parsedValue.email,
      password: parsedValue.password,
    };
  } catch (storageError) {
    console.error(storageError);
    return null;
  }
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

function buildDemoRegisterForm(courses, programs) {
  const seed = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(-8);
  const courseValue = courses[0] ? getCourseOptionLabel(courses[0]) : '';
  const programValue = programs[0] ? getProgramOptionLabel(programs[0]) : '';

  return {
    email: `demo.${seed}@smhub.local`,
    username: `demo_${seed}`,
    password: DEMO_PASSWORD,
    last_name: 'Тестов',
    first_name: 'Тимур',
    middle_name: 'Демо',
    course_value: courseValue,
    program_value: programValue,
    group_name: `DEV-${seed.slice(-3).toUpperCase()}`,
  };
}

const LoginPage = ({ defaultMode = 'login' }) => {
  const [mode, setMode] = useState(defaultMode);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [error, setError] = useState('');
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
  }

  function handleChange(event) {
    const { name, value } = event.target;

    if (mode === 'login') {
      setLoginForm((currentForm) => ({ ...currentForm, [name]: value }));
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

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setError('');
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

  return (
    <section className="auth-page auth-page--wide">
      <div className="auth-card auth-card--compact">
        <div className="auth-card__header">
          <p className="eyebrow">Аккаунт SMHUB</p>
          <h1>{isLogin ? 'Вход' : 'Регистрация'}</h1>
          <p className="form-intro">
            {isLogin
              ? 'Продолжайте работу с учебными материалами.'
              : 'Создайте аккаунт, чтобы пользоваться платформой.'}
          </p>
        </div>

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

        <div className="auth-form-frame">
          {isLogin ? (
            <form className="form-grid auth-form-motion" key="login" onSubmit={handleLoginSubmit}>
              {isDevelopment && (
                <div className="auth-dev-tools">
                  <button
                    className="button button--secondary auth-dev-tools__button"
                    type="button"
                    onClick={fillLoginWithDemoData}
                  >
                    Подставить демо-логин
                  </button>
                  <p className="auth-dev-tools__hint">
                    В режиме разработки берутся последние демо-данные после регистрации.
                  </p>
                </div>
              )}

              <label>
                Email <span>*</span>
                <input
                  name="email"
                  type="email"
                  value={loginForm.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  placeholder="student@example.com"
                />
              </label>

              <label>
                Пароль <span>*</span>
                <input
                  name="password"
                  type="password"
                  value={loginForm.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  placeholder="Введите пароль"
                />
              </label>

              {error && <p className="form-error">{error}</p>}

              <button className="button button--primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Входим...' : 'Войти'}
              </button>
            </form>
          ) : (
            <form
              className="form-grid form-grid--two auth-form-motion"
              key="register"
              onSubmit={handleRegisterSubmit}
            >
              {isDevelopment && (
                <div className="auth-dev-tools form-field--wide">
                  <button
                    className="button button--secondary auth-dev-tools__button"
                    type="button"
                    onClick={fillRegisterWithDemoData}
                  >
                    Заполнить демо-данными
                  </button>
                  <p className="auth-dev-tools__hint">
                    Генерируются уникальные тестовые email и username, чтобы не упираться в дубликаты.
                  </p>
                </div>
              )}

              <label>
                Email <span>*</span>
                <input
                  name="email"
                  type="email"
                  value={registerForm.email}
                  onChange={handleChange}
                  required
                  placeholder="student@example.com"
                />
              </label>

              <label>
                Username <span>*</span>
                <input
                  name="username"
                  value={registerForm.username}
                  onChange={handleChange}
                  required
                  minLength={3}
                  placeholder="ivanov"
                />
              </label>

              <label>
                Пароль <span>*</span>
                <input
                  name="password"
                  type="password"
                  value={registerForm.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  placeholder="Минимум 6 символов"
                />
              </label>

              <label>
                Фамилия <span>*</span>
                <input
                  name="last_name"
                  value={registerForm.last_name}
                  onChange={handleChange}
                  required
                  placeholder="Иванов"
                />
              </label>

              <label>
                Имя <span>*</span>
                <input
                  name="first_name"
                  value={registerForm.first_name}
                  onChange={handleChange}
                  required
                  placeholder="Иван"
                />
              </label>

              <label>
                Отчество
                <input
                  name="middle_name"
                  value={registerForm.middle_name}
                  onChange={handleChange}
                  placeholder="Иванович"
                />
              </label>

              <label>
                Курс
                <input
                  name="course_value"
                  list="course-options"
                  value={registerForm.course_value}
                  onChange={handleChange}
                  placeholder="1 или 1 курс"
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
                  name="program_value"
                  list="program-options"
                  value={registerForm.program_value}
                  onChange={handleChange}
                  placeholder="09.03.03 - Прикладная информатика"
                />
                <datalist id="program-options">
                  {programs.map((program) => (
                    <option key={program.id} value={getProgramOptionLabel(program)} />
                  ))}
                </datalist>
              </label>

              <label>
                Группа
                <input
                  name="group_name"
                  value={registerForm.group_name}
                  onChange={handleChange}
                  placeholder="ПИ-21"
                />
              </label>

              {error && <p className="form-error form-error--wide">{error}</p>}

              <button className="button button--primary form-button--wide" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Создаем...' : 'Создать аккаунт'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
