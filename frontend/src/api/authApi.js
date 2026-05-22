import apiClient from './apiClient';

export const TOKEN_KEY = 'token';

export async function registerUser(userData) {
  const response = await apiClient.post('/auth/register', userData);

  return response.data;
}

export async function registerAdmin(userData) {
  const response = await apiClient.post('/auth/admin/register', userData);

  return response.data;
}

export async function loginUser(loginData) {
  const response = await apiClient.post('/auth/login', loginData);

  localStorage.setItem(TOKEN_KEY, response.data.access_token);

  return response.data;
}

export async function forgotPassword(payload) {
  const response = await apiClient.post('/auth/forgot-password', payload);

  return response.data;
}

export async function changePassword(payload) {
  const response = await apiClient.post('/users/me/password', payload);

  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');

  return response.data;
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function logoutUser() {
  localStorage.removeItem(TOKEN_KEY);
}
