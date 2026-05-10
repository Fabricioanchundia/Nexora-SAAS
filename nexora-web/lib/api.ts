import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://177.7.58.244/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (globalThis.window !== undefined) {
    const token     = globalThis.localStorage.getItem('nexora_token');
    const companyId = globalThis.localStorage.getItem('nexora_company_id');

    if (token)     config.headers.Authorization    = `Bearer ${token}`;
    // ── Siempre enviar x-company-id si existe ──────────────────────
    if (companyId) config.headers['x-company-id'] = companyId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const axiosError = error as { response?: { status?: number } };
    if (axiosError.response?.status === 401 && globalThis.window !== undefined) {
      globalThis.localStorage.removeItem('nexora_token');
      globalThis.localStorage.removeItem('nexora_company_id');
      globalThis.localStorage.removeItem('nexora_user_name');
      globalThis.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;