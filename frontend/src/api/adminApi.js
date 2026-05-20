import apiClient from './apiClient';

export async function getAdminUsers(params = {}) {
  const response = await apiClient.get('/admin/users', { params });
  return response.data;
}

export async function getAdminUser(userId) {
  const response = await apiClient.get(`/admin/users/${userId}`);
  return response.data;
}

export async function updateAdminUser(userId, data) {
  const response = await apiClient.patch(`/admin/users/${userId}`, data);
  return response.data;
}
