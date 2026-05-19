import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Award, Clock, Eye, Trophy, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { api } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';

/* ─── Helpers ───────────────────────────────────────────────────────── */
const NIVEL_COR = {
  A: 'bg-blue-400',
  B: 'bg-blue-600',
  C: 'bg-softinsa-600',
  D: 'bg-rose-400',
  E: 'bg-purple-600',
};

const ESTADO_CFG = {
  OPEN:                   { label: 'Open',           cls: 'bg-slate-100 text-slate-600' },
  SUBMITTED:              { label: 'Submetido',      cls: 'bg-amber-100 text-amber-700' },
  IN_TALENT_REVIEW:       { label: 'Talent Review',  cls: 'bg-blue-100 text-blue-700' },
  IN_SERVICE_LINE_REVIEW: { label: 'Em Validação',   cls: 'bg-orange-100 text-orange-700' },
  APPROVED:               { label: 'Aprovado',       cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:               { label: 'Rejeitado',      cls: 'bg-rose-100 text-rose-600' },
  SENT_BACK:              { label: 'Devolvido',      cls: 'bg-orange-100 text-orange-600' },
  CLOSED:                 { label: 'Fechado',        cls: 'bg-slate-100 text-slate-500' },
};

function iniciais(nome) {
  return (nome || '?').split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
}

/* ─── KPI card ──────────────────────────────────────────────────────── */
function KpiCard({ label, valor, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{valor ?? '—'}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

/* ─── Linha da tabela ───────────────────────────────────────────────── */
function LinhaConsultor({ c, onVerPerfil }) {
  const estadoCfg = c.ultimo_estado
    ? (ESTADO_CFG[c.ultimo_estado] || { label: c.ultimo_estado, cls: 'bg-slate-100 text-slate-500' })
    : null;
  const ini = iniciais(c.nome);
  const nivelCls = NIVEL_COR[c.nivel_mais_alto] || 'bg-slate-400';

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition">
      {/* Nome */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-softinsa-600 text-xs font-bold text-white">
            {ini}
          </div>
          <span className="text-sm font-medium text-slate-800">{c.nome}</span>
        </div>
      </td>
      {/* Área */}
      <td className="px-3 py-3 text-sm text-slate-500">{c.nome_area}</td>
      {/* Nível mais alto */}
      <td className="px-3 py-3 text-center">
        {c.nivel_mais_alto ? (
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${nivelCls}`}>
            {c.nivel_mais_alto}
          </span>
        ) : (
          <span className="text-slate-300 text-sm">—</span>
        )}
      </td>
      {/* Badges obtidos */}
      <td className="px-3 py-3 text-sm text-center text-slate-700 font-semibold">{c.total_badges}</td>
      {/* Em processo */}
      <td className="px-3 py-3 text-sm text-center text-slate-600">{c.badges_em_processo ?? 0}</td>
      {/* Expirados */}
      <td className="px-3 py-3 text-sm text-center text-slate-600">{c.badges_expirados ?? 0}</td>
      {/* Pontos */}
      <td className="px-3 py-3 text-sm text-center font-semibold text-softinsa-600">{Number(c.pontos_totais).toLocaleString('pt-PT')}</td>
      {/* Conquista especial */}
      <td className="px-3 py-3 text-sm text-slate-500">
        {c.conquista_especial || <span className="text-slate-300">—</span>}
      </td>
      {/* Estado atual */}
      <td className="px-3 py-3">
        {estadoCfg ? (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estadoCfg.cls}`}>
            {estadoCfg.label}
          </span>
        ) : (
          <span className="text-slate-300 text-sm">—</span>
        )}
      </td>
      {/* Ação */}
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => onVerPerfil(c.id_utilizador)}
          className="flex items-center gap-1.5 rounded-lg border border-softinsa-200 bg-white px-3 py-1.5 text-xs font-semibold text-softinsa-600 hover:bg-softinsa-50 transition"
        >
          <Eye className="h-3 w-3" strokeWidth={2} />
          Ver Perfil
        </button>
      </td>
    </tr>
  );
}

/* ─── Tooltip personalizado ─────────────────────────────────────────── */
function TooltipCustom({ active, payload, label, sufixo }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="text-softinsa-600 font-bold">{payload[0].value} {sufixo}</p>
    </div>
  );
}

/* ─── Aba: Métricas Comparativas ────────────────────────────────────── */
function MetricasComparativas({ consultores }) {
  if (!consultores.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">
        Sem dados suficientes para métricas comparativas.
      </div>
    );
  }

  /* Destaque: Top Pontos */
  const topPontos = [...consultores].sort((a, b) => Number(b.pontos_totais) - Number(a.pontos_totais))[0];
  /* Destaque: Mais Badges */
  const topBadges = [...consultores].sort((a, b) => Number(b.total_badges) - Number(a.total_badges))[0];
  /* Destaque: Área com mais badges */
  const areaMap = {};
  consultores.forEach(c => {
    if (!areaMap[c.nome_area]) areaMap[c.nome_area] = { badges: 0, count: 0 };
    areaMap[c.nome_area].badges += Number(c.total_badges);
    areaMap[c.nome_area].count += 1;
  });
  const topArea = Object.entries(areaMap).sort((a, b) => b[1].badges - a[1].badges)[0];

  /* Dados para gráficos (ordenados) */
  const dadosPontos = [...consultores]
    .sort((a, b) => Number(b.pontos_totais) - Number(a.pontos_totais))
    .map(c => ({ nome: c.nome.split(' ')[0] + (c.nome.split(' ')[1] ? ' ' + c.nome.split(' ')[1] : ''), valor: Number(c.pontos_totais) }));

  const dadosBadges = [...consultores]
    .sort((a, b) => Number(b.total_badges) - Number(a.total_badges))
    .map(c => ({ nome: c.nome.split(' ')[0] + (c.nome.split(' ')[1] ? ' ' + c.nome.split(' ')[1] : ''), valor: Number(c.total_badges) }));

  const BAR_COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];

  return (
    <div className="space-y-5">
      {/* Título */}
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" strokeWidth={1.8} />
        <h2 className="text-base font-bold text-slate-900">Comparação entre Consultores da Service Line</h2>
      </div>

      {/* Cards de destaque */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Top Pontos */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 mb-3">
            <Trophy className="h-3.5 w-3.5" strokeWidth={2} />
            Top Pontos
          </div>
          <p className="text-lg font-bold text-slate-900">{topPontos?.nome}</p>
          <p className="text-sm font-semibold text-amber-600 mt-0.5">
            {Number(topPontos?.pontos_totais).toLocaleString('pt-PT')} pontos
          </p>
          <p className="mt-1 text-xs text-slate-500">{topPontos?.nome_area}</p>
        </div>

        {/* Mais Badges */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 mb-3">
            <Award className="h-3.5 w-3.5" strokeWidth={2} />
            Mais Badges
          </div>
          <p className="text-lg font-bold text-slate-900">{topBadges?.nome}</p>
          <p className="text-sm font-semibold text-blue-600 mt-0.5">
            {topBadges?.total_badges} badge{Number(topBadges?.total_badges) !== 1 ? 's' : ''}
          </p>
          <p className="mt-1 text-xs text-slate-500">{topBadges?.nome_area}</p>
        </div>

        {/* Área Mais Activa */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mb-3">
            <Clock className="h-3.5 w-3.5" strokeWidth={2} />
            Área Mais Activa
          </div>
          <p className="text-lg font-bold text-slate-900">{topArea?.[0]}</p>
          <p className="text-sm font-semibold text-emerald-600 mt-0.5">
            {topArea?.[1]?.badges} badge{topArea?.[1]?.badges !== 1 ? 's' : ''} atribuídos
          </p>
          <p className="mt-1 text-xs text-slate-500">{topArea?.[1]?.count} consultor{topArea?.[1]?.count !== 1 ? 'es' : ''}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Ranking por Pontos */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Ranking por Pontos</h3>
          <ResponsiveContainer width="100%" height={dadosPontos.length * 36 + 20}>
            <BarChart data={dadosPontos} layout="vertical" margin={{ left: 70, right: 20, top: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={65} />
              <Tooltip content={<TooltipCustom sufixo="pts" />} />
              <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={18}>
                {dadosPontos.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ranking por Nº de Badges */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Ranking por Nº de Badges</h3>
          <ResponsiveContainer width="100%" height={dadosBadges.length * 36 + 20}>
            <BarChart data={dadosBadges} layout="vertical" margin={{ left: 70, right: 20, top: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={65} />
              <Tooltip content={<TooltipCustom sufixo="badges" />} />
              <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={18}>
                {dadosBadges.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────── */
export default function ServiceLineConsultores() {
  const navigate = useNavigate();
  const [aba, setAba] = useState('lista');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sl-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/api/estatisticas/service-line');
      return data;
    },
    staleTime: 60_000,
  });

  const consultores = data?.consultores || [];
  const areas = data?.areas || [];

  const niveis = useMemo(() => {
    const m = new Map();
    consultores.forEach(c => { if (c.nivel_mais_alto) m.set(c.nivel_mais_alto, c.nivel_mais_alto); });
    return [...m.keys()].sort();
  }, [consultores]);

  const filtrados = useMemo(() => {
    return consultores.filter(c => {
      if (filtroArea && String(c.id_area) !== filtroArea) return false;
      if (filtroNivel && c.nivel_mais_alto !== filtroNivel) return false;
      return true;
    });
  }, [consultores, filtroArea, filtroNivel]);

  const mediaPotos = consultores.length > 0
    ? Math.round(consultores.reduce((s, c) => s + Number(c.pontos_totais), 0) / consultores.length)
    : 0;

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo="Consultores – Service Line – Análise de Desempenho e Progresso" />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8 space-y-5">

          {/* Abas */}
          <div className="flex gap-2">
            {[
              { id: 'lista',    label: 'Lista de Consultores' },
              { id: 'metricas', label: 'Métricas Comparativas' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAba(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  aba === tab.id
                    ? 'bg-white border border-slate-200 text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><Carregando /></div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard label="Total de Consultores" valor={data?.total_consultores ?? consultores.length} />
                <KpiCard label="Média de Pontos" valor={mediaPotos.toLocaleString('pt-PT')} sub="por consultor" />
                <KpiCard label="Total de Badges Atribuídos" valor={data?.total_badges_emitidos} />
                <KpiCard label="Pedidos em Validação" valor={data?.pedidos_em_validacao} />
              </div>

              {aba === 'lista' && (
                <>
                  {/* Filtros */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-500">Filtrar por Área:</label>
                      <select
                        value={filtroArea}
                        onChange={e => setFiltroArea(e.target.value)}
                        className="input text-sm"
                      >
                        <option value="">Todas as Áreas</option>
                        {areas.map(a => (
                          <option key={a.id_area} value={String(a.id_area)}>{a.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-500">Filtrar por Nível:</label>
                      <select
                        value={filtroNivel}
                        onChange={e => setFiltroNivel(e.target.value)}
                        className="input text-sm"
                      >
                        <option value="">Todos os Níveis</option>
                        {niveis.map(n => (
                          <option key={n} value={n}>Nível {n}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tabela */}
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
                      A mostrar <span className="font-semibold text-slate-700">{filtrados.length}</span> consultor{filtrados.length !== 1 ? 'es' : ''}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-3 text-left">Nome do Consultor</th>
                            <th className="px-3 py-3 text-left">Área</th>
                            <th className="px-3 py-3 text-center">Nível Mais Alto</th>
                            <th className="px-3 py-3 text-center">Badges Obtidos</th>
                            <th className="px-3 py-3 text-center">Badges em Processo</th>
                            <th className="px-3 py-3 text-center">Badges Expirados</th>
                            <th className="px-3 py-3 text-center">Total de Pontos</th>
                            <th className="px-3 py-3 text-left">Conquistas Especiais</th>
                            <th className="px-3 py-3 text-left">Estado Atual</th>
                            <th className="px-3 py-3 text-center">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtrados.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">
                                <Users className="mx-auto mb-3 h-8 w-8 opacity-30" strokeWidth={1.5} />
                                Nenhum consultor encontrado.
                              </td>
                            </tr>
                          ) : filtrados.map(c => (
                            <LinhaConsultor key={c.id_utilizador} c={c} onVerPerfil={(id) => navigate(`/sl/consultores/${id}`)} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {aba === 'metricas' && (
                <MetricasComparativas consultores={filtrados} />
              )}
            </>
          )}

        </main>
      </div>
    </div>
  );
}
