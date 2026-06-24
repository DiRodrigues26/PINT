import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { contemEmoji } from '../../lib/validacao';
import SplitLayout from '../../components/SplitLayout';
import InputPassword from '../../components/InputPassword';

export default function Registo() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [idArea, setIdArea] = useState('');
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submetido, setSubmetido] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/publico/areas?ativo=1')
      .then(({ data }) => setAreas(data.dados || []))
      .catch(() => {});
  }, []);

  const nomeNormalizado = nome.trim();
  const emailNormalizado = email.trim();
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado);
  const nomeTemEmoji = contemEmoji(nomeNormalizado);
  const emailTemEmoji = contemEmoji(emailNormalizado);
  const passwordTemEmoji = contemEmoji(password);
  const podeSubmeter =
    nomeNormalizado.length > 0 && !nomeTemEmoji &&
    emailNormalizado.length > 0 && emailValido && !emailTemEmoji &&
    password.length >= 8 && !passwordTemEmoji &&
    idArea && !loading;

  async function submeter(e) {
    e.preventDefault();
    setSubmetido(true);
    if (!podeSubmeter) return;
    setLoading(true);
    try {
      await api.post('/api/auth/registo', {
        nome: nomeNormalizado,
        email: emailNormalizado,
        password,
        id_area: Number(idArea),
      });
      toast.success('Bem-vindo! Enviámos um email de confirmação.');
      navigate('/verificar-email', { state: { email: emailNormalizado, bemVindo: true } });
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
          <label htmlFor="nome" className="label">Nome</label>
          <input
            id="nome"
            type="text"
            required
            autoComplete="name"
            placeholder="O teu nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={`input ${nomeTemEmoji || (submetido && !nomeNormalizado) ? 'border-rose-500 ring-2 ring-rose-100' : ''}`}
          />
          {nomeTemEmoji ? (
            <p className="mt-1 text-xs text-rose-600">O nome não pode conter emojis.</p>
          ) : submetido && !nomeNormalizado ? (
            <p className="mt-1 text-xs text-rose-600">Nome obrigatório.</p>
          ) : null}
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
            className={`input ${emailTemEmoji || (submetido && !emailValido) ? 'border-rose-500 ring-2 ring-rose-100' : ''}`}
          />
          {emailTemEmoji ? (
            <p className="mt-1 text-xs text-rose-600">O email não pode conter emojis.</p>
          ) : submetido && !emailNormalizado ? (
            <p className="mt-1 text-xs text-rose-600">Email obrigatório.</p>
          ) : submetido && !emailValido ? (
            <p className="mt-1 text-xs text-rose-600">Email inválido.</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="area" className="label">Área</label>
          <select
            id="area"
            required
            value={idArea}
            onChange={(e) => setIdArea(e.target.value)}
            className={`input ${submetido && !idArea ? 'border-rose-500 ring-2 ring-rose-100' : ''}`}
          >
            <option value="">Escolhe a tua área</option>
            {areas.map((a) => (
              <option key={a.id_area} value={a.id_area}>
                {a.nome}{a.nome_service_line ? ` — ${a.nome_service_line}` : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">Verás os badges preferenciais da tua área ao entrar.</p>
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <InputPassword
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            className={passwordTemEmoji || (submetido && password.length < 8) ? 'border-rose-500 ring-2 ring-rose-100' : ''}
          />
          {passwordTemEmoji ? (
            <p className="mt-1 text-xs text-rose-600">A password não pode conter emojis.</p>
          ) : submetido && password.length < 8 ? (
            <p className="mt-1 text-xs text-rose-600">Mínimo 8 caracteres.</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres.</p>
          )}
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
