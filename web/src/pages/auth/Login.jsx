import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, extrairErro, guardarToken } from '../../lib/api';
import SplitLayout from '../../components/SplitLayout';
import InputPassword from '../../components/InputPassword';

function destinoAposLogin(utilizador) {
  if (utilizador?.perfis?.includes('Administrador')) return '/admin';
  if (utilizador?.perfis?.includes('Consultor'))     return '/dashboard';
  return '/';
}

export default function Login() {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [guardarLogin, setGuardarLogin] = useState(true);
  const [loading, setLoading]         = useState(false);
  const [submetido, setSubmetido]     = useState(false);
  const [erroCredenciais, setErroCredenciais] = useState(false);

  /* ── Estado do step 2FA ─────────────────────────────────────────────── */
  const [requires2fa, setRequires2fa]       = useState(false);
  const [preAuthToken, setPreAuthToken]     = useState('');
  const [codigo2fa, setCodigo2fa]           = useState('');
  const [loading2fa, setLoading2fa]         = useState(false);
  const [erro2fa, setErro2fa]               = useState('');

  const { login, utilizador } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    const emailGuardado = localStorage.getItem('email_guardado');
    if (emailGuardado) setEmail(emailGuardado);
  }, []);

  useEffect(() => {
    if (utilizador) navigate(destinoAposLogin(utilizador), { replace: true });
  }, [utilizador, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expirou') === '1') toast.error('A sua sessão expirou. Inicie sessão novamente.');
  }, [location.search]);

  const emailNormalizado = email.trim();
  const emailValido      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado);
  const emailInvalido    = submetido && (!emailNormalizado || !emailValido || erroCredenciais);
  const passwordInvalida = submetido && (!password || erroCredenciais);
  const podeSubmeter     = emailNormalizado.length > 0 && emailValido && password.length > 0 && !loading;

  /* ── Step 1: email + password ───────────────────────────────────────── */
  async function submeter(e) {
    e.preventDefault();
    setSubmetido(true);
    setErroCredenciais(false);
    if (!podeSubmeter) { toast.error('Preencha o email e a password.'); return; }

    setLoading(true);
    const r = await login(emailNormalizado, password, { guardarLogin });
    setLoading(false);

    if (r.ok) {
      if (r.dados?.requires_2fa) {
        /* Servidor pediu 2FA — não há token ainda */
        setPreAuthToken(r.dados.pre_auth_token);
        setRequires2fa(true);
        return;
      }
      if (guardarLogin) localStorage.setItem('email_guardado', emailNormalizado);
      else localStorage.removeItem('email_guardado');

      toast.success(r.dados?.saudacao || 'Bem-vindo!');
      if (r.dados?.utilizador?.primeiro_login_pendente) navigate('/alterar-password-inicial');
      else navigate(destinoAposLogin(r.dados?.utilizador));
    } else {
      setErroCredenciais(true);
      toast.error(r.erro);
    }
  }

  /* ── Step 2: código 2FA ─────────────────────────────────────────────── */
  async function submeter2fa(e) {
    e.preventDefault();
    if (codigo2fa.length !== 6) { setErro2fa('Insere um código de 6 dígitos.'); return; }
    setErro2fa('');
    setLoading2fa(true);
    try {
      const { data } = await api.post('/api/auth/verificar-2fa', {
        pre_auth_token: preAuthToken,
        codigo: codigo2fa,
      });
      guardarToken(data.token, guardarLogin);
      if (guardarLogin) localStorage.setItem('email_guardado', emailNormalizado);
      else localStorage.removeItem('email_guardado');
      toast.success(data.saudacao || 'Bem-vindo!');
      /* Recarrega o utilizador via AuthContext */
      window.location.href = destinoAposLogin(data.utilizador);
    } catch (err) {
      setErro2fa(extrairErro(err, 'Código inválido. Tenta novamente.'));
    } finally {
      setLoading2fa(false);
    }
  }

  /* ── Render: step 2FA ───────────────────────────────────────────────── */
  if (requires2fa) {
    return (
      <SplitLayout>
        <form onSubmit={submeter2fa} className="space-y-5" noValidate>
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-softinsa-100">
              <Shield className="h-7 w-7 text-softinsa-600" strokeWidth={1.8} />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Verificação 2FA</h1>
            <p className="mt-1 text-sm text-slate-500">
              Abre a tua aplicação de autenticação e insere<br />o código de 6 dígitos.
            </p>
          </div>

          <div>
            <label className="label">Código de Verificação</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={codigo2fa}
              onChange={e => { setCodigo2fa(e.target.value.replace(/\D/g, '').slice(0, 6)); setErro2fa(''); }}
              className={`input text-center text-2xl font-mono tracking-[0.5em] ${erro2fa ? 'border-rose-500 ring-2 ring-rose-100' : ''}`}
              autoFocus
            />
            {erro2fa && <p className="mt-1 text-xs text-rose-600">{erro2fa}</p>}
          </div>

          <button type="submit" disabled={loading2fa || codigo2fa.length !== 6} className="btn-primary w-full">
            {loading2fa ? 'A verificar…' : 'Verificar'}
          </button>

          <button
            type="button"
            onClick={() => { setRequires2fa(false); setCodigo2fa(''); setPreAuthToken(''); }}
            className="w-full text-center text-sm text-slate-500 hover:text-slate-800"
          >
            ← Voltar ao login
          </button>
        </form>
      </SplitLayout>
    );
  }

  /* ── Render: step email + password ──────────────────────────────────── */
  return (
    <SplitLayout>
      <form onSubmit={submeter} className="space-y-5" noValidate>
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Bem vindo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ainda não tem uma conta? <Link to="/registo" className="link font-medium">crie uma</Link>
          </p>
        </div>

        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email" type="email" autoComplete="email" placeholder="exemplo@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setErroCredenciais(false); }}
            className={`input ${emailInvalido ? 'border-rose-500 ring-2 ring-rose-100' : ''}`}
          />
          {submetido && !emailNormalizado && <p className="mt-1 text-xs text-rose-600">Email obrigatório.</p>}
          {submetido && emailNormalizado && !emailValido && <p className="mt-1 text-xs text-rose-600">Email inválido.</p>}
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <InputPassword
            id="password" value={password} required={false}
            onChange={e => { setPassword(e.target.value); setErroCredenciais(false); }}
            className={passwordInvalida ? 'border-rose-500 ring-2 ring-rose-100' : ''}
          />
          {submetido && !password && <p className="mt-1 text-xs text-rose-600">Password obrigatória.</p>}
          {erroCredenciais && <p className="mt-1 text-xs text-rose-600">Credenciais inválidas. Confirme o email e a password.</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'A entrar…' : 'Login'}
        </button>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-softinsa-500 focus:ring-softinsa-200" checked={guardarLogin} onChange={e => setGuardarLogin(e.target.checked)} />
          Guardar login?
        </label>

        <div className="text-sm text-slate-600">
          Esqueceu-se da password? <Link to="/recuperar" className="link font-medium">Restaurar Password</Link>
        </div>
      </form>
    </SplitLayout>
  );
}
