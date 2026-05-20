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
