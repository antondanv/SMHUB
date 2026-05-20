export function isAdminUser(user) {
  return user?.role_name === 'admin' || user?.role === 'admin';
}
