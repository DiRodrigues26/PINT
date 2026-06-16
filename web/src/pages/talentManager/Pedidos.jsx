import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Eye, Search, X, Clock } from 'lucide-react';
import { api } from '../../lib/api';
import { TalentManagerSidebar, TalentManagerTopbar } from '../../components/TalentManagerShell';
import Carregando from '../../components/Carregando';

const ESTADO_CFG = {
  OPEN:                   { label: 'Aberta',                    cls: 'bg-slate-100 text-slate-600' },
  SUBMITTED:              { label: 'A aguardar validação',      cls: 'bg-amber-100 text-amber-700' },
  IN_TALENT_REVIEW:       { label: 'Em revisão (Talent)',       cls: 'bg-blue-100 text-blue-700' },
  IN_SERVICE_LINE_REVIEW: { label: 'Em validação SL',           cls: 'bg-orange-100 text-orange-700' },
  APPROVED:               { label: 'Aprovada',                  cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:               { label: 'Rejeitada',                 cls: 'bg-rose-100 text-rose-700' },
  SENT_BACK:              { label: 'Devolvida',                 cls: 'bg-orange-100 text-orange-600' },
  CLOSED:                 { label: 'Fechada',                   cls: 'bg-slate-100 text-slate-500' },
};

const NIVEL_COR = { A: 'text-blue-500', B: 'text-blue-600', C: 'text-softinsa-600', D: 'text-indigo-700', E: 'text-purple-700' };

function formatarData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const TABS = [
  { key: 'PENDENTES', label: 'A validar' },
  { key: 'SUBMITTED', label: 'Submetidas' },
  { key: 'IN_SERVICE_LINE_REVIEW', label: 'Em validação SL' },
  { key: 'SENT_BACK', label: 'Devolvidas' },
  { key: '', label: 'Todas' },
];

export default function TalentPedidos() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('PENDENTES');
  const [pesquisa, setPesquisa] = useState('');
  const [filtroArea, setFiltroArea] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tm-candidaturas'],
    queryFn: async () => { const { data } = await api.get('/api/candidaturas?por_pagina=200'); return data; },
    staleTime: 30_000,
    refetchInterval: 20_000,
  });

  const todas = data?.dados ?? [];

  const areas = useMemo(() => [...new Set(todas.map(c => c.nome_area).filter(Boolean))], [todas]);

  const lista = useMemo(() => {
    let l = todas;
    if (tab === 'PENDENTES') l = l.filter(c => ['SUBMITTED', 'IN_TALENT_REVIEW'].includes(c.estado_atual));
    else if (tab) l = l.filter(c => c.estado_atual === tab);
    if (pesquisa) l = l.filter(c =>
      c.titulo_badge?.toLowerCase().includes(pesquisa.toLowerCase()) ||
      c.nome_consultor?.toLowerCase().includes(pesquisa.toLowerCase()));
    if (filtroArea) l = l.filter(c => c.nome_area === filtroArea);
    return l.sort((a, b) => new Date(b.data_submissao || b.data_abertura) - new Date(a.data_submissao || a.data_abertura));
  }, [todas, tab, pesquisa, filtroArea]);

  const contPendentes = useMemo(
    () => todas.filter(c => ['SUBMITTED', 'IN_TALENT_REVIEW'].includes(c.estado_atual)).length,
    [todas],
  );

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <TalentManagerSidebar />
      <div className="lg:pl-[260px]">
        <TalentManagerTopbar subtitulo="Validação de evidências" />

        <main className="px-5 py-8 lg:px-10 pb-24 lg:pb-10">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">Validações</h2>
            {contPendentes > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                {contPendentes} a aguardar
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">Vês todas as submissões da plataforma, independentemente da área ou Service Line.</p>

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap gap-2">
            {TABS.map(tb => (
              <button key={tb.key || 'all'} type="button" onClick={() => setTab(tb.key)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  tab === tb.key ? 'bg-softinsa-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}>
                {tb.label}
              </button>
            ))}
          </div>

          {/* Filtros */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
              <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar badge ou consultor"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-softinsa-400" />
            </div>
            <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400">
              <option value="">Todas as áreas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            {(pesquisa || filtroArea) && (
              <button type="button" onClick={() => { setPesquisa(''); setFiltroArea(''); }}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                <X className="h-4 w-4" /> Limpar
              </button>
            )}
          </div>

          {/* Tabela */}
          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center"><Carregando /></div>
          ) : lista.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <ClipboardCheck className="h-14 w-14 text-slate-300" strokeWidth={1} />
              <p className="mt-4 text-base font-semibold text-slate-600">Nada por aqui</p>
              <p className="mt-1 text-sm text-slate-400">Não há candidaturas neste estado.</p>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3.5 text-left">Badge</th>
                      <th className="px-4 py-3.5 text-left">Consultor</th>
                      <th className="px-4 py-3.5 text-left">Área</th>
                      <th className="px-4 py-3.5 text-center">Nível</th>
                      <th className="px-4 py-3.5 text-center">Evidências</th>
                      <th className="px-4 py-3.5 text-left">Submetida</th>
                      <th className="px-4 py-3.5 text-left">Estado</th>
                      <th className="px-4 py-3.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lista.map(c => {
                      const cfg = ESTADO_CFG[c.estado_atual] || ESTADO_CFG.CLOSED;
                      const podeValidar = ['SUBMITTED', 'IN_TALENT_REVIEW'].includes(c.estado_atual);
                      return (
                        <tr key={c.id_candidatura} className="transition hover:bg-slate-50">
                          <td className="px-5 py-4 font-semibold text-slate-800">{c.titulo_badge}</td>
                          <td className="px-4 py-4 text-slate-600">{c.nome_consultor}</td>
                          <td className="px-4 py-4 text-slate-600">{c.nome_area}</td>
                          <td className="px-4 py-4 text-center">
                            <span className={`font-bold ${NIVEL_COR[c.codigo_nivel] || 'text-slate-600'}`}>{c.codigo_nivel}</span>
                          </td>
                          <td className="px-4 py-4 text-center text-slate-600">{c.evidencias_count}/{c.total_requisitos}</td>
                          <td className="px-4 py-4 text-slate-600">{formatarData(c.data_submissao || c.data_abertura)}</td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button type="button" onClick={() => navigate(`/tm/pedidos/${c.id_candidatura}`)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                                podeValidar ? 'bg-softinsa-600 text-white hover:bg-softinsa-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}>
                              {podeValidar ? <ClipboardCheck className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              {podeValidar ? 'Validar' : 'Ver'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
