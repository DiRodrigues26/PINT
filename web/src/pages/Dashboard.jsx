import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Carregando from '../components/Carregando';
import { estadoCandidatura } from '../lib/formatar';
import { Link } from 'react-router-dom';

function Stat({ titulo, valor, sub }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="text-sm text-slate-500">{titulo}</div>
        <div className="mt-1 text-3xl font-bold text-slate-900">{valor ?? 0}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { utilizador, saudacao } = useAuth();

  const consQuery = useQuery({
    queryKey: ['dashboard', 'consultor'],
    queryFn: async () => (await api.get('/api/estatisticas/consultor')).data,
  });

  const gestorQuery = useQuery({
    queryKey: ['dashboard', 'gestor'],
    queryFn: async () => (await api.get('/api/estatisticas/gestor')).data,
    enabled: utilizador?.perfis?.some((p) => ['Administrador', 'Talent Manager', 'Service Line'].includes(p)) || false,
  });

  if (consQuery.isLoading) return <Carregando />;

  const c = consQuery.data || {};
  const g = gestorQuery.data;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">{saudacao || `Olá, ${utilizador?.nome?.split(' ')[0] || ''}!`}</h1>
        <p className="text-sm text-slate-500">Aqui está um resumo da tua atividade na plataforma.</p>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">A minha atividade</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat titulo="Badges obtidos" valor={c.badges_obtidos} />
          <Stat titulo="Pontos totais" valor={c.pontos_totais} />
          <Stat titulo="Conquistas" valor={c.conquistas} />
          <Stat
            titulo="Candidaturas abertas"
            valor={(c.candidaturas_por_estado || [])
              .filter((e) => !['APPROVED', 'REJECTED', 'CLOSED'].includes(e.estado_atual))
              .reduce((s, e) => s + Number(e.total), 0)}
          />
        </div>
      </section>

      {c.candidaturas_por_estado?.length > 0 && (
        <section className="card">
          <div className="card-body">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Candidaturas por estado</h2>
            <ul className="mt-3 space-y-2">
              {c.candidaturas_por_estado.map((e) => {
                const info = estadoCandidatura(e.estado_atual);
                return (
                  <li key={e.estado_atual} className="flex items-center justify-between text-sm">
                    <span className={`badge-pill ${info.cor}`}>{info.label}</span>
                    <span className="font-semibold">{e.total}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4">
              <Link to="/candidaturas" className="text-sm text-softinsa-600 hover:underline">Ver candidaturas →</Link>
            </div>
          </div>
        </section>
      )}

      {c.progresso_niveis?.length > 0 && (
        <section className="card">
          <div className="card-body">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Progresso na tua área</h2>
            <div className="mt-3 divide-y">
              {c.progresso_niveis.map((n) => (
                <div key={`${n.id_nivel}-${n.id_badge || 'x'}`} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold">{n.codigo_nivel}</span>
                    <span className="text-slate-500"> — {n.nome_nivel}</span>
                    {n.titulo && <span className="text-slate-700"> · {n.titulo}</span>}
                  </div>
                  {n.obtido ? (
                    <span className="badge-pill bg-emerald-100 text-emerald-800">✓ Obtido</span>
                  ) : n.id_badge ? (
                    <Link to={`/badges/${n.id_badge}`} className="text-softinsa-600 text-xs hover:underline">Ver badge →</Link>
                  ) : (
                    <span className="text-xs text-slate-400">Sem badge</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {g && (
        <section>
          <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Visão geral (gestão)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat titulo="Utilizadores" valor={g.total_utilizadores} />
            <Stat titulo="Badges ativos" valor={g.total_badges_ativos} />
            <Stat titulo="Badges atribuídos" valor={g.total_badges_atribuidos} />
            <Stat titulo="Candidaturas abertas" valor={g.total_candidaturas_abertas} />
          </div>
        </section>
      )}
    </div>
  );
}
