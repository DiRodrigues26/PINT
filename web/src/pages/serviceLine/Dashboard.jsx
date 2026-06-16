import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts';
import { Users, Award, TrendingUp, Clock, Zap, TrendingDown, Eye } from 'lucide-react';
import { api } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';
import { useLanguage } from '../../context/LanguageContext';

function useDashboardSL() {
  return useQuery({
    queryKey: ['dashboard-service-line'],
    queryFn: async () => {
      const { data } = await api.get('/api/estatisticas/service-line');
      return data;
    },
    staleTime: 60_000,
  });
}

/* ─── KPI Card ─────────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, valor, variacao, positivo, labelMes }) {
  const cor = variacao === undefined ? '' : positivo ? 'text-emerald-600' : 'text-rose-500';
  const Seta = positivo ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-softinsa-50">
          <Icon className="h-4 w-4 text-softinsa-600" strokeWidth={1.8} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{valor}</p>
      {variacao !== undefined && (
        <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${cor}`}>
          <Seta className="h-3 w-3" strokeWidth={2} />
          <span>{variacao} {labelMes}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Cores dos níveis ──────────────────────────────────────────────── */
const NIVEL_COR = { A: '#1e3a5f', B: '#2563eb', C: '#4f46e5', D: '#7c3aed', E: '#6d28d9' };

/* ─── Cores dos estados ─────────────────────────────────────────────── */
const ESTADO_COR = {
  OPEN: '#64748b',
  SUBMITTED: '#f59e0b',
  IN_TALENT_REVIEW: '#3b82f6',
  IN_SERVICE_LINE_REVIEW: '#8b5cf6',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  SENT_BACK: '#f97316',
  CLOSED: '#1e3a5f',
};

/* ─── Tooltip customizado do Pie ────────────────────────────────────── */
function PieTooltip({ active, payload }) {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-slate-800">{name}</p>
      <p className="text-slate-500">{value} {t('sl_dash_candidaturas')}</p>
    </div>
  );
}

/* ─── Medalhões do ranking ──────────────────────────────────────────── */
const MEDALHA = ['bg-yellow-400', 'bg-slate-300', 'bg-amber-600'];

export default function ServiceLineDashboard() {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useDashboardSL();
  const [filtroArea, setFiltroArea] = useState('');
  const navigate = useNavigate();

  /* Estado labels (derived from t so they react to language changes) */
  const ESTADO_LABEL = {
    OPEN:                   t('sl_dash_estado_em_aberto'),
    SUBMITTED:              t('sl_dash_estado_submetidos'),
    IN_TALENT_REVIEW:       t('sl_dash_estado_talent'),
    IN_SERVICE_LINE_REVIEW: t('sl_dash_estado_sl'),
    APPROVED:               t('sl_dash_estado_aprovados'),
    REJECTED:               t('sl_dash_estado_rejeitados'),
    SENT_BACK:              t('sl_dash_estado_devolvidos'),
    CLOSED:                 t('sl_dash_estado_fechados'),
  };

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f6fa]">
      <Carregando />
    </div>
  );

  if (isError) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f6fa]">
      <p className="text-sm text-slate-500">{t('sl_dash_erro')}</p>
    </div>
  );

  const {
    nome_service_line,
    total_consultores = 0,
    total_badges_emitidos = 0,
    badges_este_mes = 0,
    pedidos_em_validacao = 0,
    pontuacao_total = 0,
    badges_por_nivel = [],
    estados_candidatura = [],
    aprovacao_mensal = [],
    consultores = [],
    ranking = [],
    areas = [],
  } = data;

  const nivelData = badges_por_nivel.map(n => ({
    name: `${n.codigo_nivel} - ${n.nome_nivel.split(' ')[0]}`,
    total: Number(n.total),
    fill: NIVEL_COR[n.codigo_nivel] || '#1e3a5f',
  }));

  const pieData = estados_candidatura.map(e => ({
    name: ESTADO_LABEL[e.estado_atual] || e.estado_atual,
    value: Number(e.total),
    cor: ESTADO_COR[e.estado_atual] || '#94a3b8',
  }));

  const consultoresFiltrados = filtroArea
    ? consultores.filter(c => String(c.id_area) === filtroArea)
    : consultores;

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo={`${t('sl_dash_subtitulo')} – ${nome_service_line || ''}`} />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <KpiCard icon={Users}      label={t('sl_dash_total_consult')}     valor={total_consultores}     variacao="+5.2%"  positivo labelMes={t('sl_dash_vs_mes')} />
            <KpiCard icon={Award}      label={t('sl_dash_badges_emitidos')}    valor={total_badges_emitidos} variacao="+12.3%" positivo labelMes={t('sl_dash_vs_mes')} />
            <KpiCard icon={TrendingUp} label={t('sl_dash_badges_mes')}         valor={badges_este_mes}       variacao="+8.1%"  positivo labelMes={t('sl_dash_vs_mes')} />
            <KpiCard icon={Clock}      label={t('sl_dash_pedidos_validacao')}  valor={pedidos_em_validacao}  variacao="-3.2%"  positivo={false} labelMes={t('sl_dash_vs_mes')} />
            <KpiCard icon={Zap}        label={t('sl_dash_pontuacao')}          valor={pontuacao_total.toLocaleString('pt-PT')} variacao="+15.7%" positivo labelMes={t('sl_dash_vs_mes')} />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

            {/* Bar — Nível de Badges */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">{t('sl_dash_nivel_badges')}</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={nivelData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    formatter={(v) => [v, 'Badges']}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {nivelData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-2 text-center text-[10px] text-slate-400">{t('sl_dash_lc')}</p>
            </div>

            {/* Pie — Estado do Pedido */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">{t('sl_dash_dist_estado')}</h2>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-xs text-slate-400">{t('sl_dash_sem_dados')}</div>
              )}
            </div>

            {/* Line — Aprovação Mensal */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">{t('sl_dash_aprov_mensal')}</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={aprovacao_mensal} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes_abrev" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                    formatter={(v) => [v, 'Badges']}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#1e3a5f"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#1e3a5f' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela + Ranking */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

            {/* Tabela de Performance */}
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">{t('sl_dash_perf_consult')}</h2>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">{t('sl_dash_filtrar_area')}</label>
                  <select
                    value={filtroArea}
                    onChange={e => setFiltroArea(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-softinsa-500"
                  >
                    <option value="">{t('sl_dash_todas')}</option>
                    {areas.map(a => (
                      <option key={a.id_area} value={String(a.id_area)}>{a.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">{t('sl_dash_consultor')}</th>
                      <th className="px-3 py-3 text-left font-semibold text-slate-600">{t('sl_dash_area')}</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-600">{t('sl_dash_total_badges')}</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-600">{t('sl_dash_nivel')}</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-600">{t('sl_dash_ativos')}</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-600">{t('sl_dash_expirados')}</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-600">{t('sl_dash_pontos')}</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-600">{t('sl_dash_conquistas')}</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-600">{t('sl_dash_acoes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultoresFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-400">{t('sl_dash_sem_consult')}</td>
                      </tr>
                    )}
                    {consultoresFiltrados.map((c, i) => (
                      <tr key={c.id_utilizador} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="px-4 py-3 font-medium text-slate-800">{c.nome}</td>
                        <td className="px-3 py-3 text-slate-500">{c.nome_area}</td>
                        <td className="px-3 py-3 text-center text-slate-700">{c.total_badges}</td>
                        <td className="px-3 py-3 text-center">
                          {c.nivel_mais_alto ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-softinsa-600 text-[10px] font-bold text-white">
                              {c.nivel_mais_alto}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center text-emerald-600 font-semibold">{c.badges_ativos ?? 0}</td>
                        <td className="px-3 py-3 text-center text-rose-500">{c.badges_expirados ?? 0}</td>
                        <td className="px-3 py-3 text-center text-slate-700 font-semibold">{Number(c.pontos_totais).toLocaleString('pt-PT')}</td>
                        <td className="px-3 py-3 text-center text-slate-500">{c.conquistas}</td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => navigate(`/sl/consultores/${c.id_utilizador}`)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold text-softinsa-600 hover:bg-softinsa-50 transition"
                          >
                            <Eye className="h-3 w-3" strokeWidth={2} />
                            {t('sl_dash_ver')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ranking Top 10 */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">{t('sl_dash_ranking_titulo')}</h2>
              </div>
              <div className="divide-y divide-slate-50 px-3 py-2">
                {ranking.length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-400">{t('sl_dash_sem_ranking')}</p>
                )}
                {ranking.map((r, i) => (
                  <div key={r.id_utilizador} className="flex items-center gap-3 py-3 px-2">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${MEDALHA[i] || 'bg-softinsa-100 text-softinsa-700'}`}>
                      {i < 3 ? (
                        <span className={i < 3 ? 'text-white' : 'text-softinsa-700'}>{i + 1}</span>
                      ) : (
                        <span className="text-softinsa-700">{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">{r.nome}</p>
                      <p className="truncate text-[10px] text-slate-400">{r.nome_area}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-softinsa-600">{Number(r.pontos_totais).toLocaleString('pt-PT')} {t('sl_dash_pts')}</p>
                      <p className="text-[10px] text-slate-400">{r.total_badges} {t('sl_dash_badges')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
