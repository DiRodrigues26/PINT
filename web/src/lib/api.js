import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

export function obterToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

export function guardarToken(token, persistente = true) {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  if (persistente) localStorage.setItem('token', token);
  else sessionStorage.setItem('token', token);
}

export function limparToken() {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
}

export const api = axios.create({
  baseURL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = obterToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const msg = err.response?.data?.erro || '';
      if (msg.toLowerCase().includes('expirado')) {
        limparToken();
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
