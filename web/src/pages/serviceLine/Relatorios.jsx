import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, CheckCircle, Clock, Download, FileText, Filter, PercentCircle, TrendingDown, TrendingUp, X, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';
import { exportCSV, exportPDF } from '../../lib/exportar';
import { useLanguage } from '../../context/LanguageContext';

function getEstadoCfg(t) {
  return {
    OPEN:                   { label: t('sl_estado_open'),             cls: 'bg-slate-100 text-slate-600' },
    SUBMITTED:              { label: t('sl_estado_submitted'),        cls: 'bg-amber-100 text-amber-700' },
    IN_TALENT_REVIEW:       { label: t('sl_estado_talent_review'),    cls: 'bg-blue-100 text-blue-700' },
    IN_SERVICE_LINE_REVIEW: { label: t('sl_estado_sl_review'),        cls: 'bg-orange-100 text-orange-700' },
    APPROVED:               { label: t('sl_estado_approved'),         cls: 'bg-emerald-100 text-emerald-700' },
    REJECTED:               { label: t('sl_estado_rejected'),         cls: 'bg-rose-100 text-rose-600' },
    SENT_BACK:              { label: t('sl_estado_sent_back'),        cls: 'bg-orange-100 text-orange-600' },
    CLOSED:                 { label: t('sl_estado_closed'),           cls: 'bg-slate-100 text-slate-500' },
  };
}

function getEstadosOpcoes(t) {
  return [
    { valor: 'OPEN',                   label: t('sl_rel_est_open') },
    { valor: 'SUBMITTED',              label: t('sl_rel_est_submitted') },
    { valor: 'IN_SERVICE_LINE_REVIEW', label: t('sl_rel_est_sl_review') },
    { valor: 'APPROVED',               label: t('sl_rel_est_aprov') },
    { valor: 'REJECTED',               label: t('sl_rel_est_rejeit') },
    { valor: 'CLOSED',                 label: t('sl_rel_est_fechado') },
  ];
}

const NIVEL_COR = {
  A: 'bg-blue-400', B: 'bg-blue-600', C: 'bg-softinsa-600',
  D: 'bg-indigo-700', E: 'bg-purple-700',
};

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ─── KPI Card ──────────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, iconCls, label, valor, tendencia, sufixo = '' }) {
  const positivo = tendencia > 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconCls}`}>
          <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
        </div>
        {tendencia != null && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${positivo ? 'text-emerald-600' : 'text-rose-500'}`}>
            {positivo ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {positivo ? '+' : ''}{tendencia}{sufixo}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{valor ?? '—'}</p>
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────── */
export default function ServiceLineRelatorios() {
  const { t } = useLanguage();

  /* Filtros (estado do form) */
  const [filtroArea, setFiltroArea]         = useState('');
  const [filtroNivel, setFiltroNivel]       = useState('');
  const [filtroInicio, setFiltroInicio]     = useState('');
  const [filtroFim, setFiltroFim]           = useState('');
  const [filtroEstados, setFiltroEstados]   = useState([]);

  /* Parâmetros activos (só actualizados ao clicar "Gerar Relatório") */
  const [params, setParams] = useState(null);

  const ESTADO_CFG = getEstadoCfg(t);
  const ESTADOS_OPCOES = getEstadosOpcoes(t);

  /* Dados de suporte (áreas e níveis para dropdowns) */
  const { data: slData } = useQuery({
    queryKey: ['sl-dashboard'],
    queryFn: async () => { const { data } = await api.get('/api/estatisticas/service-line'); return data; },
    staleTime: 300_000,
  });
  const areas  = slData?.areas || [];
  const niveis = useMemo(() => {
    const m = new Map();
    (slData?.badges_por_nivel || []).forEach(n => m.set(n.codigo_nivel, n.nome_nivel));
    return [...m.entries()];
  }, [slData]);

  /* Query do relatório */
  const { data: relatorio, isLoading, isFetching } = useQuery({
    queryKey: ['sl-relatorio', params],
    queryFn: async () => {
      const p = {};
      if (params?.id_area)    p.id_area     = params.id_area;
      if (params?.codigo_nivel) p.codigo_nivel = params.codigo_nivel;
      if (params?.data_inicio) p.data_inicio  = params.data_inicio;
      if (params?.data_fim)    p.data_fim      = params.data_fim;
      if (params?.estados?.length) p.estados  = params.estados.join(',');
      const { data } = await api.get('/api/estatisticas/service-line/relatorio', { params: p });
      return data;
    },
    enabled: params !== null,
    staleTime: 0,
  });

  const kpis  = relatorio?.kpis;
  const dados = relatorio?.dados || [];

  function gerarRelatorio() {
    setParams({
      id_area:      filtroArea || undefined,
      codigo_nivel: filtroNivel || undefined,
      data_inicio:  filtroInicio || undefined,
      data_fim:     filtroFim || undefined,
      estados:      filtroEstados,
    });
  }

  function limparFiltros() {
    setFiltroArea(''); setFiltroNivel('');
    setFiltroInicio(''); setFiltroFim('');
    setFiltroEstados([]); setParams(null);
  }

  function toggleEstado(v) {
    setFiltroEstados(prev => prev.includes(v) ? prev.filter(e => e !== v) : [...prev, v]);
  }

  const temFiltros = Boolean(filtroArea || filtroNivel || filtroInicio || filtroFim || filtroEstados.length);

  const REL_HEADERS = [
    t('sl_rel_csv_consultor'), t('sl_rel_csv_area'), t('sl_rel_csv_badge'),
    t('sl_rel_csv_nivel'), t('sl_rel_csv_data_sub'), t('sl_rel_csv_data_dec'),
    t('sl_rel_csv_estado'), t('sl_rel_csv_pontos'),
  ];

  function relatorioParaLinhas(dadosList) {
    return dadosList.map(r => [
      r.nome_consultor, r.nome_area, r.titulo_badge, r.codigo_nivel,
      fmt(r.data_submissao), fmt(r.data_decisao),
      ESTADO_CFG[r.estado_atual]?.label || r.estado_atual,
      r.pontos,
    ]);
  }

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo={t('sl_rel_subtitulo')} />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8 space-y-5">

          {/* ── Filtros ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter className="h-4 w-4" strokeWidth={1.8} />
              {t('sl_rel_filtros_titulo')}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_rel_area')}</label>
                <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className="input text-sm">
                  <option value="">{t('sl_rel_todas')}</option>
                  {areas.map(a => <option key={a.id_area} value={String(a.id_area)}>{a.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_rel_nivel')}</label>
                <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)} className="input text-sm">
                  <option value="">{t('sl_rel_todos')}</option>
                  {niveis.map(([cod, nome]) => <option key={cod} value={cod}>{cod} – {nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_rel_data_inicio')}</label>
                <input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_rel_data_fim')}</label>
                <input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} className="input text-sm" />
              </div>
            </div>

            {/* Checkboxes de estado */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-500 mb-2">{t('sl_rel_estado')}</label>
              <div className="flex flex-wrap gap-2">
                {ESTADOS_OPCOES.map(e => (
                  <button
                    key={e.valor}
                    type="button"
                    onClick={() => toggleEstado(e.valor)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                      filtroEstados.includes(e.valor)
                        ? 'bg-softinsa-600 text-white border-softinsa-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-softinsa-400'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Acções */}
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={gerarRelatorio}
                disabled={isFetching}
                className="rounded-lg bg-softinsa-600 px-5 py-2 text-sm font-semibold text-white hover:bg-softinsa-700 disabled:opacity-60 transition"
              >
                {isFetching ? t('sl_rel_gerando') : t('sl_rel_gerar')}
              </button>
              {temFiltros && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                  {t('sl_rel_limpar')}
                </button>
              )}
            </div>
          </div>

          {/* ── KPIs ────────────────────────────────────────────── */}
          {kpis && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <KpiCard icon={Award}         iconCls="bg-softinsa-600" label={t('sl_rel_kpi_badges')} valor={kpis.total} />
              <KpiCard icon={CheckCircle}   iconCls="bg-emerald-500"  label={t('sl_rel_kpi_aprov')} valor={kpis.aprovacoes} />
              <KpiCard icon={XCircle}       iconCls="bg-rose-500"     label={t('sl_rel_kpi_rejeit')} valor={kpis.rejeicoes} />
              <KpiCard icon={PercentCircle} iconCls="bg-blue-500"     label={t('sl_rel_kpi_pct')} valor={kpis.pct_aprovacao != null ? `${kpis.pct_aprovacao}%` : '—'} />
              <KpiCard icon={Clock}         iconCls="bg-indigo-500"   label={t('sl_rel_kpi_tempo')} valor={kpis.tempo_medio_dias != null ? t('sl_rel_kpi_dias').replace('{n}', kpis.tempo_medio_dias) : '—'} />
            </div>
          )}

          {/* ── Tabela de resultados ─────────────────────────────── */}
          {params !== null && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">{t('sl_rel_resultados')}</h2>
                  {!isLoading && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {dados.length === 1
                        ? t('sl_rel_registos').replace('{n}', dados.length)
                        : t('sl_rel_registos_pl').replace('{n}', dados.length)}
                    </p>
                  )}
                </div>
                {dados.length > 0 && (() => {
                  const hoje = new Date().toISOString().slice(0, 10);
                  const linhas = relatorioParaLinhas(dados);
                  return (
                    <div className="flex items-center gap-2">
                      <button type="button"
                        onClick={() => exportCSV(`relatorio_sl_${hoje}.csv`, REL_HEADERS, linhas)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                        <Download className="h-3.5 w-3.5" strokeWidth={2} /> Excel (CSV)
                      </button>
                      <button type="button"
                        onClick={() => exportPDF(`relatorio_sl_${hoje}.pdf`, t('sl_rel_pdf_titulo'), REL_HEADERS, linhas)}
                        className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition">
                        <FileText className="h-3.5 w-3.5" strokeWidth={2} /> PDF
                      </button>
                    </div>
                  );
                })()}
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12"><Carregando /></div>
              ) : dados.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-slate-400">
                  <Award className="h-10 w-10 opacity-30 mb-3" strokeWidth={1.5} />
                  <p className="text-sm font-medium">{t('sl_rel_nenhum')}</p>
                  <p className="text-xs mt-1">{t('sl_rel_ajustar')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3 text-left">{t('sl_rel_th_consultor')}</th>
                        <th className="px-3 py-3 text-left">{t('sl_rel_th_area')}</th>
                        <th className="px-3 py-3 text-left">{t('sl_rel_th_badge')}</th>
                        <th className="px-3 py-3 text-center">{t('sl_rel_th_nivel')}</th>
                        <th className="px-3 py-3 text-left">{t('sl_rel_th_data_sub')}</th>
                        <th className="px-3 py-3 text-left">{t('sl_rel_th_data_dec')}</th>
                        <th className="px-3 py-3 text-left">{t('sl_rel_th_estado')}</th>
                        <th className="px-3 py-3 text-right">{t('sl_rel_th_pontos')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.map(r => {
                        const est = ESTADO_CFG[r.estado_atual] || { label: r.estado_atual, cls: 'bg-slate-100 text-slate-500' };
                        const nivelCls = NIVEL_COR[r.codigo_nivel] || 'bg-slate-400';
                        return (
                          <tr key={r.id_candidatura} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{r.nome_consultor}</td>
                            <td className="px-3 py-3 text-sm text-slate-500">{r.nome_area}</td>
                            <td className="px-3 py-3 text-sm text-slate-700">{r.titulo_badge}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${nivelCls}`}>
                                {r.codigo_nivel}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm text-slate-500">{fmt(r.data_submissao)}</td>
                            <td className="px-3 py-3 text-sm text-slate-500">{fmt(r.data_decisao)}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${est.cls}`}>
                                {est.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-semibold text-slate-700">
                              {r.pontos > 0 ? r.pontos : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
