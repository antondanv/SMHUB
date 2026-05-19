import apiClient from './apiClient';

export async function getMaterials(params = {}) {
  const response = await apiClient.get('/materials', { params });
  return response.data;
}

export async function getMaterialById(id) {
  const response = await apiClient.get(`/materials/${id}`);
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
