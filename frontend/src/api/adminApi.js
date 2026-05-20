import apiClient from './apiClient';

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
