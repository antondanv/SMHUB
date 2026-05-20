import apiClient from './apiClient';

export async function getDashboardSummary() {
  const response = await apiClient.get('/admin/dashboard/summary');
  return response.data;
}

export async function getDashboardTimeseries(metric, period) {
  const response = await apiClient.get('/admin/dashboard/timeseries', {
    params: { metric, period },
  });
  return response.data;
}

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
