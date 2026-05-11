import axios from 'axios';

const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const defaultBaseURL = isDevelopment ? 'http://localhost:8000' : '/api';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
