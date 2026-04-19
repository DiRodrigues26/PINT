import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../lib/api';
import SplitLayout from '../components/SplitLayout';
import InputPassword from '../components/InputPassword';

export default function Registo() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const podeSubmeter = email.trim().length > 0 && password.length >= 8 && !loading;

  async function submeter(e) {
    e.preventDefault();
    if (!podeSubmeter) return;
    setLoading(true);
    try {
      await api.post('/api/auth/registo', { email, password });
      toast.success('Enviámos um email de confirmação.');
      navigate('/verificar-email', { state: { email } });
    } catch (err) {
      toast.error(extrairErro(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SplitLayout>
      <form onSubmit={submeter} className="space-y-5">
        <h1 className="text-4xl font-extrabold tracking-tight">Registar</h1>

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
            autoComplete="new-password"
            minLength={8}
          />
          <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres.</p>
        </div>

        <button type="submit" disabled={!podeSubmeter} className="btn-primary w-full">
          {loading ? 'A criar conta…' : 'Registar'}
        </button>

        <div className="text-sm text-slate-600">
          Já tem uma conta? <Link to="/login" className="link font-medium">Voltar ao login</Link>
        </div>
      </form>
    </SplitLayout>
  );
}
