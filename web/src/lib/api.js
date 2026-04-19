import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const msg = err.response?.data?.erro || '';
      if (msg.toLowerCase().includes('expirado')) {
        localStorage.removeItem('token');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?expirou=1';
        }
      }
    }
    return Promise.reject(err);
  },
);

export function extrairErro(err, fallback = 'Ocorreu um erro inesperado.') {
  return err?.response?.data?.erro || err?.message || fallback;
}
