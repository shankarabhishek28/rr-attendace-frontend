import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginRequest = (employeeId, password) =>
  api.post('/api/auth/login', { employeeId, password });

export default api;
