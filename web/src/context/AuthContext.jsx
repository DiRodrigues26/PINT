import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, extrairErro } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilizador, setUtilizador] = useState(null);
  const [saudacao, setSaudacao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregarEu = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUtilizador(null);
      setCarregando(false);
      return;
    }
    try {
      const { data } = await api.get('/api/auth/eu');
      setUtilizador(data.utilizador);
    } catch {
      localStorage.removeItem('token');
      setUtilizador(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarEu();
  }, [carregarEu]);

  async function login(email, password) {
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      setUtilizador(data.utilizador);
      setSaudacao(data.saudacao);
      return { ok: true, dados: data };
    } catch (err) {
      return { ok: false, erro: extrairErro(err, 'Falha ao iniciar sessão.') };
    }
  }

  function logout() {
    localStorage.removeItem('token');
    setUtilizador(null);
    setSaudacao(null);
  }

  function temPerfil(...perfis) {
    if (!utilizador?.perfis) return false;
    return perfis.some((p) => utilizador.perfis.includes(p));
  }

  return (
    <AuthContext.Provider value={{ utilizador, saudacao, carregando, login, logout, temPerfil, recarregar: carregarEu }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth tem de ser usado dentro de <AuthProvider>');
  return ctx;
}
