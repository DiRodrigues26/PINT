import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, AlertCircle, Award, Clock, AlertTriangle, Search, Download, Eye, Trophy,
} from 'lucide-react';
import { api } from '../../lib/api';
import { TalentManagerSidebar, TalentManagerTopbar } from '../../components/TalentManagerShell';
import Carregando from '../../components/Carregando';
import ConsultorPerfilModal from './ConsultorPerfilModal';
import CandidaturaDetalheModal from './CandidaturaDetalheModal';

/* ─── Helpers de estado / prioridade / prazo ─────────────────────────── */
const ESTADO_LABEL = {
  OPEN: { label: 'Aberto', cls: 'bg-blue-100 text-blue-700' },
  SUBMITTED: { label: 'Submetido', cls: 'bg-amber-100 text-amber-700' },
  IN_TALENT_REVIEW: { label: 'Em Validação', cls: 'bg-amber-100 text-amber-700' },
  IN_SERVICE_LINE_REVIEW: { label: 'Em Validação', cls: 'bg-orange-100 text-orange-700' },
  APPROVED: { label: 'Fechado', cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Rejeitado', cls: 'bg-rose-100 text-rose-700' },
  SENT_BACK: { label: 'Devolvido', cls: 'bg-orange-100 text-orange-600' },
  CLOSED: { label: 'Fechado', cls: 'bg-emerald-100 text-emerald-700' },
};
const FECHADOS = ['APPROVED', 'REJECTED', 'CLOSED'];
const EM_VALIDACAO = ['IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW'];

function prioridade(pontos) {
  const p = Number(pontos) || 0;
  if (p >= 350) return { label: 'Alta', cls: 'bg-rose-100 text-rose-600' };
  if (p >= 250) return { label: 'Média', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Baixa', cls: 'bg-slate-100 text-slate-600' };
}

function prazo(c) {
  if (FECHADOS.includes(c.estado_atual)) return { label: 'Concluído', cls: 'text-slate-400' };
  const base = c.data_submissao || c.data_abertura;
  if (!base) return { label: '—', cls: 'text-slate-300' };
  const dias = (Date.now() - new Date(base).getTime()) / 86_400_000;
  if (dias > 14) return { label: 'Atrasado', cls: 'text-rose-600 font-semibold', critico: true };
  if (dias > 7) return { label: 'Próximo', cls: 'text-amber-600 font-semibold', critico: true };
  return { label: 'No prazo', cls: 'text-emerald-600' };
}

function formatarData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function exportarCSV(nome, cabecalho, linhas) {
  const csv = [cabecalho, ...linhas]
    .map(l => l.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${nome}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

/* ─── KPI ─────────────────────────────────────────────────────────────── */
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

const TABS = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'OPEN', label: 'Open' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'VALIDACAO', label: 'Em Validação' },
  { key: 'FECHADO', label: 'Fechado' },
];

export default function TalentDashboard() {
  const [tab, setTab] = useState('TODOS');
  const [pesquisa, setPesquisa] = useState('');
  const [modalConsultor, setModalConsultor] = useState(null);
  const [modalCandidatura, setModalCandidatura] = useState(null);

  const { data: candData, isLoading: loadCand } = useQuery({
    queryKey: ['tm-candidaturas'],
    queryFn: async () => { const { data } = await api.get('/api/candidaturas?por_pagina=200'); return data; },
    staleTime: 20_000,
    refetchInterval: 20_000,
  });
  const { data: rankData, isLoading: loadRank } = useQuery({
    queryKey: ['tm-ranking'],
    queryFn: async () => { const { data } = await api.get('/api/estatisticas/ranking?limite=50'); return data; },
    staleTime: 60_000,
  });

  const candidaturas = candData?.dados ?? [];
  const consultores = (rankData?.dados ?? []).filter(c => Number(c.total_badges) > 0 || Number(c.pontos_totais) > 0);

  const kpis = useMemo(() => {
    let validacao = 0, aprovados = 0, pendentes = 0, critico = 0;
    for (const c of candidaturas) {
      if (EM_VALIDACAO.includes(c.estado_atual)) validacao++;
      else if (c.estado_atual === 'APPROVED') aprovados++;
      else if (['OPEN', 'SUBMITTED', 'SENT_BACK'].includes(c.estado_atual)) pendentes++;
      if (!FECHADOS.includes(c.estado_atual) && prazo(c).critico) critico++;
    }
    return { total: candidaturas.length, validacao, aprovados, pendentes, critico };
  }, [candidaturas]);

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

  const topConsultores = useMemo(() => consultores.slice(0, 3), [consultores]);

  const badgesRecentes = useMemo(
    () => candidaturas
      .filter(c => c.estado_atual === 'APPROVED')
      .sort((a, b) => new Date(b.data_fecho || b.data_submissao) - new Date(a.data_fecho || a.data_submissao))
      .slice(0, 3),
    [candidaturas],
  );

  function exportarCandidaturas() {
    exportarCSV('candidaturas',
      ['Consultor', 'Badge', 'Área', 'Estado', 'Evidências', 'Data Submissão', 'Pontos'],
      tabela.map(c => [c.nome_consultor, c.titulo_badge, c.nome_area,
        ESTADO_LABEL[c.estado_atual]?.label, `${c.evidencias_count}/${c.total_requisitos}`,
        formatarData(c.data_submissao || c.data_abertura), c.pontos]));
  }
  function exportarConsultores() {
    exportarCSV('consultores',
      ['Nome', 'Service Line', 'Área', 'Badges Obtidos', 'Pontos Totais'],
      consultores.map(c => [c.nome, c.nome_service_line, c.nome_area, c.total_badges, c.pontos_totais]));
  }

  const isLoading = loadCand || loadRank;

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      {modalConsultor && <ConsultorPerfilModal consultor={modalConsultor} onFechar={() => setModalConsultor(null)} />}
      {modalCandidatura && <CandidaturaDetalheModal idCandidatura={modalCandidatura} onFechar={() => setModalCandidatura(null)} />}

      <TalentManagerSidebar />
      <div className="lg:pl-[240px]">
        <TalentManagerTopbar titulo="Dashboard Talent Manager" subtitulo="Monitorização global de badges e consultores" />

        <main className="px-5 py-8 lg:px-8 pb-24 lg:pb-10">
          {isLoading ? (
            <div className="flex min-h-[60vh] items-center justify-center"><Carregando /></div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <Kpi icon={FileText} label="Total de Candidaturas" valor={kpis.total} cor={{ bg: 'bg-blue-50', text: 'text-blue-500' }} />
                <Kpi icon={AlertCircle} label="Candidaturas em Validação" valor={kpis.validacao} cor={{ bg: 'bg-amber-50', text: 'text-amber-500' }} />
                <Kpi icon={Award} label="Badges Aprovados" valor={kpis.aprovados} cor={{ bg: 'bg-emerald-50', text: 'text-emerald-500' }} />
                <Kpi icon={Clock} label="Candidaturas Pendentes" valor={kpis.pendentes} cor={{ bg: 'bg-amber-50', text: 'text-amber-600' }} />
                <Kpi icon={AlertTriangle} label="Candidaturas com Prazo Crítico" valor={kpis.critico} cor={{ bg: 'bg-rose-50', text: 'text-rose-500' }} />
              </div>

              {/* Estado das candidaturas em tempo real */}
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-slate-900">Estado das Candidaturas em Tempo Real</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Atualizado em tempo real
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                      <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar..."
                        className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-softinsa-400" />
                    </div>
                    <button type="button" onClick={exportarCandidaturas}
                      className="flex items-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700">
                      <Download className="h-4 w-4" /> Exportar
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Estado:</span>
                  {TABS.map(tb => (
                    <button key={tb.key} type="button" onClick={() => setTab(tb.key)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        tab === tb.key ? 'bg-softinsa-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}>
                      {tb.label}
                    </button>
                  ))}
                </div>

                {/* Tabela */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                        <th className="px-3 py-3 text-left">Consultor</th>
                        <th className="px-3 py-3 text-left">Badge</th>
                        <th className="px-3 py-3 text-left">Prioridade</th>
                        <th className="px-3 py-3 text-left">Estado</th>
                        <th className="px-3 py-3 text-left">Evidências</th>
                        <th className="px-3 py-3 text-left">Prazo</th>
                        <th className="px-3 py-3 text-left">Data Submissão</th>
                        <th className="px-3 py-3 text-left">Pontos</th>
                        <th className="px-3 py-3 text-left">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {tabela.length === 0 ? (
                        <tr><td colSpan={9} className="py-10 text-center text-sm text-slate-400">Sem candidaturas neste estado.</td></tr>
                      ) : tabela.map(c => {
                        const est = ESTADO_LABEL[c.estado_atual] || { label: c.estado_atual, cls: 'bg-slate-100 text-slate-600' };
                        const prio = prioridade(c.pontos);
                        const pz = prazo(c);
                        return (
                          <tr key={c.id_candidatura} className="hover:bg-slate-50/60">
                            <td className="px-3 py-3.5 font-medium text-slate-800">{c.nome_consultor}</td>
                            <td className="px-3 py-3.5 text-slate-600">{c.titulo_badge}</td>
                            <td className="px-3 py-3.5">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${prio.cls}`}>{prio.label}</span>
                            </td>
                            <td className="px-3 py-3.5">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${est.cls}`}>{est.label}</span>
                            </td>
                            <td className="px-3 py-3.5">
                              {c.evidencias_count > 0
                                ? <span className="text-softinsa-600">{c.evidencias_count} ficheiro{c.evidencias_count > 1 ? 's' : ''}</span>
                                : <span className="text-slate-300">Sem evidências</span>}
                            </td>
                            <td className={`px-3 py-3.5 text-xs ${pz.cls}`}>{pz.label}</td>
                            <td className="px-3 py-3.5 text-slate-600">{formatarData(c.data_submissao || c.data_abertura)}</td>
                            <td className="px-3 py-3.5 font-semibold text-softinsa-600">{c.pontos || 0}</td>
                            <td className="px-3 py-3.5">
                              <button type="button" onClick={() => setModalCandidatura(c.id_candidatura)}
                                className="flex items-center gap-1.5 text-sm font-medium text-softinsa-600 hover:underline">
                                <Eye className="h-4 w-4" /> Ver Detalhes
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Progresso dos consultores */}
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Progresso dos Consultores</h2>
                  <button type="button" onClick={exportarConsultores}
                    className="flex items-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700">
                    <Download className="h-4 w-4" /> Exportar
                  </button>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                        <th className="px-3 py-3 text-left">Nome</th>
                        <th className="px-3 py-3 text-left">Service Line</th>
                        <th className="px-3 py-3 text-left">Área</th>
                        <th className="px-3 py-3 text-left">Badges Obtidos</th>
                        <th className="px-3 py-3 text-left">Pontos Totais</th>
                        <th className="px-3 py-3 text-left">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {consultores.length === 0 ? (
                        <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">Sem consultores com badges.</td></tr>
                      ) : consultores.map(c => (
                        <tr key={c.id_utilizador} className="hover:bg-slate-50/60">
                          <td className="px-3 py-3.5 font-medium text-slate-800">{c.nome}</td>
                          <td className="px-3 py-3.5 text-slate-600">{c.nome_service_line || '—'}</td>
                          <td className="px-3 py-3.5 text-slate-600">{c.nome_area || '—'}</td>
                          <td className="px-3 py-3.5">
                            <span className="inline-flex items-center gap-1.5 text-slate-700">
                              <Award className="h-4 w-4 text-softinsa-500" /> {c.total_badges}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 font-semibold text-softinsa-600">{Number(c.pontos_totais).toLocaleString('pt-PT')}</td>
                          <td className="px-3 py-3.5">
                            <button type="button" onClick={() => setModalConsultor(c)}
                              className="flex items-center gap-1.5 text-sm font-medium text-softinsa-600 hover:underline">
                              <Eye className="h-4 w-4" /> Ver Perfil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Top consultores + badges recentes */}
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <Trophy className="h-5 w-5 text-amber-500" /> Top Consultores por Pontos
                  </h2>
                  <div className="mt-4 space-y-3">
                    {topConsultores.length === 0 ? (
                      <p className="text-sm text-slate-400">Sem dados.</p>
                    ) : topConsultores.map((c, i) => (
                      <div key={c.id_utilizador} className="flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${
                          i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-orange-400'
                        }`}>{i + 1}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{c.nome}</p>
                          <p className="text-xs text-slate-500">
                            <Trophy className="mr-1 inline h-3 w-3 text-amber-500" />{Number(c.pontos_totais).toLocaleString('pt-PT')} pontos
                            <span className="mx-1">·</span>
                            <Award className="mr-1 inline h-3 w-3 text-softinsa-500" />{c.total_badges} badges
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900">Badges Especiais Recentes</h2>
                  <div className="mt-4 space-y-3">
                    {badgesRecentes.length === 0 ? (
                      <p className="text-sm text-slate-400">Ainda não há badges aprovados.</p>
                    ) : badgesRecentes.map(c => (
                      <div key={c.id_candidatura} className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                          <Award className="h-5 w-5" strokeWidth={1.8} />
                        </div>
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
