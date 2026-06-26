import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, AlertCircle, Award, Clock, AlertTriangle, Search, Download, Eye, Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, obterTodasDaRota } from '../../lib/api';
import { TalentManagerSidebar, TalentManagerTopbar } from '../../components/TalentManagerShell';
import Carregando from '../../components/Carregando';
import ConsultorPerfilModal from './ConsultorPerfilModal';
import CandidaturaDetalheModal from './CandidaturaDetalheModal';
import { exportCSV } from '../../lib/exportar';
import { useTM } from './i18n';

const ESTADO_LABEL = {
  OPEN: { key: 'est_aberto', cls: 'bg-blue-100 text-blue-700' },
  SUBMITTED: { key: 'est_submetido', cls: 'bg-amber-100 text-amber-700' },
  IN_TALENT_REVIEW: { key: 'est_em_validacao', cls: 'bg-amber-100 text-amber-700' },
  IN_SERVICE_LINE_REVIEW: { key: 'est_em_validacao', cls: 'bg-orange-100 text-orange-700' },
  APPROVED: { key: 'est_fechado', cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { key: 'est_rejeitado', cls: 'bg-rose-100 text-rose-700' },
  SENT_BACK: { key: 'est_devolvido', cls: 'bg-orange-100 text-orange-600' },
  CLOSED: { key: 'est_fechado', cls: 'bg-emerald-100 text-emerald-700' },
};
const FECHADOS = ['APPROVED', 'REJECTED', 'CLOSED'];
const EM_VALIDACAO = ['IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW'];
const POR_PAGINA_CANDIDATURAS = 6;
const POR_PAGINA_CONSULTORES = 8;

function prioridade(pontos) {
  const p = Number(pontos) || 0;
  if (p >= 350) return { key: 'prio_alta', cls: 'bg-rose-100 text-rose-600' };
  if (p >= 250) return { key: 'prio_media', cls: 'bg-amber-100 text-amber-700' };
  return { key: 'prio_baixa', cls: 'bg-slate-100 text-slate-600' };
}
function formatarTempoRestante(info, tt) {
  const restante = Number(info.limite_horas || 0) - Number(info.horas_em_fase || 0);
  if (restante <= 0) return tt('prazo_atrasado');
  if (restante < 24) {
    const horas = Math.max(1, Math.ceil(restante));
    return `${horas} ${tt(horas === 1 ? 'hora' : 'horas')}`;
  }
  const dias = Math.ceil(restante / 24);
  return `${dias} ${tt(dias === 1 ? 'dia' : 'dias')}`;
}
function prazoFallback(c) {
  const base = c.data_submissao || c.data_abertura;
  if (!base) return { key: null, cls: 'text-slate-300' };
  const dias = (Date.now() - new Date(base).getTime()) / 86_400_000;
  if (dias > 14) return { key: 'prazo_atrasado', cls: 'text-rose-600 font-semibold' };
  if (dias > 7) return { key: 'prazo_proximo', cls: 'text-amber-600 font-semibold' };
  return { key: 'prazo_no_prazo', cls: 'text-emerald-600' };
}
function prazo(c, slaInfo, tt) {
  if (FECHADOS.includes(c.estado_atual)) return { key: 'prazo_concluido', cls: 'text-slate-400' };
  if (!slaInfo) return prazoFallback(c);
  if (!slaInfo.limite_horas) return { label: '—', cls: 'text-slate-300' };
  if (slaInfo.estado_sla === 'ULTRAPASSADO') return { key: 'prazo_atrasado', cls: 'text-rose-600 font-semibold' };
  if (slaInfo.estado_sla === 'PROXIMO_LIMITE') return { label: formatarTempoRestante(slaInfo, tt), cls: 'text-amber-600 font-semibold' };
  return { label: formatarTempoRestante(slaInfo, tt), cls: 'text-emerald-600' };
}
function formatarData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
/* Delega no exportCSV partilhado (separador ';' — o que o Excel em PT espera),
   para o formato ser consistente com o resto da plataforma. */
function exportarCSV(nome, cabecalho, linhas) {
  exportCSV(`${nome}_${new Date().toISOString().slice(0, 10)}.csv`, cabecalho, linhas);
}

function Kpi({ icon: Icon, label, valor, cor }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cor.bg}`}>
          <Icon className={`h-4 w-4 ${cor.text}`} strokeWidth={1.8} />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{valor}</p>
    </div>
  );
}

export default function TalentDashboard() {
  const tt = useTM();
  const [tab, setTab] = useState('TODOS');
  const [pesquisa, setPesquisa] = useState('');
  const [paginaTabela, setPaginaTabela] = useState(1);
  const [paginaConsultores, setPaginaConsultores] = useState(1);
  const [modalConsultor, setModalConsultor] = useState(null);
  const [filtroAreaCons, setFiltroAreaCons] = useState('');
  const [filtroSLCons, setFiltroSLCons] = useState('');
  const [modalCandidatura, setModalCandidatura] = useState(null);

  const TABS = [
    { key: 'TODOS', label: tt('tab_todos') },
    { key: 'OPEN', label: 'Open' },
    { key: 'SUBMITTED', label: 'Submitted' },
    { key: 'VALIDACAO', label: tt('est_em_validacao') },
    { key: 'FECHADO', label: tt('tab_fechado') },
  ];

  const { data: candData, isLoading: loadCand } = useQuery({
    queryKey: ['tm-candidaturas'],
    queryFn: async () => { const { data } = await api.get('/api/candidaturas?por_pagina=200'); return data; },
    staleTime: 20_000, refetchInterval: 20_000,
  });
  const { data: rankData, isLoading: loadRank } = useQuery({
    queryKey: ['tm-ranking'],
    queryFn: async () => { const { data } = await api.get('/api/estatisticas/ranking?limite=50'); return data; },
    staleTime: 60_000,
  });
  const { data: slaData } = useQuery({
    queryKey: ['tm-dashboard-sla'],
    queryFn: async () => { const { data } = await api.get('/api/sla/fora-prazo', { params: { todos: 1 } }); return data; },
    staleTime: 20_000, refetchInterval: 20_000,
  });

  const candidaturas = candData?.dados ?? [];
  const consultores = (rankData?.dados ?? []).filter(c => Number(c.total_badges) > 0 || Number(c.pontos_totais) > 0);
  const areasConsultores = useMemo(() => [...new Set(consultores.map(c => c.nome_area).filter(Boolean))].sort(), [consultores]);
  const serviceLinesConsultores = useMemo(() => [...new Set(consultores.map(c => c.nome_service_line).filter(Boolean))].sort(), [consultores]);
  const consultoresFiltrados = useMemo(
    () => consultores.filter(c =>
      (!filtroSLCons || c.nome_service_line === filtroSLCons) &&
      (!filtroAreaCons || c.nome_area === filtroAreaCons)
    ),
    [consultores, filtroSLCons, filtroAreaCons],
  );
  const slaPorCandidatura = useMemo(
    () => new Map((slaData?.dados || []).map((item) => [Number(item.id_candidatura), item])),
    [slaData],
  );

  const kpis = useMemo(() => {
    let validacao = 0, aprovados = 0, pendentes = 0, critico = 0;
    for (const c of candidaturas) {
      if (EM_VALIDACAO.includes(c.estado_atual)) validacao++;
      else if (c.estado_atual === 'APPROVED') aprovados++;
      else if (['OPEN', 'SUBMITTED', 'SENT_BACK'].includes(c.estado_atual)) pendentes++;
      const slaInfo = slaPorCandidatura.get(Number(c.id_candidatura));
      if (!FECHADOS.includes(c.estado_atual) && ['ULTRAPASSADO', 'PROXIMO_LIMITE'].includes(slaInfo?.estado_sla)) critico++;
    }
    return { total: candidaturas.length, validacao, aprovados, pendentes, critico };
  }, [candidaturas, slaPorCandidatura]);

  const tabela = useMemo(() => {
    let l = candidaturas;
    if (tab === 'OPEN') l = l.filter(c => ['OPEN', 'SENT_BACK'].includes(c.estado_atual));
    else if (tab === 'SUBMITTED') l = l.filter(c => c.estado_atual === 'SUBMITTED');
    else if (tab === 'VALIDACAO') l = l.filter(c => EM_VALIDACAO.includes(c.estado_atual));
    else if (tab === 'FECHADO') l = l.filter(c => FECHADOS.includes(c.estado_atual));
    if (pesquisa) {
      const q = pesquisa.toLowerCase();
      l = l.filter(c => c.titulo_badge?.toLowerCase().includes(q) || c.nome_consultor?.toLowerCase().includes(q));
    }
    return [...l].sort((a, b) => new Date(b.data_submissao || b.data_abertura) - new Date(a.data_submissao || a.data_abertura));
  }, [candidaturas, tab, pesquisa]);

  const totalPaginasTabela = Math.max(1, Math.ceil(tabela.length / POR_PAGINA_CANDIDATURAS));
  const paginaAtualTabela = Math.min(paginaTabela, totalPaginasTabela);
  const inicioTabela = (paginaAtualTabela - 1) * POR_PAGINA_CANDIDATURAS;
  const fimTabela = Math.min(inicioTabela + POR_PAGINA_CANDIDATURAS, tabela.length);
  const tabelaPagina = tabela.slice(inicioTabela, fimTabela);

  useEffect(() => {
    setPaginaTabela(1);
  }, [tab, pesquisa]);

  useEffect(() => {
    setPaginaTabela((pagina) => Math.min(pagina, totalPaginasTabela));
  }, [totalPaginasTabela]);

  const topConsultores = useMemo(() => consultores.slice(0, 3), [consultores]);
  const totalPaginasConsultores = Math.max(1, Math.ceil(consultoresFiltrados.length / POR_PAGINA_CONSULTORES));
  const paginaAtualConsultores = Math.min(paginaConsultores, totalPaginasConsultores);
  const inicioConsultores = (paginaAtualConsultores - 1) * POR_PAGINA_CONSULTORES;
  const fimConsultores = Math.min(inicioConsultores + POR_PAGINA_CONSULTORES, consultoresFiltrados.length);
  const consultoresPagina = consultoresFiltrados.slice(inicioConsultores, fimConsultores);

  useEffect(() => {
    setPaginaConsultores(1);
  }, [filtroAreaCons, filtroSLCons]);

  useEffect(() => {
    setPaginaConsultores((pagina) => Math.min(pagina, totalPaginasConsultores));
  }, [totalPaginasConsultores]);

  const badgesRecentes = useMemo(
    () => candidaturas.filter(c => c.estado_atual === 'APPROVED' && Number(c.is_conquista_especial) === 1)
      .sort((a, b) => new Date(b.data_fecho || b.data_submissao) - new Date(a.data_fecho || a.data_submissao)).slice(0, 3),
    [candidaturas],
  );

  async function exportarCandidaturas() {
    try {
      const { dados } = await obterTodasDaRota('/api/candidaturas');
      let l = dados;
      if (tab === 'OPEN') l = l.filter(c => ['OPEN', 'SENT_BACK'].includes(c.estado_atual));
      else if (tab === 'SUBMITTED') l = l.filter(c => c.estado_atual === 'SUBMITTED');
      else if (tab === 'VALIDACAO') l = l.filter(c => EM_VALIDACAO.includes(c.estado_atual));
      else if (tab === 'FECHADO') l = l.filter(c => FECHADOS.includes(c.estado_atual));
      if (pesquisa) {
        const q = pesquisa.toLowerCase();
        l = l.filter(c => c.titulo_badge?.toLowerCase().includes(q) || c.nome_consultor?.toLowerCase().includes(q));
      }
      exportarCSV('candidaturas',
        [tt('col_consultor'), tt('col_badge'), tt('col_area'), tt('col_estado'), tt('col_evidencias'), tt('col_data_sub'), tt('col_pontos')],
        l.map(c => [c.nome_consultor, c.titulo_badge, c.nome_area,
          tt(ESTADO_LABEL[c.estado_atual]?.key), `${c.evidencias_count}/${c.total_requisitos}`,
          formatarData(c.data_submissao || c.data_abertura), c.pontos]));
    } catch { toast.error(tt('exportar') + ' — erro'); }
  }
  function exportarConsultores() {
    exportarCSV('consultores',
      [tt('col_nome'), tt('col_service_line'), tt('col_area'), tt('col_badges_obtidos'), tt('col_pontos_totais')],
      consultoresFiltrados.map(c => [c.nome, c.nome_service_line, c.nome_area, c.total_badges, c.pontos_totais]));
  }

  const isLoading = loadCand || loadRank;

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      {modalConsultor && <ConsultorPerfilModal consultor={modalConsultor} onFechar={() => setModalConsultor(null)} />}
      {modalCandidatura && <CandidaturaDetalheModal idCandidatura={modalCandidatura} onFechar={() => setModalCandidatura(null)} />}

      <TalentManagerSidebar />
      <div className="lg:pl-[240px]">
        <TalentManagerTopbar titulo={tt('dash_titulo')} subtitulo={tt('dash_sub')} />

        <main className="px-5 py-8 lg:px-8 pb-24 lg:pb-10">
          {isLoading ? (
            <div className="flex min-h-[60vh] items-center justify-center"><Carregando /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <Kpi icon={FileText} label={tt('kpi_total')} valor={kpis.total} cor={{ bg: 'bg-blue-50', text: 'text-blue-500' }} />
                <Kpi icon={AlertCircle} label={tt('kpi_validacao')} valor={kpis.validacao} cor={{ bg: 'bg-amber-50', text: 'text-amber-500' }} />
                <Kpi icon={Award} label={tt('kpi_aprovados')} valor={kpis.aprovados} cor={{ bg: 'bg-emerald-50', text: 'text-emerald-500' }} />
                <Kpi icon={Clock} label={tt('kpi_pendentes')} valor={kpis.pendentes} cor={{ bg: 'bg-amber-50', text: 'text-amber-600' }} />
                <Kpi icon={AlertTriangle} label={tt('kpi_critico')} valor={kpis.critico} cor={{ bg: 'bg-rose-50', text: 'text-rose-500' }} />
              </div>

              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-slate-900">{tt('estado_tempo_real')}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                      <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder={tt('pesquisar')}
                        className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-softinsa-400" />
                    </div>
                    <button type="button" onClick={exportarCandidaturas}
                      className="flex items-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700">
                      <Download className="h-4 w-4" /> {tt('exportar')}
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">{tt('col_estado')}:</span>
                  {TABS.map(tb => (
                    <button key={tb.key} type="button" onClick={() => setTab(tb.key)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${tab === tb.key ? 'bg-softinsa-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      {tb.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                        <th className="px-3 py-3 text-left">{tt('col_consultor')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_badge')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_prioridade')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_estado')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_evidencias')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_prazo')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_data_sub')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_pontos')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_acao')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {tabela.length === 0 ? (
                        <tr><td colSpan={9} className="py-10 text-center text-sm text-slate-400">{tt('sem_candidaturas_estado')}</td></tr>
                      ) : tabelaPagina.map(c => {
                        const est = ESTADO_LABEL[c.estado_atual] || { key: null, cls: 'bg-slate-100 text-slate-600' };
                        const prio = prioridade(c.pontos);
                        const pz = prazo(c, slaPorCandidatura.get(Number(c.id_candidatura)), tt);
                        return (
                          <tr key={c.id_candidatura} className="hover:bg-slate-50/60">
                            <td className="px-3 py-3.5 font-medium text-slate-800">{c.nome_consultor}</td>
                            <td className="px-3 py-3.5 text-slate-600">{c.titulo_badge}</td>
                            <td className="px-3 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${prio.cls}`}>{tt(prio.key)}</span></td>
                            <td className="px-3 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${est.cls}`}>{est.key ? tt(est.key) : c.estado_atual}</span></td>
                            <td className="px-3 py-3.5">
                              {c.evidencias_count > 0
                                ? <span className="text-softinsa-600">{c.evidencias_count} {c.evidencias_count > 1 ? tt('ficheiros') : tt('ficheiro')}</span>
                                : <span className="text-slate-300">{tt('sem_evidencias')}</span>}
                            </td>
                            <td className={`px-3 py-3.5 text-xs ${pz.cls}`}>{pz.label || (pz.key ? tt(pz.key) : '—')}</td>
                            <td className="px-3 py-3.5 text-slate-600">{formatarData(c.data_submissao || c.data_abertura)}</td>
                            <td className="px-3 py-3.5 font-semibold text-softinsa-600">{c.pontos || 0}</td>
                            <td className="px-3 py-3.5">
                              <button type="button" onClick={() => setModalCandidatura(c.id_candidatura)}
                                className="flex items-center gap-1.5 text-sm font-medium text-softinsa-600 hover:underline">
                                <Eye className="h-4 w-4" /> {tt('ver_detalhes')}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {tabela.length > 0 && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {tt('a_mostrar')} {inicioTabela + 1}-{fimTabela} {tt('de_total')} {tabela.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button type="button" disabled={paginaAtualTabela === 1} onClick={() => setPaginaTabela((pagina) => Math.max(1, pagina - 1))}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                        {tt('pagina_anterior')}
                      </button>
                      <span className="min-w-[92px] text-center font-semibold text-slate-600">
                        {tt('pagina')} {paginaAtualTabela}/{totalPaginasTabela}
                      </span>
                      <button type="button" disabled={paginaAtualTabela === totalPaginasTabela} onClick={() => setPaginaTabela((pagina) => Math.min(totalPaginasTabela, pagina + 1))}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                        {tt('pagina_seguinte')}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-slate-900">{tt('progresso_consultores')}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={filtroSLCons} onChange={e => setFiltroSLCons(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400">
                      <option value="">{tt('todas_sl')}</option>
                      {serviceLinesConsultores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={filtroAreaCons} onChange={e => setFiltroAreaCons(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400">
                      <option value="">{tt('todas_areas')}</option>
                      {areasConsultores.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <button type="button" onClick={exportarConsultores}
                      className="flex items-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700">
                      <Download className="h-4 w-4" /> {tt('exportar')}
                    </button>
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                        <th className="px-3 py-3 text-left">{tt('col_nome')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_service_line')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_area')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_badges_obtidos')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_pontos_totais')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_acao')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {consultoresFiltrados.length === 0 ? (
                        <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">{tt('sem_consultores')}</td></tr>
                      ) : consultoresPagina.map(c => (
                        <tr key={c.id_utilizador} className="hover:bg-slate-50/60">
                          <td className="px-3 py-3.5 font-medium text-slate-800">{c.nome}</td>
                          <td className="px-3 py-3.5 text-slate-600">{c.nome_service_line || '—'}</td>
                          <td className="px-3 py-3.5 text-slate-600">{c.nome_area || '—'}</td>
                          <td className="px-3 py-3.5"><span className="inline-flex items-center gap-1.5 text-slate-700"><Award className="h-4 w-4 text-softinsa-500" /> {c.total_badges}</span></td>
                          <td className="px-3 py-3.5 font-semibold text-softinsa-600">{Number(c.pontos_totais).toLocaleString('pt-PT')}</td>
                          <td className="px-3 py-3.5">
                            <button type="button" onClick={() => setModalConsultor(c)} className="flex items-center gap-1.5 text-sm font-medium text-softinsa-600 hover:underline">
                              <Eye className="h-4 w-4" /> {tt('ver_perfil')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {consultoresFiltrados.length > 0 && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {tt('a_mostrar')} {inicioConsultores + 1}-{fimConsultores} {tt('de_total')} {consultoresFiltrados.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button type="button" disabled={paginaAtualConsultores === 1} onClick={() => setPaginaConsultores((pagina) => Math.max(1, pagina - 1))}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                        {tt('pagina_anterior')}
                      </button>
                      <span className="min-w-[92px] text-center font-semibold text-slate-600">
                        {tt('pagina')} {paginaAtualConsultores}/{totalPaginasConsultores}
                      </span>
                      <button type="button" disabled={paginaAtualConsultores === totalPaginasConsultores} onClick={() => setPaginaConsultores((pagina) => Math.min(totalPaginasConsultores, pagina + 1))}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                        {tt('pagina_seguinte')}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Trophy className="h-5 w-5 text-amber-500" /> {tt('top_consultores')}</h2>
                  <div className="mt-4 space-y-3">
                    {topConsultores.length === 0 ? (
                      <p className="text-sm text-slate-400">—</p>
                    ) : topConsultores.map((c, i) => (
                      <div key={c.id_utilizador} className="flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-orange-400'}`}>{i + 1}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{c.nome}</p>
                          <p className="text-xs text-slate-500">
                            <Trophy className="mr-1 inline h-3 w-3 text-amber-500" />{Number(c.pontos_totais).toLocaleString('pt-PT')} {tt('pontos')}
                            <span className="mx-1">·</span>
                            <Award className="mr-1 inline h-3 w-3 text-softinsa-500" />{c.total_badges} {tt('badges')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900">{tt('badges_recentes')}</h2>
                  <div className="mt-4 space-y-3">
                    {badgesRecentes.length === 0 ? (
                      <p className="text-sm text-slate-400">—</p>
                    ) : badgesRecentes.map(c => (
                      <div key={c.id_candidatura} className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500"><Award className="h-5 w-5" strokeWidth={1.8} /></div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{c.titulo_badge}</p>
                          <p className="text-xs text-softinsa-600">{c.nome_consultor}</p>
                          <p className="text-[11px] text-slate-400">{formatarData(c.data_fecho || c.data_submissao)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
