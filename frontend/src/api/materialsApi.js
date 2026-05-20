import apiClient from './apiClient';

function joinApiPath(path) {
  const baseUrl = (apiClient.defaults.baseURL || '').replace(/\/$/, '');
  return `${baseUrl}${path}`;
}

export async function getMyMaterials(params = {}) {
  const response = await apiClient.get('/materials/me', { params });
  return response.data;
}

export async function getMaterials(params = {}) {
  const response = await apiClient.get('/materials', { params });
  return response.data;
}

export async function rateMaterial(id, value) {
  const response = await apiClient.post(`/materials/${id}/rating`, null, { params: { value } });
  return response.data;
}

export async function updateRating(id, value) {
  const response = await apiClient.patch(`/materials/${id}/rating`, null, { params: { value } });
  return response.data;
}

export async function likeMaterial(id) {
  const response = await apiClient.post(`/materials/${id}/like`);
  return response.data;
}

export async function unlikeMaterial(id) {
  const response = await apiClient.delete(`/materials/${id}/like`);
  return response.data;
}

export async function getMaterialById(id) {
  const response = await apiClient.get(`/materials/${id}`);
  return response.data;
}

export function getMaterialFileUrl(id) {
  return joinApiPath(`/materials/${id}/file`);
}

export async function getMaterialPreview(id) {
  const response = await apiClient.get(`/materials/${id}/preview`);
  return response.data;
}

export async function updateMaterial(id, data) {
  const response = await apiClient.patch(`/materials/${id}`, data);
  return response.data;
}

export async function deleteMaterial(id) {
  await apiClient.delete(`/materials/${id}`);
}

export async function createMaterial(materialData) {
  const formData = new FormData();

  formData.append('title', materialData.title);
  formData.append('description', materialData.description);
  formData.append('subject_id', String(materialData.subject_id));
  formData.append('material_type_id', String(materialData.material_type_id));
  formData.append('course_id', String(materialData.course_id));
  formData.append('program_id', String(materialData.program_id));
  formData.append('file', materialData.file);

  const response = await apiClient.post('/materials', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

export async function downloadMaterial(materialId) {
  const response = await apiClient.get(`/materials/${materialId}/download`, {
    responseType: 'blob',
  });

  return {
    blob: response.data,
    contentType: response.headers['content-type'],
  };
}

export async function getMaterialComments(materialId) {
  const response = await apiClient.get(`/materials/${materialId}/comments`);

  return response.data;
}

export async function createMaterialComment(materialId, content) {
  const response = await apiClient.post(`/materials/${materialId}/comments`, { content });

  return response.data;
}

export async function updateMaterialComment(commentId, content) {
  const response = await apiClient.patch(`/comments/${commentId}`, { content });

  return response.data;
}

export async function deleteMaterialComment(commentId) {
  await apiClient.delete(`/comments/${commentId}`);
}

export async function addMaterialToFavorites(materialId) {
  const response = await apiClient.post(`/materials/${materialId}/favorite`);

  return response.data;
}

export async function removeMaterialFromFavorites(materialId) {
  const response = await apiClient.delete(`/materials/${materialId}/favorite`);

  return response.data;
}

export async function getMyFavorites() {
  const response = await apiClient.get('/users/me/favorites');

  return response.data;
}

export async function getModerationQueue(params = {}) {
  const response = await apiClient.get('/moderation/materials', { params });
  return response.data;
}

export async function moderateMaterial(materialId, status, comment = null) {
  const response = await apiClient.patch(`/moderation/materials/${materialId}`, {
    status,
    comment,
  });
  return response.data;
}

export async function getModerationHistory(materialId) {
  const response = await apiClient.get(`/moderation/materials/${materialId}/history`);
  return response.data;
}

export async function bulkModerate(ids, action, comment = null) {
  const response = await apiClient.post('/moderation/bulk', { ids, action, comment });
  return response.data;
}
