import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import SplitLayout from '../../components/SplitLayout';
import InputPassword from '../../components/InputPassword';

export default function NovaPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [submetido, setSubmetido] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const navigate = useNavigate();

  const podeSubmeter =
    password.length >= 8 &&
    confirmar.length >= 8 &&
    password === confirmar &&
    !loading;

  async function submeter(e) {
    e.preventDefault();
    setSubmetido(true);
    if (!podeSubmeter) {
      toast.error('Preencha corretamente a nova password.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/redefinir-password', {
        token,
        nova_password: password,
        confirmar_password: confirmar,
      });
      setSucesso(true);
      toast.success('A sua password foi redefinida com sucesso');
    } catch (err) {
      toast.error(extrairErro(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SplitLayout>
      {sucesso ? (
        <div className="space-y-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">✓</div>
          <h1 className="text-3xl font-extrabold tracking-tight">Password redefinida</h1>
          <p className="text-sm leading-6 text-slate-600">A sua password foi redefinida com sucesso.</p>
          <button type="button" className="btn-primary w-full" onClick={() => navigate('/login')}>
            Voltar ao login
          </button>
        </div>
      ) : (
      <form onSubmit={submeter} className="space-y-5" noValidate>
        <h1 className="text-4xl font-extrabold tracking-tight">Nova password</h1>

        <div>
          <label htmlFor="password" className="label">Nova password</label>
          <InputPassword
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required={false}
            minLength={8}
            className={submetido && password.length < 8 ? 'border-rose-500 ring-2 ring-rose-100' : ''}
          />
          {submetido && password.length < 8 && <p className="mt-1 text-xs text-rose-600">Nova password obrigatória com pelo menos 8 caracteres.</p>}
        </div>

        <div>
          <label htmlFor="confirmar" className="label">Confirmar nova password</label>
          <InputPassword
            id="confirmar"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            autoComplete="new-password"
            required={false}
            minLength={8}
            className={submetido && (confirmar.length < 8 || password !== confirmar) ? 'border-rose-500 ring-2 ring-rose-100' : ''}
          />
          {submetido && confirmar.length < 8 && <p className="mt-1 text-xs text-rose-600">Confirmação obrigatória.</p>}
          {confirmar.length > 0 && password !== confirmar && (
            <p className="mt-1 text-xs text-rose-600">As passwords não coincidem.</p>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'A atualizar…' : 'Atualizar password'}
        </button>

        <div className="text-sm">
          <Link to="/login" className="link font-medium">Cancelar</Link>
        </div>
      </form>
      )}
    </SplitLayout>
  );
}
