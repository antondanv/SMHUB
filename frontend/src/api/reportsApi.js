import apiClient from './apiClient';

export async function createReport({ target_type, target_id, reason, comment }) {
  const response = await apiClient.post('/reports', {
    target_type,
    target_id,
    reason,
    comment: comment || null,
  });
  return response.data;
}

export async function getReports(statusFilter = null) {
  const params = statusFilter ? { status: statusFilter } : {};
  const response = await apiClient.get('/admin/reports', { params });
  return response.data;
}

export async function getOpenReportsCount() {
  const response = await apiClient.get('/admin/reports/open_count');
  return response.data.count;
}

export async function resolveReport(reportId, status, action = 'none') {
  const response = await apiClient.patch(`/admin/reports/${reportId}`, { status, action });
  return response.data;
}
