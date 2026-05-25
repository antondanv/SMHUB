export function isAdminUser(user) {
  return user?.role_name === 'admin' || user?.role === 'admin';
}

export function isTeacherUser(user) {
  return user?.role_name === 'teacher' || user?.role === 'teacher';
}

export function canPublishWithoutModeration(user) {
  return isAdminUser(user) || isTeacherUser(user);
}

export function hasPendingTeacherRequest(user) {
  return user?.requested_role_name === 'teacher';
}
