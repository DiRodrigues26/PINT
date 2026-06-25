import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, extrairErro, guardarToken, limparToken, obterToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilizador, setUtilizador] = useState(null);
  const [saudacao, setSaudacao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregarEu = useCallback(async ({ silencioso = false } = {}) => {
    const token = obterToken();
    if (!token) {
      setUtilizador(null);
      setCarregando(false);
      return;
    }
    try {
      const { data } = await api.get('/api/auth/eu');
      setUtilizador(data.utilizador);
    } catch {
      // Em modo silencioso (logo após login) não destruímos a sessão por uma
      // falha transitória do /eu — mantemos o utilizador já carregado.
      if (!silencioso) {
        limparToken();
        setUtilizador(null);
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarEu();
  }, [carregarEu]);

  async function login(email, password, opcoes = {}) {
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      if (data.requires_2fa) {
        /* Não guardar token ainda — Login.jsx trata o step 2FA */
        return { ok: true, dados: data };
      }
      guardarToken(data.token, opcoes.guardarLogin !== false);
      setUtilizador(data.utilizador);
      setSaudacao(data.saudacao);
      // Enriquecer com os dados completos do /eu (área, service line, etc.),
      // que a resposta do login não traz. Silencioso: não desloga em falha.
      carregarEu({ silencioso: true });
      return { ok: true, dados: data };
    } catch (err) {
      return { ok: false, erro: extrairErro(err, 'Falha ao iniciar sessão.') };
    }
  }

  function logout() {
    limparToken();
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
