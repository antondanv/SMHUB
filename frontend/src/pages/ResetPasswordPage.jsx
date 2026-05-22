import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/authApi';
import { PASSWORD_HINT, validatePasswordWithConfirmation } from '../utils/password';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('Ссылка для сброса некорректна.');
      return;
    }

    const passwordError = validatePasswordWithConfirmation(newPassword, newPasswordConfirm);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({ token, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          'Не удалось задать новый пароль. Возможно, ссылка устарела.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page-shell">
      <div className="auth-shell auth-shell--single">
        <div className="auth-card">
          <div className="section-heading section-heading--compact">
            <p className="caps-label">Сброс пароля</p>
            <h2>{success ? 'Пароль обновлён' : 'Новый пароль'}</h2>
            <p className="hero-copy">
              {success
                ? 'Перенаправляем на страницу входа…'
                : 'Введите новый пароль для вашего аккаунта.'}
            </p>
          </div>

          {success ? null : (
            <form className="form-grid auth-form" onSubmit={handleSubmit}>
              {error ? <p className="form-error">{error}</p> : null}

              <label className="form-field--wide">
                Новый пароль
                <input
                  type="password"
                  name="new_password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
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
                  value={newPasswordConfirm}
                  onChange={(event) => setNewPasswordConfirm(event.target.value)}
                  placeholder="Повторите новый пароль"
                  required
                />
              </label>

              <button
                className="button button--primary form-button--wide"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Сохраняем…' : 'Задать новый пароль'}
              </button>

              <Link className="auth-link-button form-field--wide" to="/login">
                Вернуться ко входу
              </Link>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default ResetPasswordPage;
