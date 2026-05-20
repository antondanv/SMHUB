import apiClient from './apiClient';

export async function getFeatured(section) {
  const response = await apiClient.get('/home/featured', { params: { section } });
  return response.data;
}

export async function listFeaturedAdmin(section = null) {
  const params = section ? { section } : {};
  const response = await apiClient.get('/admin/featured', { params });
  return response.data;
}

export async function createFeatured({ section, material_id, position, is_active }) {
  const response = await apiClient.post('/admin/featured', {
    section,
    material_id,
    position,
    is_active,
  });
  return response.data;
}

export async function updateFeatured(itemId, data) {
  const response = await apiClient.patch(`/admin/featured/${itemId}`, data);
  return response.data;
}

export async function deleteFeatured(itemId) {
  await apiClient.delete(`/admin/featured/${itemId}`);
}
