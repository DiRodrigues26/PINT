import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Filter, X, FileText, CheckCircle, XCircle, TrendingUp, Clock, AlertCircle,
  ArrowUp, ArrowDown, Download, ChevronDown,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { api, obterTodasDaRota } from '../../lib/api';
import { TalentManagerSidebar, TalentManagerTopbar } from '../../components/TalentManagerShell';
import Carregando from '../../components/Carregando';
import { exportCSV, exportPDF } from '../../lib/exportUtils';
import { useTM } from './i18n';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const EM_VALIDACAO = ['IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW'];

function grupoEstado(e) {
  if (['OPEN', 'SENT_BACK'].includes(e)) return 'aberto';
  if (e === 'SUBMITTED') return 'submetido';
  if (EM_VALIDACAO.includes(e)) return 'validacao';
  if (e === 'APPROVED') return 'aprovado';
  if (e === 'REJECTED') return 'rejeitado';
  return 'outro';
}
const COR_ESTADO = {
  aberto: '#94a3b8', submetido: '#3b82f6', validacao: '#64748b',
  aprovado: '#10b981', rejeitado: '#ef4444', outro: '#cbd5e1',
};
const ESTADO_KEY = {
  aberto: 'est_aberto', submetido: 'est_submetido', validacao: 'est_em_validacao',
  aprovado: 'est_aprovado', rejeitado: 'est_rejeitado',
};

function dataDe(c) { return new Date(c.data_submissao || c.data_abertura); }

/* trend: compara últimos 30 dias vs 30-60 dias atrás */
function calcTrend(cands, filtro) {
  const agora = Date.now();
  const d30 = agora - 30 * 86_400_000;
  const d60 = agora - 60 * 86_400_000;
  const recente = cands.filter(c => filtro(c) && dataDe(c).getTime() >= d30).length;
  const anterior = cands.filter(c => filtro(c) && dataDe(c).getTime() >= d60 && dataDe(c).getTime() < d30).length;
  if (anterior === 0) return recente > 0 ? { pct: 100, up: true } : null;
  const pct = Math.round(((recente - anterior) / anterior) * 100);
  return { pct: Math.abs(pct), up: pct >= 0 };
}

function Kpi({ icon: Icon, valor, label, trend, cor, vsLabel }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cor.bg}`}>
          <Icon className={`h-5 w-5 ${cor.text}`} strokeWidth={1.8} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend.up ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{trend.pct}%
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-[11px] text-slate-300">{vsLabel}</p>
    </div>
  );
}

export default function TalentRelatorios() {
  const tt = useTM();
  const [sl, setSl] = useState('');
  const [area, setArea] = useState('');
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [aplicados, setAplicados] = useState({ sl: '', area: '', dataIni: '', dataFim: '' });
  const [exportAberto, setExportAberto] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tm-candidaturas'],
    queryFn: async () => { const { data } = await api.get('/api/candidaturas?por_pagina=200'); return data; },
    staleTime: 30_000,
  });
  const todas = data?.dados ?? [];

  const serviceLines = useMemo(() => [...new Set(todas.map(c => c.nome_service_line).filter(Boolean))], [todas]);
  const areas = useMemo(() => [...new Set(todas.map(c => c.nome_area).filter(Boolean))], [todas]);

  const cands = useMemo(() => {
    let l = todas;
    if (aplicados.sl) l = l.filter(c => c.nome_service_line === aplicados.sl);
    if (aplicados.area) l = l.filter(c => c.nome_area === aplicados.area);
    if (aplicados.dataIni) l = l.filter(c => dataDe(c) >= new Date(aplicados.dataIni));
    if (aplicados.dataFim) l = l.filter(c => dataDe(c) <= new Date(aplicados.dataFim + 'T23:59:59'));
    return l;
  }, [todas, aplicados]);

  const kpis = useMemo(() => {
    const aprov = cands.filter(c => c.estado_atual === 'APPROVED');
    const rej = cands.filter(c => c.estado_atual === 'REJECTED');
    const emVal = cands.filter(c => EM_VALIDACAO.includes(c.estado_atual));
    const decididas = aprov.length + rej.length;
    const taxa = decididas ? Math.round((aprov.length / decididas) * 100) : 0;
    const tempos = aprov.filter(c => c.data_submissao && c.data_fecho)
      .map(c => (new Date(c.data_fecho) - new Date(c.data_submissao)) / 86_400_000);
    const tempoMedio = tempos.length ? (tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1) : '0';
    return { total: cands.length, aprov: aprov.length, rej: rej.length, taxa, tempoMedio, emVal: emVal.length };
  }, [cands]);

  const porArea = useMemo(() => {
    const m = new Map();
    for (const c of cands) { const a = c.nome_area || '—'; m.set(a, (m.get(a) || 0) + 1); }
    return [...m.entries()].map(([area, total]) => ({ area, total }));
  }, [cands]);

  const distEstado = useMemo(() => {
    const m = new Map();
    for (const c of cands) { const g = grupoEstado(c.estado_atual); m.set(g, (m.get(g) || 0) + 1); }
    const total = cands.length || 1;
    return [...m.entries()].map(([estado, valor]) => ({
      estado,
      label: ESTADO_KEY[estado] ? tt(ESTADO_KEY[estado]) : estado,
      valor, pct: Math.round((valor / total) * 100),
    }));
  }, [cands, tt]);

  const evolucao = useMemo(() => {
    const m = new Map();
    for (const c of cands) {
      const d = dataDe(c);
      if (isNaN(d)) continue;
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, total]) => { const [y, mo] = k.split('-'); return { mes: `${MESES[+mo]}/${String(y).slice(2)}`, total }; });
  }, [cands]);

  const aprovVsRej = useMemo(() => {
    const m = new Map();
    for (const c of cands) {
      if (!['APPROVED', 'REJECTED'].includes(c.estado_atual)) continue;
      const a = c.nome_area || '—';
      const o = m.get(a) || { area: a, aprovadas: 0, rejeitadas: 0 };
      if (c.estado_atual === 'APPROVED') o.aprovadas++; else o.rejeitadas++;
      m.set(a, o);
    }
    return [...m.values()];
  }, [cands]);

  function aplicar() { setAplicados({ sl, area, dataIni, dataFim }); }
  function limpar() { setSl(''); setArea(''); setDataIni(''); setDataFim(''); setAplicados({ sl: '', area: '', dataIni: '', dataFim: '' }); }

  // Exportação: resumo por área (dados que alimentam os gráficos, respeitando os filtros)
  function dadosExport(itens) {
    const headers = [tt('col_area'), tt('candidaturas_n'), tt('aprovadas'), tt('rejeitadas'), tt('rkpi_em_validacao')];
    const porAreaMap = new Map();
    const tot = { total: 0, aprov: 0, rej: 0, val: 0 };
    for (const c of itens) {
      const a = c.nome_area || '—';
      const o = porAreaMap.get(a) || { total: 0, aprov: 0, rej: 0, val: 0 };
      o.total++; tot.total++;
      if (c.estado_atual === 'APPROVED') { o.aprov++; tot.aprov++; }
      else if (c.estado_atual === 'REJECTED') { o.rej++; tot.rej++; }
      else if (EM_VALIDACAO.includes(c.estado_atual)) { o.val++; tot.val++; }
      porAreaMap.set(a, o);
    }
    const rows = [...porAreaMap.entries()].map(([a, o]) => [a, o.total, o.aprov, o.rej, o.val]);
    rows.push(['TOTAL', tot.total, tot.aprov, tot.rej, tot.val]);
    return { headers, rows };
  }
  // Todas as candidaturas (todas as páginas) com os filtros aplicados
  async function obterListaCompleta() {
    const { dados } = await obterTodasDaRota('/api/candidaturas');
    let l = dados;
    if (aplicados.sl) l = l.filter(c => c.nome_service_line === aplicados.sl);
    if (aplicados.area) l = l.filter(c => c.nome_area === aplicados.area);
    if (aplicados.dataIni) l = l.filter(c => dataDe(c) >= new Date(aplicados.dataIni));
    if (aplicados.dataFim) l = l.filter(c => dataDe(c) <= new Date(aplicados.dataFim + 'T23:59:59'));
    return l;
  }
  async function exportarExcel() {
    try {
      const { headers, rows } = dadosExport(await obterListaCompleta());
      exportCSV(`relatorio_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } catch { toast.error(tt('exportar') + ' — erro'); }
    setExportAberto(false);
  }
  async function exportarPdf() {
    try {
      const { headers, rows } = dadosExport(await obterListaCompleta());
      exportPDF(`relatorio_${new Date().toISOString().slice(0, 10)}.pdf`, tt('rel_titulo'), headers, rows, tt('rel_sub'));
    } catch { toast.error(tt('exportar') + ' — erro'); }
    setExportAberto(false);
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <TalentManagerSidebar />
      <div className="lg:pl-[240px]">
        <TalentManagerTopbar titulo={tt('rel_titulo')} subtitulo={tt('rel_sub')} />

        <main className="px-5 py-8 lg:px-8 pb-24 lg:pb-10">
          {isLoading ? (
            <div className="flex min-h-[60vh] items-center justify-center"><Carregando /></div>
          ) : (
            <>
              {/* Filtros */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><Filter className="h-4 w-4 text-slate-500" /> {tt('filtros')}</div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">{tt('col_service_line')}</label>
                    <select value={sl} onChange={e => setSl(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                      <option value="">{tt('todas')}</option>{serviceLines.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">{tt('col_area')}</label>
                    <select value={area} onChange={e => setArea(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                      <option value="">{tt('todas')}</option>{areas.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">{tt('data_inicio')}</label>
                    <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-softinsa-400" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">{tt('data_fim')}</label>
                    <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-softinsa-400" />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={aplicar} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">{tt('aplicar_filtros')}</button>
                  <button type="button" onClick={limpar} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" /> {tt('limpar_filtros')}</button>
                  <div className="relative ml-auto">
                    <button type="button" onClick={() => setExportAberto(v => !v)}
                      className="flex items-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700">
                      <Download className="h-4 w-4" /> {tt('exportar')} <ChevronDown className="h-4 w-4" />
                    </button>
                    {exportAberto && (
                      <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                        <button type="button" onClick={exportarExcel} className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">Excel (CSV)</button>
                        <button type="button" onClick={exportarPdf} className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">PDF</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
                <Kpi icon={FileText} valor={kpis.total} label={tt('rkpi_total')} vsLabel={tt('vs_periodo')} cor={{ bg: 'bg-blue-50', text: 'text-blue-500' }} trend={calcTrend(cands, () => true)} />
                <Kpi icon={CheckCircle} valor={kpis.aprov} label={tt('rkpi_aprovadas')} vsLabel={tt('vs_periodo')} cor={{ bg: 'bg-emerald-50', text: 'text-emerald-500' }} trend={calcTrend(cands, c => c.estado_atual === 'APPROVED')} />
                <Kpi icon={XCircle} valor={kpis.rej} label={tt('rkpi_rejeitadas')} vsLabel={tt('vs_periodo')} cor={{ bg: 'bg-rose-50', text: 'text-rose-500' }} trend={calcTrend(cands, c => c.estado_atual === 'REJECTED')} />
                <Kpi icon={TrendingUp} valor={`${kpis.taxa}%`} label={tt('rkpi_taxa')} vsLabel={tt('vs_periodo')} cor={{ bg: 'bg-violet-50', text: 'text-violet-500' }} />
                <Kpi icon={Clock} valor={`${kpis.tempoMedio}d`} label={tt('rkpi_tempo')} vsLabel={tt('vs_periodo')} cor={{ bg: 'bg-amber-50', text: 'text-amber-500' }} />
                <Kpi icon={AlertCircle} valor={kpis.emVal} label={tt('rkpi_em_validacao')} vsLabel={tt('vs_periodo')} cor={{ bg: 'bg-amber-50', text: 'text-amber-600' }} trend={calcTrend(cands, c => EM_VALIDACAO.includes(c.estado_atual))} />
              </div>

              {/* Gráficos linha 1 */}
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Grafico titulo={tt('graf_por_area')}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={porArea}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="area" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </Grafico>

                <Grafico titulo={tt('graf_dist_estado')}>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={distEstado} dataKey="valor" nameKey="label" cx="50%" cy="50%" outerRadius={90}
                        label={({ label, pct }) => `${label} (${pct}%)`} labelLine fontSize={11}>
                        {distEstado.map(d => <Cell key={d.estado} fill={COR_ESTADO[d.estado] || '#cbd5e1'} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Grafico>
              </div>

              {/* Gráficos linha 2 */}
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Grafico titulo={tt('graf_evolucao')}>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={evolucao}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Grafico>

                <Grafico titulo={tt('graf_aprov_rej')}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={aprovVsRej}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="area" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="aprovadas" name={tt('aprovadas')} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="rejeitadas" name={tt('rejeitadas')} fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </Grafico>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Grafico({ titulo, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
