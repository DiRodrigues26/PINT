import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, CheckCircle, Clock, Filter, X } from 'lucide-react';
import { api } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';
import { useLanguage } from '../../context/LanguageContext';

/* ─── Helpers ────────────────────────────────────────────────────────── */
const NIVEL_COR = {
  A: 'bg-blue-400', B: 'bg-blue-600', C: 'bg-softinsa-600',
  D: 'bg-indigo-700', E: 'bg-purple-700',
};

function getEstadoCfg(t) {
  return {
    OPEN:                   { label: t('sl_estado_open'),          cls: 'bg-slate-100 text-slate-600' },
    SUBMITTED:              { label: t('sl_estado_submitted'),     cls: 'bg-amber-100 text-amber-700' },
    IN_TALENT_REVIEW:       { label: t('sl_estado_talent_review'), cls: 'bg-blue-100 text-blue-700' },
    IN_SERVICE_LINE_REVIEW: { label: t('sl_estado_sl_review'),     cls: 'bg-orange-100 text-orange-700' },
    SENT_BACK:              { label: t('sl_estado_sent_back'),     cls: 'bg-orange-100 text-orange-600' },
  };
}

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── Linha da tabela ────────────────────────────────────────────────── */
function LinhaRegisto({ r, tipo }) {
  const { t } = useLanguage();
  const ESTADO_CFG = getEstadoCfg(t);
  const nivelCls = NIVEL_COR[r.codigo_nivel] || 'bg-slate-400';

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition">
      {/* Tipo */}
      <td className="px-4 py-3">
        {tipo === 'obtido' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircle className="h-3 w-3" strokeWidth={2} /> {t('sl_hist_obtido')}
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ESTADO_CFG[r.estado_atual]?.cls || 'bg-slate-100 text-slate-500'}`}>
            <Clock className="h-3 w-3" strokeWidth={2} />
            {ESTADO_CFG[r.estado_atual]?.label || r.estado_atual}
          </span>
        )}
      </td>
      {/* Data */}
      <td className="px-3 py-3 text-sm text-slate-500">{fmt(r.data_evento)}</td>
      {/* Consultor */}
      <td className="px-3 py-3 text-sm font-medium text-slate-800">{r.nome_consultor}</td>
      {/* Badge */}
      <td className="px-3 py-3 text-sm text-slate-700">{r.titulo_badge}</td>
      {/* Nível */}
      <td className="px-3 py-3 text-center">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${nivelCls}`}>
          {r.codigo_nivel}
        </span>
      </td>
      {/* Área */}
      <td className="px-3 py-3 text-sm text-slate-500">{r.nome_area}</td>
      {/* Pontos */}
      <td className="px-3 py-3 text-right text-sm font-semibold text-slate-700">
        {r.pontos > 0 ? r.pontos : <span className="text-slate-300">—</span>}
      </td>
    </tr>
  );
}

/* ─── Página principal ───────────────────────────────────────────────── */
export default function ServiceLineHistorico() {
  const { t } = useLanguage();
  const [aba, setAba]             = useState('todos');
  const [filtroArea, setFiltroArea]   = useState('');
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim]     = useState('');

  /* Áreas para dropdown */
  const { data: slData } = useQuery({
    queryKey: ['sl-dashboard'],
    queryFn: async () => { const { data } = await api.get('/api/estatisticas/service-line'); return data; },
    staleTime: 300_000,
  });
  const areas = slData?.areas || [];

  /* Query principal */
  const { data, isLoading } = useQuery({
    queryKey: ['sl-historico', filtroArea, filtroInicio, filtroFim],
    queryFn: async () => {
      const p = {};
      if (filtroArea)   p.id_area     = filtroArea;
      if (filtroInicio) p.data_inicio = filtroInicio;
      if (filtroFim)    p.data_fim    = filtroFim;
      const { data } = await api.get('/api/estatisticas/service-line/historico', { params: p });
      return data;
    },
    staleTime: 30_000,
  });

  const obtidos    = data?.obtidos     || [];
  const emProcesso = data?.em_processo || [];

  /* Todos combinados e ordenados por data */
  const todos = useMemo(() => {
    const combinados = [
      ...obtidos.map(r    => ({ ...r, _tipo: 'obtido' })),
      ...emProcesso.map(r => ({ ...r, _tipo: 'processo' })),
    ];
    return combinados.sort((a, b) => new Date(b.data_evento) - new Date(a.data_evento));
  }, [obtidos, emProcesso]);

  const lista = aba === 'obtidos' ? obtidos.map(r => ({ ...r, _tipo: 'obtido' }))
              : aba === 'processo' ? emProcesso.map(r => ({ ...r, _tipo: 'processo' }))
              : todos;

  function limparFiltros() { setFiltroArea(''); setFiltroInicio(''); setFiltroFim(''); }
  const temFiltros = filtroArea || filtroInicio || filtroFim;

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo={t('sl_hist_subtitulo')} />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8 space-y-5">

          {/* Filtros */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter className="h-4 w-4" strokeWidth={1.8} /> {t('sl_hist_filtros')}
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[180px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_hist_area')}</label>
                <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className="input text-sm">
                  <option value="">{t('sl_hist_todas_areas')}</option>
                  {areas.map(a => <option key={a.id_area} value={String(a.id_area)}>{a.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_hist_data_inicio')}</label>
                <input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_hist_data_fim')}</label>
                <input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} className="input text-sm" />
              </div>
              {temFiltros && (
                <button type="button" onClick={limparFiltros}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition self-end">
                  <X className="h-3.5 w-3.5" strokeWidth={2} /> {t('sl_hist_limpar')}
                </button>
              )}
            </div>
          </div>

          {/* KPIs rápidos */}
          {!isLoading && data && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: t('sl_hist_kpi_total'),    valor: todos.length,    icon: Award,        cls: 'bg-softinsa-600' },
                { label: t('sl_hist_kpi_obtidos'),  valor: obtidos.length,  icon: CheckCircle,  cls: 'bg-emerald-500' },
                { label: t('sl_hist_kpi_processo'), valor: emProcesso.length, icon: Clock,      cls: 'bg-amber-500' },
              ].map(k => (
                <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${k.cls}`}>
                    <k.icon className="h-5 w-5 text-white" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{k.label}</p>
                    <p className="text-xl font-bold text-slate-900">{k.valor}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Abas */}
          <div className="flex gap-2">
            {[
              { id: 'todos',    label: t('sl_hist_aba_todos').replace('{n}', todos.length) },
              { id: 'obtidos',  label: t('sl_hist_aba_obtidos').replace('{n}', obtidos.length) },
              { id: 'processo', label: t('sl_hist_aba_processo').replace('{n}', emProcesso.length) },
            ].map(tab => (
              <button key={tab.id} type="button" onClick={() => setAba(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  aba === tab.id
                    ? 'bg-white border border-slate-200 text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tabela */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-16"><Carregando /></div>
            ) : lista.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <Award className="h-10 w-10 opacity-30 mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium">{t('sl_hist_sem_registos')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 text-left">{t('sl_hist_th_estado')}</th>
                      <th className="px-3 py-3 text-left">{t('sl_hist_th_data')}</th>
                      <th className="px-3 py-3 text-left">{t('sl_hist_th_consultor')}</th>
                      <th className="px-3 py-3 text-left">{t('sl_hist_th_badge')}</th>
                      <th className="px-3 py-3 text-center">{t('sl_hist_th_nivel')}</th>
                      <th className="px-3 py-3 text-left">{t('sl_hist_th_area')}</th>
                      <th className="px-3 py-3 text-right">{t('sl_hist_th_pontos')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((r, i) => (
                      <LinhaRegisto key={i} r={r} tipo={r._tipo} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
