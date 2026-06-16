import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, Search, X, Eye, Download, ChevronDown } from 'lucide-react';
import { api } from '../../lib/api';
import { TalentManagerSidebar, TalentManagerTopbar } from '../../components/TalentManagerShell';
import Carregando from '../../components/Carregando';
import CandidaturaDetalheModal from './CandidaturaDetalheModal';
import { exportCSV, exportPDF } from '../../lib/exportUtils';

const FECHADOS = ['APPROVED', 'REJECTED', 'CLOSED'];
const EM_VALIDACAO = ['IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW'];

const ESTADO_CFG = {
  OPEN: { label: 'Aberto', cls: 'bg-blue-100 text-blue-700', grupo: 'OPEN' },
  SUBMITTED: { label: 'Submetido', cls: 'bg-blue-100 text-blue-700', grupo: 'SUBMITTED' },
  IN_TALENT_REVIEW: { label: 'Em Validação', cls: 'bg-amber-100 text-amber-700', grupo: 'VALIDACAO' },
  IN_SERVICE_LINE_REVIEW: { label: 'Em Validação', cls: 'bg-amber-100 text-amber-700', grupo: 'VALIDACAO' },
  APPROVED: { label: 'Aprovado', cls: 'bg-emerald-100 text-emerald-700', grupo: 'APPROVED' },
  REJECTED: { label: 'Rejeitado', cls: 'bg-rose-100 text-rose-600', grupo: 'REJECTED' },
  SENT_BACK: { label: 'Devolvido', cls: 'bg-orange-100 text-orange-600', grupo: 'OPEN' },
  CLOSED: { label: 'Fechado', cls: 'bg-slate-100 text-slate-500', grupo: 'APPROVED' },
};

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
  if (dias > 14) return { label: 'Atrasado', cls: 'text-rose-600 font-semibold' };
  if (dias > 7) return { label: 'Próximo', cls: 'text-amber-600 font-semibold' };
  return { label: 'No prazo', cls: 'text-emerald-600' };
}
function formatarData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TalentCandidaturas() {
  const location = useLocation();
  const [pesquisa, setPesquisa] = useState(location.state?.badge || '');
  const [fEstado, setFEstado] = useState('');
  const [fPrioridade, setFPrioridade] = useState('');
  const [fArea, setFArea] = useState('');
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [modalCand, setModalCand] = useState(null);
  const [exportAberto, setExportAberto] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tm-candidaturas'],
    queryFn: async () => { const { data } = await api.get('/api/candidaturas?por_pagina=200'); return data; },
    staleTime: 20_000,
    refetchInterval: 20_000,
  });

  const todas = data?.dados ?? [];
  const areas = useMemo(() => [...new Set(todas.map(c => c.nome_area).filter(Boolean))], [todas]);

  const lista = useMemo(() => {
    let l = todas;
    if (fEstado) l = l.filter(c => (ESTADO_CFG[c.estado_atual]?.grupo) === fEstado);
    if (fPrioridade) l = l.filter(c => prioridade(c.pontos).label === fPrioridade);
    if (fArea) l = l.filter(c => c.nome_area === fArea);
    if (dataIni) l = l.filter(c => new Date(c.data_submissao || c.data_abertura) >= new Date(dataIni));
    if (dataFim) l = l.filter(c => new Date(c.data_submissao || c.data_abertura) <= new Date(dataFim + 'T23:59:59'));
    if (pesquisa) {
      const q = pesquisa.toLowerCase();
      l = l.filter(c => c.nome_consultor?.toLowerCase().includes(q) || c.titulo_badge?.toLowerCase().includes(q));
    }
    return [...l].sort((a, b) => new Date(b.data_submissao || b.data_abertura) - new Date(a.data_submissao || a.data_abertura));
  }, [todas, fEstado, fPrioridade, fArea, dataIni, dataFim, pesquisa]);

  const temFiltros = pesquisa || fEstado || fPrioridade || fArea || dataIni || dataFim;
  function limpar() { setPesquisa(''); setFEstado(''); setFPrioridade(''); setFArea(''); setDataIni(''); setDataFim(''); }

  function dadosExport() {
    const headers = ['Consultor', 'Badge', 'Área', 'Data Submissão', 'Estado', 'Prioridade', 'Evidências', 'Pontos'];
    const rows = lista.map(c => [
      c.nome_consultor, c.titulo_badge, c.nome_area || '—',
      formatarData(c.data_submissao || c.data_abertura),
      ESTADO_CFG[c.estado_atual]?.label || c.estado_atual,
      prioridade(c.pontos).label, `${c.evidencias_count}/${c.total_requisitos}`, c.pontos || 0,
    ]);
    return { headers, rows };
  }
  function exportarExcel() {
    const { headers, rows } = dadosExport();
    exportCSV(`candidaturas_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    setExportAberto(false);
  }
  function exportarPdf() {
    const { headers, rows } = dadosExport();
    exportPDF(`candidaturas_${new Date().toISOString().slice(0, 10)}.pdf`, 'Gestão de Candidaturas', headers, rows,
      'Validação de evidências submetidas pelos consultores');
    setExportAberto(false);
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      {modalCand && <CandidaturaDetalheModal idCandidatura={modalCand} onFechar={() => setModalCand(null)} />}

      <TalentManagerSidebar />
      <div className="lg:pl-[240px]">
        <TalentManagerTopbar titulo="Gestão de Candidaturas" subtitulo="Validação de evidências submetidas pelos consultores" />

        <main className="px-5 py-8 lg:px-8 pb-24 lg:pb-10">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">Gestão de Candidaturas</h2>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Atualizado em tempo real
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Validação de evidências submetidas pelos consultores.</p>

          {/* Filtros */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Filter className="h-4 w-4 text-slate-500" /> Filtros
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <select value={fEstado} onChange={e => setFEstado(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                <option value="">Todos os estados</option>
                <option value="OPEN">Aberto</option>
                <option value="SUBMITTED">Submetido</option>
                <option value="VALIDACAO">Em Validação</option>
                <option value="APPROVED">Aprovado</option>
                <option value="REJECTED">Rejeitado</option>
              </select>
              <select value={fPrioridade} onChange={e => setFPrioridade(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                <option value="">Todas as prioridades</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
              <select value={fArea} onChange={e => setFArea(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                <option value="">Todas as áreas</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} title="Data início"
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-softinsa-400" />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} title="Data fim"
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-softinsa-400" />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar por consultor ou badge..."
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-softinsa-400" />
              </div>
              {temFiltros && (
                <button type="button" onClick={limpar}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  <X className="h-4 w-4" /> Limpar filtros
                </button>
              )}
            </div>
          </div>

          {/* Tabela */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Candidaturas ({lista.length})</h3>
              <div className="relative">
                <button type="button" onClick={() => setExportAberto(v => !v)}
                  className="flex items-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700">
                  <Download className="h-4 w-4" /> Exportar <ChevronDown className="h-4 w-4" />
                </button>
                {exportAberto && (
                  <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    <button type="button" onClick={exportarExcel} className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">Excel (CSV)</button>
                    <button type="button" onClick={exportarPdf} className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">PDF</button>
                  </div>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="flex min-h-[30vh] items-center justify-center"><Carregando /></div>
            ) : lista.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">Nenhuma candidatura corresponde aos filtros.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                      <th className="px-3 py-3 text-left">Consultor</th>
                      <th className="px-3 py-3 text-left">Badge</th>
                      <th className="px-3 py-3 text-left">Área</th>
                      <th className="px-3 py-3 text-left">Data Submissão</th>
                      <th className="px-3 py-3 text-left">Estado</th>
                      <th className="px-3 py-3 text-left">Prioridade</th>
                      <th className="px-3 py-3 text-left">Evidências</th>
                      <th className="px-3 py-3 text-left">Prazo</th>
                      <th className="px-3 py-3 text-left">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {lista.map(c => {
                      const est = ESTADO_CFG[c.estado_atual] || { label: c.estado_atual, cls: 'bg-slate-100 text-slate-600' };
                      const prio = prioridade(c.pontos);
                      const pz = prazo(c);
                      return (
                        <tr key={c.id_candidatura} className="hover:bg-slate-50/60">
                          <td className="px-3 py-3.5 font-medium text-slate-800">{c.nome_consultor}</td>
                          <td className="px-3 py-3.5 text-slate-600">{c.titulo_badge}</td>
                          <td className="px-3 py-3.5 text-slate-600">{c.nome_area || '—'}</td>
                          <td className="px-3 py-3.5 text-slate-600">{formatarData(c.data_submissao || c.data_abertura)}</td>
                          <td className="px-3 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${est.cls}`}>{est.label}</span></td>
                          <td className="px-3 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${prio.cls}`}>{prio.label}</span></td>
                          <td className="px-3 py-3.5">
                            {c.evidencias_count > 0
                              ? <span className="text-softinsa-600">{c.evidencias_count} ficheiro{c.evidencias_count > 1 ? 's' : ''}</span>
                              : <span className="text-slate-300">Sem evidências</span>}
                          </td>
                          <td className={`px-3 py-3.5 text-xs ${pz.cls}`}>{pz.label}</td>
                          <td className="px-3 py-3.5">
                            <button type="button" onClick={() => setModalCand(c.id_candidatura)}
                              className="flex items-center gap-1.5 text-sm font-medium text-softinsa-600 hover:underline">
                              <Eye className="h-4 w-4" /> Ver Candidatura
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
