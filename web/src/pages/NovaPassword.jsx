import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../lib/api';
import SplitLayout from '../components/SplitLayout';
import InputPassword from '../components/InputPassword';

export default function NovaPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const podeSubmeter =
    password.length >= 8 &&
    confirmar.length >= 8 &&
    password === confirmar &&
    !loading;

  async function submeter(e) {
    e.preventDefault();
    if (!podeSubmeter) return;
    setLoading(true);
    try {
      await api.post('/api/auth/redefinir-password', {
        token,
        nova_password: password,
        confirmar_password: confirmar,
      });
      toast.success('Password atualizada. Inicie sessão.');
      navigate('/login');
    } catch (err) {
      toast.error(extrairErro(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SplitLayout>
      <form onSubmit={submeter} className="space-y-5">
        <h1 className="text-4xl font-extrabold tracking-tight">Nova password</h1>

        <div>
          <label htmlFor="password" className="label">Nova password</label>
          <InputPassword
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        <div>
          <label htmlFor="confirmar" className="label">Confirmar nova password</label>
          <InputPassword
            id="confirmar"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />
          {confirmar.length > 0 && password !== confirmar && (
            <p className="mt-1 text-xs text-rose-600">As passwords não coincidem.</p>
          )}
        </div>

        <button type="submit" disabled={!podeSubmeter} className="btn-primary w-full">
          {loading ? 'A atualizar…' : 'Atualizar password'}
        </button>

        <div className="text-sm">
          <Link to="/login" className="link font-medium">Cancelar</Link>
        </div>
      </form>
    </SplitLayout>
  );
}
