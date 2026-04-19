import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import Carregando from '../components/Carregando';
import { estadoCandidatura, formatarDataHora } from '../lib/formatar';

const ESTADOS_PENDENTES = ['SUBMITTED', 'IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW'];

export default function Gestao() {
  const { data, isLoading } = useQuery({
    queryKey: ['gestao', 'pendentes'],
    queryFn: async () => (await api.get('/api/candidaturas')).data,
  });

  if (isLoading) return <Carregando />;

  const pendentes = (data?.dados || []).filter((c) => ESTADOS_PENDENTES.includes(c.estado_atual));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Gestão · Revisões pendentes</h1>
        <p className="text-sm text-slate-500">Candidaturas a aguardar a tua decisão.</p>
      </header>

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Badge</th>
              <th className="text-left px-4 py-3 font-semibold">Consultor</th>
              <th className="text-left px-4 py-3 font-semibold">Estado</th>
              <th className="text-left px-4 py-3 font-semibold">Submetida</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pendentes.map((c) => {
              const info = estadoCandidatura(c.estado_atual);
              return (
                <tr key={c.id_candidatura}>
                  <td className="px-4 py-3 font-semibold">{c.titulo_badge}</td>
                  <td className="px-4 py-3 text-slate-600">{c.nome_consultor}</td>
                  <td className="px-4 py-3"><span className={`badge-pill ${info.cor}`}>{info.label}</span></td>
                  <td className="px-4 py-3 text-slate-500">{formatarDataHora(c.data_submissao)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/candidaturas/${c.id_candidatura}`} className="text-softinsa-600 hover:underline">Abrir →</Link>
                  </td>
                </tr>
              );
            })}
            {pendentes.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Nada pendente. 🎉</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
