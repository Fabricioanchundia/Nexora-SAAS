import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('nexora_token');
    const companyId = localStorage.getItem('nexora_company_id');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (companyId) {
      config.headers['x-company-id'] = companyId;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nexora_token');
        localStorage.removeItem('nexora_company_id');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;