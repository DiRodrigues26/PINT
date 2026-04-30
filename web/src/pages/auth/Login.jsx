import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import SplitLayout from '../../components/SplitLayout';
import InputPassword from '../../components/InputPassword';

function destinoAposLogin(utilizador) {
  return utilizador?.perfis?.includes('Administrador') ? '/admin' : '/';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guardarLogin, setGuardarLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submetido, setSubmetido] = useState(false);
  const [erroCredenciais, setErroCredenciais] = useState(false);
  const { login, utilizador } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const emailGuardado = localStorage.getItem('email_guardado');
    if (emailGuardado) setEmail(emailGuardado);
  }, []);

  useEffect(() => {
    if (utilizador) navigate(destinoAposLogin(utilizador), { replace: true });
  }, [utilizador, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expirou') === '1') {
      toast.error('A sua sessão expirou. Inicie sessão novamente.');
    }
  }, [location.search]);

  const emailNormalizado = email.trim();
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado);
  const emailInvalido = submetido && (!emailNormalizado || !emailValido || erroCredenciais);
  const passwordInvalida = submetido && (!password || erroCredenciais);
  const podeSubmeter = emailNormalizado.length > 0 && emailValido && password.length > 0 && !loading;

  async function submeter(e) {
    e.preventDefault();
    setSubmetido(true);
    setErroCredenciais(false);
    if (!podeSubmeter) {
      toast.error('Preencha o email e a password.');
      return;
    }
    setLoading(true);
    const r = await login(emailNormalizado, password);
    setLoading(false);

    if (r.ok) {
      if (guardarLogin) localStorage.setItem('email_guardado', emailNormalizado);
      else localStorage.removeItem('email_guardado');

      toast.success(r.dados?.saudacao || 'Bem-vindo!');
      if (r.dados?.utilizador?.primeiro_login_pendente) {
        navigate('/alterar-password-inicial');
      } else {
        navigate(destinoAposLogin(r.dados?.utilizador));
      }
    } else {
      setErroCredenciais(true);
      toast.error(r.erro);
    }
  }

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
            id="email"
            type="email"
            autoComplete="email"
            placeholder="exemplo@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErroCredenciais(false);
            }}
            className={`input ${emailInvalido ? 'border-rose-500 ring-2 ring-rose-100' : ''}`}
          />
          {submetido && !emailNormalizado && <p className="mt-1 text-xs text-rose-600">Email obrigatório.</p>}
          {submetido && emailNormalizado && !emailValido && <p className="mt-1 text-xs text-rose-600">Email inválido.</p>}
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <InputPassword
            id="password"
            value={password}
            required={false}
            onChange={(e) => {
              setPassword(e.target.value);
              setErroCredenciais(false);
            }}
            className={passwordInvalida ? 'border-rose-500 ring-2 ring-rose-100' : ''}
          />
          {submetido && !password && <p className="mt-1 text-xs text-rose-600">Password obrigatória.</p>}
          {erroCredenciais && <p className="mt-1 text-xs text-rose-600">Credenciais inválidas. Confirme o email e a password.</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'A entrar…' : 'Login'}
        </button>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-softinsa-500 focus:ring-softinsa-200"
            checked={guardarLogin}
            onChange={(e) => setGuardarLogin(e.target.checked)}
          />
          Guardar login?
        </label>

        <div className="text-sm text-slate-600">
          Esqueceu-se da password? <Link to="/recuperar" className="link font-medium">Restaurar Password</Link>
        </div>
      </form>
    </SplitLayout>
  );
}
