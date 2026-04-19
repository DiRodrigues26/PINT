import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import SplitLayout from '../components/SplitLayout';
import InputPassword from '../components/InputPassword';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guardarLogin, setGuardarLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login, utilizador } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const emailGuardado = localStorage.getItem('email_guardado');
    if (emailGuardado) setEmail(emailGuardado);
  }, []);

  useEffect(() => {
    if (utilizador) navigate('/', { replace: true });
  }, [utilizador, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expirou') === '1') {
      toast.error('A sua sessão expirou. Inicie sessão novamente.');
    }
  }, [location.search]);

  const podeSubmeter = email.trim().length > 0 && password.length > 0 && !loading;

  async function submeter(e) {
    e.preventDefault();
    if (!podeSubmeter) return;
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);

    if (r.ok) {
      if (guardarLogin) localStorage.setItem('email_guardado', email);
      else localStorage.removeItem('email_guardado');

      toast.success(r.dados?.saudacao || 'Bem-vindo!');
      if (r.dados?.utilizador?.primeiro_login_pendente) {
        navigate('/alterar-password-inicial');
      } else {
        navigate('/');
      }
    } else {
      toast.error(r.erro);
    }
  }

  return (
    <SplitLayout>
      <form onSubmit={submeter} className="space-y-5">
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
            required
            autoComplete="email"
            placeholder="exemplo@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <InputPassword
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={!podeSubmeter} className="btn-primary w-full">
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
