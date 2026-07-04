import axios from 'axios';

const client = axios.create({
  baseURL: '/api/v1',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('orchestrator_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('orchestrator_token');
      localStorage.removeItem('orchestrator_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
