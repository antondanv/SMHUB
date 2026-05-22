import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmEmail, resendConfirmation } from '../api/authApi';

const STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error',
};

const ConfirmEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(STATUS.PENDING);
  const [error, setError] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendInfo, setResendInfo] = useState('');
  const [isResending, setIsResending] = useState(false);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) {
      return;
    }
    hasRunRef.current = true;

    if (!token) {
      setStatus(STATUS.ERROR);
      setError('Ссылка для подтверждения некорректна.');
      return;
    }

    async function runConfirm() {
      try {
        await confirmEmail({ token });
        setStatus(STATUS.SUCCESS);
      } catch (requestError) {
        setStatus(STATUS.ERROR);
        setError(
          requestError.response?.data?.detail ||
            'Не удалось подтвердить email. Возможно, ссылка устарела.'
        );
      }
    }

    runConfirm();
  }, [token]);

  async function handleResend(event) {
    event.preventDefault();
    setResendInfo('');
    setIsResending(true);

    try {
      await resendConfirmation({ email: resendEmail });
      setResendInfo('Если такой email зарегистрирован, мы отправили новое письмо.');
    } catch (requestError) {
      setResendInfo(
        requestError.response?.data?.detail || 'Не удалось отправить письмо. Попробуйте позже.'
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <section className="page-shell">
      <div className="auth-shell auth-shell--single">
        <div className="auth-card">
          <div className="section-heading section-heading--compact">
            <p className="caps-label">Подтверждение email</p>
            <h2>
              {status === STATUS.SUCCESS
                ? 'Email подтверждён'
                : status === STATUS.ERROR
                  ? 'Не удалось подтвердить'
                  : 'Подтверждаем email…'}
            </h2>
          </div>

          {status === STATUS.SUCCESS ? (
            <>
              <p className="hero-copy">
                Готово — теперь вы можете войти в SMHUB.
              </p>
              <button
                className="button button--primary form-button--wide"
                type="button"
                onClick={() => navigate('/login')}
              >
                Перейти ко входу
              </button>
            </>
          ) : null}

          {status === STATUS.ERROR ? (
            <>
              <p className="form-error">{error}</p>

              <form className="form-grid auth-form" onSubmit={handleResend}>
                <label className="form-field--wide">
                  Email
                  <input
                    type="email"
                    name="email"
                    value={resendEmail}
                    onChange={(event) => setResendEmail(event.target.value)}
                    placeholder="student@university.ru"
                    required
                  />
                </label>

                <button
                  className="button button--primary form-button--wide"
                  type="submit"
                  disabled={isResending}
                >
                  {isResending ? 'Отправляем…' : 'Отправить письмо заново'}
                </button>

                {resendInfo ? <p className="form-success">{resendInfo}</p> : null}
              </form>

              <Link className="auth-link-button form-field--wide" to="/login">
                Вернуться ко входу
              </Link>
            </>
          ) : null}

          {status === STATUS.PENDING ? (
            <p className="hero-copy">Пожалуйста, подождите…</p>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default ConfirmEmailPage;
