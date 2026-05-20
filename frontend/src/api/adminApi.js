import apiClient from './apiClient';

export async function getDashboardSummary() {
  const response = await apiClient.get('/admin/dashboard/summary');
  return response.data;
}
