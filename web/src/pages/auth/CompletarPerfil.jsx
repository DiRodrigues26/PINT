import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import SplitLayout from '../../components/SplitLayout';

const PERFIS = [
  { valor: 'Consultor', rotulo: 'Consultor' },
  { valor: 'Service Line', rotulo: 'Service Line Leader' },
  { valor: 'Talent Manager', rotulo: 'Talent Manager' },
];

export default function CompletarPerfil() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { recarregar } = useAuth();

  const [nome, setNome] = useState('');
  const [perfil, setPerfil] = useState('');
  const [idServiceLine, setIdServiceLine] = useState('');
  const [idArea, setIdArea] = useState('');
  const [serviceLines, setServiceLines] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/publico/service-lines')
      .then(({ data }) => setServiceLines(data.dados || []))
      .catch(() => {});
    api.get('/publico/areas?ativo=1')
      .then(({ data }) => setAreas(data.dados || []))
      .catch(() => {});
  }, []);

  // Consultor escolhe a sua ÁREA (req 2); Service Line Leader escolhe a sua Service Line
  const precisaArea = perfil === 'Consultor';
  const precisaServiceLine = perfil === 'Service Line';
  const podeSubmeter =
    nome.trim().length > 0 &&
    perfil.length > 0 &&
    (!precisaArea || idArea) &&
    (!precisaServiceLine || idServiceLine) &&
    !loading;

  async function submeter(e) {
    e.preventDefault();
    if (!podeSubmeter) return;
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/completar-perfil', {
        token,
        nome,
        perfil,
        id_area: idArea ? Number(idArea) : null,
        id_service_line: idServiceLine ? Number(idServiceLine) : null,
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
          <label htmlFor="perfil" className="label">Perfil</label>
          <select
            id="perfil"
            required
            value={perfil}
            onChange={(e) => { setPerfil(e.target.value); setIdServiceLine(''); setIdArea(''); }}
            className="input"
          >
            <option value="">Tipo de perfil</option>
            {PERFIS.map((p) => (
              <option key={p.valor} value={p.valor}>{p.rotulo}</option>
            ))}
          </select>
        </div>

        {/* Consultor → escolhe a sua Área (req 2) */}
        {precisaArea && (
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
        )}

        {/* Service Line Leader → escolhe a sua Service Line */}
        {precisaServiceLine && (
          <div>
            <label htmlFor="service-line" className="label">Service Line</label>
            <select
              id="service-line"
              required
              value={idServiceLine}
              onChange={(e) => setIdServiceLine(e.target.value)}
              className="input"
            >
              <option value="">Escolhe a tua Service Line</option>
              {serviceLines.map((sl) => (
                <option key={sl.id_service_line} value={sl.id_service_line}>{sl.nome}</option>
              ))}
            </select>
          </div>
        )}

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
