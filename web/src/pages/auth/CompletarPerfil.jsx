import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import SplitLayout from '../../components/SplitLayout';

const PERFIL_PUBLICO = 'Consultor';

export default function CompletarPerfil() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { recarregar } = useAuth();

  const [nome, setNome] = useState('');
  const [idArea, setIdArea] = useState('');
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/publico/areas?ativo=1')
      .then(({ data }) => setAreas(data.dados || []))
      .catch(() => {});
  }, []);

  const podeSubmeter =
    nome.trim().length > 0 &&
    idArea &&
    !loading;

  async function submeter(e) {
    e.preventDefault();
    if (!podeSubmeter) return;
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/completar-perfil', {
        token,
        nome,
        perfil: PERFIL_PUBLICO,
        id_area: idArea ? Number(idArea) : null,
      });
      if (data.token) {
        localStorage.setItem('token', data.token);
        await recarregar();
        toast.success(data.saudacao || 'Bem-vindo!');
        navigate('/');
      } else {
        toast.success('Registo concluído! Inicie sessão.');
        navigate('/login');
      }
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
            className="input"
          />
        </div>

        <div>
          <label htmlFor="area" className="label">Área</label>
          <select
            id="area"
            required
            value={idArea}
            onChange={(e) => setIdArea(e.target.value)}
            className="input"
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

        <button type="submit" disabled={!podeSubmeter} className="btn-primary w-full mt-2">
          {loading ? 'A concluir…' : 'Registar'}
        </button>

        <div className="text-sm text-slate-600">
          Já tem uma conta? <a href="/login" className="link font-medium">Voltar ao login</a>
        </div>
      </form>
    </SplitLayout>
  );
}
