import apiClient from './apiClient';

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

export async function getMaterialById(materialId) {
  const response = await apiClient.get(`/materials/${materialId}`);

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

export async function getModerationQueue() {
  const response = await apiClient.get('/moderation/materials');

  return response.data;
}

export async function moderateMaterial(materialId, status) {
  const response = await apiClient.patch(`/moderation/materials/${materialId}`, { status });

  return response.data;
}
