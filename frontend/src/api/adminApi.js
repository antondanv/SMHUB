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

export async function deleteAdminUser(userId) {
  await apiClient.delete(`/admin/users/${userId}`);
}

export async function approveRoleRequest(userId) {
  const response = await apiClient.post(`/admin/users/${userId}/role-request/approve`);
  return response.data;
}

export async function rejectRoleRequest(userId) {
  const response = await apiClient.post(`/admin/users/${userId}/role-request/reject`);
  return response.data;
}

// References CRUD
export async function createReference(type, data) {
  const response = await apiClient.post(`/admin/${type}`, data);
  return response.data;
}

export async function updateReference(type, id, data) {
  const response = await apiClient.patch(`/admin/${type}/${id}`, data);
  return response.data;
}

export async function deleteReference(type, id) {
  await apiClient.delete(`/admin/${type}/${id}`);
}

export async function getAuditLog(params = {}) {
  const response = await apiClient.get('/admin/audit', { params });
  return response.data;
}
