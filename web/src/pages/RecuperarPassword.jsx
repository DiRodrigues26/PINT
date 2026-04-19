import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../lib/api';
import SplitLayout from '../components/SplitLayout';

export default function RecuperarPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const podeSubmeter = email.trim().length > 0 && !loading;

  async function submeter(e) {
    e.preventDefault();
    if (!podeSubmeter) return;
    setLoading(true);
    try {
      await api.post('/api/auth/recuperar-password', { email });
      setEnviado(true);
    } catch (err) {
      toast.error(extrairErro(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SplitLayout>
      {enviado ? (
        <div className="space-y-5">
          <div className="w-14 h-14 rounded-full bg-softinsa-50 text-softinsa-500 flex items-center justify-center text-2xl">✉️</div>
          <h1 className="text-3xl font-extrabold tracking-tight">Verifica o teu email</h1>
          <p className="text-sm text-slate-600">
            Se existir uma conta associada a <span className="font-semibold">{email}</span>, receberás instruções para redefinir a password.
          </p>
          <Link to="/login" className="link text-sm">← Voltar ao login</Link>
        </div>
      ) : (
        <form onSubmit={submeter} className="space-y-5">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">Restaurar<br />password</h1>

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

          <button type="submit" disabled={!podeSubmeter} className="btn-primary w-full">
            {loading ? 'A enviar…' : 'Restaurar password'}
          </button>

          <div className="text-sm">
            <Link to="/login" className="link font-medium">Voltar ao login</Link>
          </div>
        </form>
      )}
    </SplitLayout>
  );
}
