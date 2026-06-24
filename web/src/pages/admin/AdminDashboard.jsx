import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  Award,
  Bell,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Carregando from '../../components/Carregando';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';

const CORES_NIVEL = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
const CORES_ESTADO = {
  OPEN: '#94a3b8',
  SUBMITTED: '#3b82f6',
  EM_VALIDACAO: '#f59e0b',
  FECHADO: '#10b981',
};
const CLASSES_ESTADO = {
  OPEN: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  IN_TALENT_REVIEW: 'bg-amber-100 text-amber-800',
  IN_SERVICE_LINE_REVIEW: 'bg-amber-100 text-amber-800',
  SENT_BACK: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  CLOSED: 'bg-slate-200 text-slate-700',
};
const LOCALES = {
  pt: 'pt-PT',
  en: 'en-GB',
  es: 'es-ES',
};

function localeDe(idioma) {
  return LOCALES[idioma] || LOCALES.pt;
}

function numero(valor, idioma) {
  return new Intl.NumberFormat(localeDe(idioma)).format(Number(valor) || 0);
}

function percentagem(parte, total) {
  if (!total) return 0;
  return Math.round((Number(parte) / Number(total)) * 100);
}

function formatarDataIdioma(valor, idioma) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleDateString(localeDe(idioma), { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function mesCurto(valor, idioma) {
  if (!valor) return '';
  const data = new Date(`${valor}-01T00:00:00`);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString(localeDe(idioma), { month: 'short' }).replace('.', '');
}

function textoCurto(valor, max = 18) {
  const texto = String(valor || '');
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

function formatarSlaRestante(slaInfo, t) {
  if (!slaInfo) return '-';
  if (!slaInfo.limite_horas) return t('admin_sla_sem_sla');
  if (slaInfo.estado_sla === 'ULTRAPASSADO') return t('admin_dash_sla_overdue_short');

  const restantes = Number(slaInfo.limite_horas || 0) - Number(slaInfo.horas_em_fase || 0);
  if (restantes <= 0) return t('admin_dash_sla_overdue_short');
  if (restantes < 24) {
    const horas = Math.max(1, Math.ceil(restantes));
    return t(horas === 1 ? 'admin_dash_unit_hour' : 'admin_dash_unit_hours').replace('{n}', horas);
  }

  const dias = Math.ceil(restantes / 24);
  if (dias === 0) return t('admin_dash_sla_today');
  return t(dias === 1 ? 'admin_dash_sla_day' : 'admin_dash_sla_days').replace('{n}', dias);
}

function formatarLimiteSla(sla, t) {
  if (!sla) return '-';
  const limite = Number(sla.limite) || 0;
  const unidade = sla.unidade === 'horas'
    ? (limite === 1 ? 'admin_dash_unit_hour' : 'admin_dash_unit_hours')
    : (limite === 1 ? 'admin_dash_unit_day' : 'admin_dash_unit_days');

  return t(unidade).replace('{n}', limite);
}

function estadoCandidaturaAdmin(estado, t) {
  const labels = {
    OPEN: t('admin_dash_state_open'),
    SUBMITTED: t('admin_dash_state_submitted'),
    IN_TALENT_REVIEW: t('admin_dash_state_validation'),
    IN_SERVICE_LINE_REVIEW: t('admin_dash_state_validation'),
    SENT_BACK: t('admin_dash_state_sent_back'),
    APPROVED: t('admin_dash_state_approved'),
    REJECTED: t('admin_dash_state_rejected'),
    CLOSED: t('admin_dash_state_closed'),
  };

  return {
    label: labels[estado] || estado || '-',
    cor: CLASSES_ESTADO[estado] || 'bg-slate-100 text-slate-700',
  };
}

function TooltipGrafico({ active, payload, label, idioma }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 max-w-[240px] font-semibold text-slate-800">{label || payload[0]?.name}</p>
      {payload.map((item) => (
        <p key={item.dataKey || item.name} className="flex items-center justify-between gap-4 text-slate-500">
          <span>{item.name}</span>
          <span className="font-bold text-slate-900">{numero(item.value, idioma)}</span>
        </p>
      ))}
    </div>
  );
}

function KpiCard({ icon: Icon, valor, label, detalhe, cor }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cor.bg}`}>
          <Icon className={`h-5 w-5 ${cor.text}`} strokeWidth={1.8} />
        </div>
        {detalhe && (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${cor.badge}`}>
            {detalhe}
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{valor}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </section>
  );
}

function Grafico({ titulo, subtitulo, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <div>
        <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
        {subtitulo && <p className="mt-1 text-sm leading-6 text-slate-500">{subtitulo}</p>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SemDados({ altura = 'h-[280px]', texto }) {
  return (
    <div className={`flex ${altura} items-center justify-center rounded-xl bg-slate-50 text-sm font-medium text-slate-400`}>
      {texto}
    </div>
  );
}

function RankingCard({ ranking, t, idioma }) {
  const medalhas = ['bg-amber-400', 'bg-slate-400', 'bg-orange-400'];

  return (
    <Grafico titulo={t('admin_dash_global_gamification')} subtitulo={t('admin_dash_global_gamification_desc')}>
      <div className="space-y-3">
        {(ranking || []).map((r, index) => (
          <div key={r.id_utilizador} className="flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
              medalhas[index] || 'bg-softinsa-100 text-softinsa-700'
            } ${index < 3 ? 'text-white' : ''}`}
            >
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">{r.nome}</p>
              <p className="text-xs text-slate-500">{numero(r.pontos_totais, idioma)} {t('admin_dash_points_abbr')}</p>
            </div>
          </div>
        ))}
        {(ranking || []).length === 0 && <p className="py-6 text-center text-sm text-slate-400">{t('admin_dash_no_ranking')}</p>}
      </div>
    </Grafico>
  );
}

export default function AdminDashboard() {
  const { idioma, t } = useLanguage();
  const [intervalo, setIntervalo] = useState({ data_inicio: '', data_fim: '' });

  const estatisticas = useQuery({
    queryKey: ['admin-dashboard', 'estatisticas', intervalo],
    queryFn: async () => (await api.get('/api/estatisticas/gestor', {
      params: {
        data_inicio: intervalo.data_inicio || undefined,
        data_fim: intervalo.data_fim || undefined,
      },
    })).data,
    refetchInterval: 15000,
  });

  const ranking = useQuery({
    queryKey: ['admin-dashboard', 'ranking'],
    queryFn: async () => (await api.get('/api/estatisticas/ranking', { params: { limite: 5 } })).data,
    refetchInterval: 15000,
  });

  const candidaturas = useQuery({
    queryKey: ['admin-dashboard', 'candidaturas-recentes'],
    queryFn: async () => (await api.get('/api/candidaturas', { params: { por_pagina: 5 } })).data,
    refetchInterval: 15000,
  });

  const slas = useQuery({
    queryKey: ['admin-dashboard', 'sla'],
    queryFn: async () => (await api.get('/api/sla')).data,
    refetchInterval: 15000,
  });

  const foraSla = useQuery({
    queryKey: ['admin-dashboard', 'sla-fora-prazo'],
    queryFn: async () => (await api.get('/api/sla/fora-prazo', { params: { todos: 1 } })).data,
    refetchInterval: 15000,
  });

  const avisos = useQuery({
    queryKey: ['admin-dashboard', 'avisos'],
    queryFn: async () => (await api.get('/api/avisos/todos')).data,
  });

  const carregando = estatisticas.isLoading || ranking.isLoading || candidaturas.isLoading || slas.isLoading || foraSla.isLoading || avisos.isLoading;
  const dados = estatisticas.data || {};
  const listaSlas = slas.data?.dados || [];
  const recentes = candidaturas.data?.dados || [];
  const listaAvisos = avisos.data?.dados || [];
  const monitorSla = foraSla.data?.dados || [];
  const foraPrazo = useMemo(
    () => monitorSla.filter((item) => item.estado_sla === 'ULTRAPASSADO'),
    [monitorSla],
  );
  const slaPorCandidatura = useMemo(
    () => new Map(monitorSla.map((item) => [Number(item.id_candidatura), item])),
    [monitorSla],
  );

  const taxaAtribuicao = useMemo(
    () => percentagem(dados.total_badges_atribuidos, dados.total_badges_ativos),
    [dados.total_badges_atribuidos, dados.total_badges_ativos],
  );

  const estadosResumo = useMemo(() => {
    const mapa = new Map((dados.estados_candidatura || []).map((e) => [e.estado_atual, Number(e.total) || 0]));
    return [
      { chave: 'OPEN', total: mapa.get('OPEN') || 0, label: t('admin_dash_state_open'), cor: 'text-slate-600' },
      { chave: 'SUBMITTED', total: mapa.get('SUBMITTED') || 0, label: t('admin_dash_state_submitted'), cor: 'text-blue-600' },
      {
        chave: 'EM_VALIDACAO',
        total: (mapa.get('IN_TALENT_REVIEW') || 0) + (mapa.get('IN_SERVICE_LINE_REVIEW') || 0),
        label: t('admin_dash_state_validation'),
        cor: 'text-amber-600',
      },
      {
        chave: 'FECHADO',
        total: (mapa.get('APPROVED') || 0) + (mapa.get('REJECTED') || 0) + (mapa.get('CLOSED') || 0),
        label: t('admin_dash_state_closed'),
        cor: 'text-emerald-600',
      },
    ];
  }, [dados.estados_candidatura, t]);

  const badgesPorArea = useMemo(
    () => (dados.badges_por_area || dados.badges_por_learning_path || [])
      .slice(0, 8)
      .map((item) => ({
        nome: item.nome || t('admin_dash_unnamed'),
        total: Number(item.total) || 0,
      })),
    [dados.badges_por_area, dados.badges_por_learning_path, t],
  );

  const badgesPorNivel = useMemo(
    () => {
      const porCodigo = new Map();
      for (const item of dados.badges_por_nivel || []) {
        const codigo = item.codigo_nivel || '-';
        const atual = porCodigo.get(codigo) || { nivel: `${t('admin_dash_level')} ${codigo}`, codigo, total: 0 };
        atual.total += Number(item.total) || 0;
        porCodigo.set(codigo, atual);
      }
      return Array.from(porCodigo.values())
        .filter((item) => item.total > 0)
        .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)));
    },
    [dados.badges_por_nivel, t],
  );

  const evolucaoMensal = useMemo(
    () => (dados.badges_por_mes || [])
      .slice(-8)
      .map((item) => ({
        mes: mesCurto(item.mes, idioma),
        total: Number(item.total) || 0,
      })),
    [dados.badges_por_mes, idioma],
  );

  const estadosChart = useMemo(
    () => estadosResumo.map((item) => ({
      estado: item.label,
      total: item.total,
      cor: CORES_ESTADO[item.chave] || '#94a3b8',
    })),
    [estadosResumo],
  );

  const slaTalent = listaSlas.find((s) => s.fase === 'TALENT_REVIEW');
  const slaService = listaSlas.find((s) => s.fase === 'SERVICE_LINE_REVIEW');
  const valorIntervalo = (intervalo.data_inicio || intervalo.data_fim)
    ? dados.badges_no_intervalo
    : dados.total_badges_atribuidos;

  if (carregando) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Carregando /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <KpiCard
          icon={Users}
          valor={numero(dados.total_utilizadores, idioma)}
          label={t('admin_dash_total_users')}
          detalhe={t('admin_dash_platform')}
          cor={{ bg: 'bg-blue-50', text: 'text-blue-500', badge: 'bg-blue-50 text-blue-600' }}
        />
        <KpiCard
          icon={Award}
          valor={numero(dados.total_badges_atribuidos, idioma)}
          label={t('admin_dash_awarded_badges')}
          detalhe={t('admin_dash_issued')}
          cor={{ bg: 'bg-emerald-50', text: 'text-emerald-500', badge: 'bg-emerald-50 text-emerald-600' }}
        />
        <KpiCard
          icon={TrendingUp}
          valor={`${taxaAtribuicao}%`}
          label={t('admin_dash_award_rate')}
          detalhe={t('admin_dash_active')}
          cor={{ bg: 'bg-violet-50', text: 'text-violet-500', badge: 'bg-violet-50 text-violet-600' }}
        />
        <KpiCard
          icon={FileText}
          valor={numero(estadosResumo.find((e) => e.chave === 'EM_VALIDACAO')?.total, idioma)}
          label={t('admin_dash_in_validation')}
          detalhe={t('admin_dash_processes')}
          cor={{ bg: 'bg-amber-50', text: 'text-amber-500', badge: 'bg-amber-50 text-amber-700' }}
        />
        <KpiCard
          icon={AlertCircle}
          valor={numero(foraPrazo.length, idioma)}
          label={t('admin_dash_sla_overdue')}
          detalhe={t('admin_dash_attention')}
          cor={{ bg: 'bg-rose-50', text: 'text-rose-500', badge: 'bg-rose-50 text-rose-600' }}
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Activity className="h-4 w-4 text-slate-500" strokeWidth={1.8} />
              {t('admin_dash_analysis_period')}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">{t('admin_dash_start_date')}</span>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-softinsa-400"
                  value={intervalo.data_inicio}
                  max={intervalo.data_fim || undefined}
                  onChange={(e) => setIntervalo((i) => ({ ...i, data_inicio: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">{t('admin_dash_end_date')}</span>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-softinsa-400"
                  value={intervalo.data_fim}
                  min={intervalo.data_inicio || undefined}
                  onChange={(e) => setIntervalo((i) => ({ ...i, data_fim: e.target.value }))}
                />
              </label>
            </div>
            {(intervalo.data_inicio || intervalo.data_fim) && (
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                onClick={() => setIntervalo({ data_inicio: '', data_fim: '' })}
              >
                <X className="h-4 w-4" strokeWidth={1.8} /> {t('admin_dash_clear_filters')}
              </button>
            )}
          </div>
          <div className="min-w-[260px] rounded-2xl bg-softinsa-50 px-6 py-5 text-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-softinsa-700">{t('admin_dash_badges_period')}</div>
            <div className="mt-1 text-4xl font-bold text-softinsa-700">{numero(valorIntervalo, idioma)}</div>
            <div className="mt-1 text-xs text-slate-500">
              {(intervalo.data_inicio || intervalo.data_fim)
                ? `${intervalo.data_inicio ? formatarDataIdioma(intervalo.data_inicio, idioma) : '…'} - ${intervalo.data_fim ? formatarDataIdioma(intervalo.data_fim, idioma) : '…'}`
                : t('admin_dash_all_periods')}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Grafico titulo={t('admin_dash_badges_area')} subtitulo={t('admin_dash_badges_area_desc')}>
          {badgesPorArea.length === 0 ? <SemDados texto={t('admin_dash_no_data')} /> : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={badgesPorArea} margin={{ top: 10, right: 12, left: -10, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis
                  dataKey="nome"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(valor) => textoCurto(valor, 16)}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<TooltipGrafico idioma={idioma} />} />
                <Bar dataKey="total" name={t('admin_dash_badges')} fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Grafico>

        <Grafico titulo={t('admin_dash_badges_level')} subtitulo={t('admin_dash_badges_level_desc')}>
          {badgesPorNivel.length === 0 ? <SemDados texto={t('admin_dash_no_data')} /> : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={badgesPorNivel}
                  dataKey="total"
                  nameKey="nivel"
                  cx="50%"
                  cy="50%"
                  innerRadius={64}
                  outerRadius={104}
                  paddingAngle={2}
                  label={({ codigo, percent }) => `${codigo} ${(percent * 100).toFixed(0)}%`}
                >
                  {badgesPorNivel.map((item, index) => (
                    <Cell key={item.nivel} fill={CORES_NIVEL[index % CORES_NIVEL.length]} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipGrafico idioma={idioma} />} />
                <Legend iconType="circle" formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Grafico>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
        <Grafico titulo={t('admin_dash_monthly_evolution')} subtitulo={t('admin_dash_monthly_evolution_desc')}>
          {evolucaoMensal.length === 0 ? <SemDados altura="h-[300px]" texto={t('admin_dash_no_data')} /> : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolucaoMensal} margin={{ top: 12, right: 20, left: -10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<TooltipGrafico idioma={idioma} />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  name={t('admin_dash_badges')}
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Grafico>

        <Grafico titulo={t('admin_dash_apps_state')} subtitulo={t('admin_dash_apps_state_desc')}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={estadosChart} margin={{ top: 12, right: 12, left: -10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="estado" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip content={<TooltipGrafico idioma={idioma} />} />
              <Bar dataKey="total" name={t('admin_dash_applications')} radius={[6, 6, 0, 0]} maxBarSize={48}>
                {estadosChart.map((item) => (
                  <Cell key={item.estado} fill={item.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Grafico>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Grafico titulo={t('admin_dash_sla_control')} subtitulo={t('admin_dash_sla_control_desc')}>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">{t('admin_dash_sla_talent')}</span>
              <span className="font-bold text-emerald-600">{formatarLimiteSla(slaTalent, t)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">{t('admin_dash_sla_service_line')}</span>
              <span className="font-bold text-emerald-600">{formatarLimiteSla(slaService, t)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3">
              <span className="text-rose-700">{t('admin_dash_sla_overdue_processes')}</span>
              <span className="font-bold text-rose-600">{numero(foraPrazo.length, idioma)}</span>
            </div>
            <Link to="/admin/sla" className="btn-primary mt-5 w-full">
              <Clock className="h-4 w-4" strokeWidth={1.8} /> {t('admin_dash_manage_sla')}
            </Link>
          </div>
        </Grafico>

        <RankingCard ranking={ranking.data?.dados || []} t={t} idioma={idioma} />

        <Grafico titulo={t('admin_dash_highlights')} subtitulo={t('admin_dash_highlights_desc')}>
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Award className="h-4 w-4" strokeWidth={1.8} /> {t('admin_dash_badge_month')}
              </div>
              <p className="mt-2 text-sm font-bold leading-5 text-slate-800">{dados.badge_mais_obtido_mes?.titulo || '-'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Trophy className="h-4 w-4" strokeWidth={1.8} /> {t('admin_dash_best_service_line')}
              </div>
              <p className="mt-2 text-sm font-bold leading-5 text-slate-800">{dados.melhor_service_line?.nome || '-'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <CheckCircle className="h-4 w-4" strokeWidth={1.8} /> {t('admin_dash_special_achievements')}
              </div>
              <p className="mt-2 text-2xl font-bold text-softinsa-700">{numero(dados.total_conquistas_especiais, idioma)}</p>
            </div>
          </div>
        </Grafico>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('admin_dash_recent_requests')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('admin_dash_recent_requests_desc')}</p>
          </div>
          <Link to="/admin/candidaturas" className="text-sm font-semibold text-softinsa-700 hover:underline">{t('admin_dash_view_all')}</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left">{t('admin_dash_col_consultant')}</th>
                <th className="px-5 py-4 text-left">{t('admin_dash_col_badge')}</th>
                <th className="px-5 py-4 text-left">{t('admin_dash_col_service_line')}</th>
                <th className="px-5 py-4 text-left">{t('admin_dash_col_state')}</th>
                <th className="px-5 py-4 text-left">{t('admin_dash_col_date')}</th>
                <th className="px-5 py-4 text-left">{t('admin_dash_col_sla')}</th>
                <th className="px-5 py-4 text-left">{t('admin_dash_col_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentes.map((c) => {
                const info = estadoCandidaturaAdmin(c.estado_atual, t);
                return (
                  <tr key={c.id_candidatura} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-medium text-slate-800">{c.nome_consultor}</td>
                    <td className="px-5 py-4 text-slate-700">{c.titulo_badge}</td>
                    <td className="px-5 py-4 text-slate-500">{c.nome_service_line}</td>
                    <td className="px-5 py-4"><span className={`badge-pill ${info.cor}`}>{info.label}</span></td>
                    <td className="px-5 py-4 text-slate-500">{formatarDataIdioma(c.data_submissao || c.data_abertura, idioma)}</td>
                    <td className="px-5 py-4 text-slate-500">
                      {formatarSlaRestante(slaPorCandidatura.get(Number(c.id_candidatura)), t)}
                    </td>
                    <td className="px-5 py-4">
                      <Link to="/admin/candidaturas" state={{ abrirCandidaturaId: c.id_candidatura }} className="font-semibold text-softinsa-700 hover:underline">{t('admin_dash_view_process')}</Link>
                    </td>
                  </tr>
                );
              })}
              {recentes.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">{t('admin_dash_no_recent_requests')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Grafico titulo={t('admin_dash_active_notices')} subtitulo={t('admin_dash_active_notices_desc')}>
          <div className="divide-y divide-slate-100">
            {listaAvisos.slice(0, 4).map((aviso) => (
              <div key={aviso.id_aviso} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-800">{aviso.titulo}</div>
                  <div className="text-xs text-slate-500">{formatarDataIdioma(aviso.data_inicio || aviso.created_at, idioma)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`badge-pill ${aviso.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {aviso.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive')}
                  </span>
                  <Link to="/admin/avisos" className="text-sm font-semibold text-softinsa-700">{t('admin_dash_manage')}</Link>
                </div>
              </div>
            ))}
            {listaAvisos.length === 0 && <div className="py-8 text-center text-sm text-slate-500">{t('admin_dash_no_notices')}</div>}
          </div>
        </Grafico>

        <Grafico titulo={t('admin_dash_audit')} subtitulo={t('admin_dash_audit_desc')}>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Bell className="h-4 w-4" strokeWidth={1.8} /> {t('admin_dash_last_admin_action')}
            </div>
            <div className="mt-2 font-semibold text-slate-800">
              {recentes[0] ? `${t('admin_dash_application')} #${recentes[0].id_candidatura} - ${recentes[0].titulo_badge}` : t('admin_dash_no_recent_activity')}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {t('admin_dash_by_admin')} - {recentes[0] ? formatarDataIdioma(recentes[0].data_submissao || recentes[0].data_abertura, idioma) : '-'}
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-softinsa-50 px-4 py-3">
            <span className="text-sm font-medium text-softinsa-700">{t('admin_dash_total_actions')}</span>
            <span className="text-2xl font-bold text-softinsa-700">{numero(dados.total_acoes_registadas, idioma)}</span>
          </div>
          <Link to="/admin/candidaturas" className="btn-secondary mt-6 w-full bg-slate-100">{t('admin_dash_view_full_history')}</Link>
        </Grafico>
      </div>
    </div>
  );
}
