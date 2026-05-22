export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// Подсказка под полем пароля — должна соответствовать политике на бэкенде
// (app/core/security.py: validate_password_strength).
export const PASSWORD_HINT =
  'Минимум 8 символов, обязательно латинские буквы и цифры. ' +
  'Разрешены буквы A–Z, a–z, цифры 0–9 и спецсимволы (!@#$%… и др.).';

/**
 * Проверить пароль по единой политике.
 * @returns {string|null} текст ошибки или null, если пароль подходит.
 */
export function validatePassword(password) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Пароль должен содержать минимум ${PASSWORD_MIN_LENGTH} символов.`;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Пароль не должен превышать ${PASSWORD_MAX_LENGTH} символов.`;
  }

  if (!/[a-zA-Z]/.test(password)) {
    return 'Пароль должен содержать хотя бы одну букву.';
  }

  if (!/[0-9]/.test(password)) {
    return 'Пароль должен содержать хотя бы одну цифру.';
  }

  return null;
}

/**
 * Проверить пароль и его подтверждение вместе.
 * @returns {string|null} текст ошибки или null.
 */
export function validatePasswordWithConfirmation(password, confirmation) {
  const error = validatePassword(password);

  if (error) {
    return error;
  }

  if (password !== confirmation) {
    return 'Пароли не совпадают.';
  }

  return null;
}
