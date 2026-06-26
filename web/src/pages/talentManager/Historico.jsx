import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Clock, Filter, Search, X, Eye, Download, ChevronDown, CheckCircle } from 'lucide-react';
import { api, obterTodasDaRota } from '../../lib/api';
import { TalentManagerSidebar, TalentManagerTopbar } from '../../components/TalentManagerShell';
import Carregando from '../../components/Carregando';
import CandidaturaDetalheModal from './CandidaturaDetalheModal';
import { exportCSV, exportPDF } from '../../lib/exportar';
import { useTM } from './i18n';

const OBTIDOS = ['APPROVED'];
const EM_PROCESSO = ['OPEN', 'SUBMITTED', 'IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW', 'SENT_BACK'];
const POR_PAGINA = 10;

const ESTADO_CFG = {
  OPEN: { key: 'est_aberto', cls: 'bg-blue-100 text-blue-700' },
  SUBMITTED: { key: 'est_submetido', cls: 'bg-blue-100 text-blue-700' },
  IN_TALENT_REVIEW: { key: 'est_em_validacao', cls: 'bg-amber-100 text-amber-700' },
  IN_SERVICE_LINE_REVIEW: { key: 'est_em_validacao', cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { key: 'est_aprovado', cls: 'bg-emerald-100 text-emerald-700' },
  SENT_BACK: { key: 'est_devolvido', cls: 'bg-orange-100 text-orange-600' },
};

function formatarData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* Data relevante: obtido → fecho; em processo → submissão/abertura */
function dataRegisto(c) {
  return c.estado_atual === 'APPROVED' ? (c.data_fecho || c.data_submissao || c.data_abertura) : (c.data_submissao || c.data_abertura);
}

function aplicarFiltros(itens, aba, { fSL, fArea, dataIni, dataFim, pesquisa }) {
  const estados = aba === 'OBTIDOS' ? OBTIDOS : EM_PROCESSO;
  let l = itens.filter(c => estados.includes(c.estado_atual));
  if (fSL) l = l.filter(c => c.nome_service_line === fSL);
  if (fArea) l = l.filter(c => c.nome_area === fArea);
  if (dataIni) l = l.filter(c => new Date(dataRegisto(c)) >= new Date(dataIni));
  if (dataFim) l = l.filter(c => new Date(dataRegisto(c)) <= new Date(dataFim + 'T23:59:59'));
  if (pesquisa) {
    const q = pesquisa.toLowerCase();
    l = l.filter(c => c.nome_consultor?.toLowerCase().includes(q) || c.titulo_badge?.toLowerCase().includes(q));
  }
  return [...l].sort((a, b) => new Date(dataRegisto(b)) - new Date(dataRegisto(a)));
}

export default function TalentHistorico() {
  const tt = useTM();
  const [aba, setAba] = useState('OBTIDOS');
  const [fSL, setFSL] = useState('');
  const [fArea, setFArea] = useState('');
  const [dataIni, setDataIni] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [pesquisa, setPesquisa] = useState('');
  const [pagina, setPagina] = useState(1);
  const [modalCand, setModalCand] = useState(null);
  const [exportAberto, setExportAberto] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tm-candidaturas'],
    queryFn: async () => { const { data } = await api.get('/api/candidaturas?por_pagina=200'); return data; },
    staleTime: 30_000,
  });
  const todas = data?.dados ?? [];

  const serviceLines = useMemo(() => [...new Set(todas.map(c => c.nome_service_line).filter(Boolean))].sort(), [todas]);
  const areas = useMemo(() => [...new Set(todas.map(c => c.nome_area).filter(Boolean))].sort(), [todas]);

  const nObtidos = useMemo(() => todas.filter(c => OBTIDOS.includes(c.estado_atual)).length, [todas]);
  const nProcesso = useMemo(() => todas.filter(c => EM_PROCESSO.includes(c.estado_atual)).length, [todas]);

  const filtros = { fSL, fArea, dataIni, dataFim, pesquisa };
  const lista = useMemo(() => aplicarFiltros(todas, aba, filtros), [todas, aba, fSL, fArea, dataIni, dataFim, pesquisa]);

  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const listaPagina = lista.slice(inicio, inicio + POR_PAGINA);

  useEffect(() => { setPagina(1); }, [aba, fSL, fArea, dataIni, dataFim, pesquisa]);

  const temFiltros = fSL || fArea || dataIni || dataFim || pesquisa;
  function limpar() { setFSL(''); setFArea(''); setDataIni(''); setDataFim(''); setPesquisa(''); }

  function linhasDe(itens) {
    return itens.map(c => [
      c.nome_consultor, c.titulo_badge, c.nome_service_line || '—', c.nome_area || '—',
      c.codigo_nivel ? `${c.codigo_nivel} · ${c.nome_nivel || ''}`.trim() : '—',
      formatarData(dataRegisto(c)),
      ESTADO_CFG[c.estado_atual]?.key ? tt(ESTADO_CFG[c.estado_atual].key) : c.estado_atual,
    ]);
  }
  const headersExport = [tt('col_consultor'), tt('col_badge'), tt('col_service_line'), tt('col_area'), tt('nivel'), tt('col_data'), tt('col_estado')];

  async function exportar(formato) {
    try {
      const { dados } = await obterTodasDaRota('/api/candidaturas');
      const completa = aplicarFiltros(dados, aba, filtros);
      const nome = `historico_${aba === 'OBTIDOS' ? 'obtidos' : 'em_processo'}_${new Date().toISOString().slice(0, 10)}`;
      const titulo = `${tt('hist_titulo')} — ${aba === 'OBTIDOS' ? tt('tab_obtidos') : tt('tab_em_processo')}`;
      if (formato === 'pdf') exportPDF(`${nome}.pdf`, titulo, headersExport, linhasDe(completa), tt('hist_sub'));
      else exportCSV(`${nome}.csv`, headersExport, linhasDe(completa));
    } catch { /* silencioso */ }
    setExportAberto(false);
  }

  const TabBtn = ({ id, icon: Icon, label, n }) => (
    <button type="button" onClick={() => setAba(id)}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${aba === id ? 'bg-softinsa-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
      <Icon className="h-4 w-4" /> {label}
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${aba === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{n}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      {modalCand && <CandidaturaDetalheModal idCandidatura={modalCand} onFechar={() => setModalCand(null)} />}

      <TalentManagerSidebar />
      <div className="lg:pl-[240px]">
        <TalentManagerTopbar titulo={tt('hist_titulo')} subtitulo={tt('hist_sub')} />

        <main className="px-5 py-8 lg:px-8 pb-24 lg:pb-10">
          {/* Tabs */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <TabBtn id="OBTIDOS" icon={CheckCircle} label={tt('tab_obtidos')} n={nObtidos} />
            <TabBtn id="EM_PROCESSO" icon={Clock} label={tt('tab_em_processo')} n={nProcesso} />
          </div>

          {/* Filtros */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><Filter className="h-4 w-4 text-slate-500" /> {tt('filtros')}</div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select value={fSL} onChange={e => setFSL(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                <option value="">{tt('todas_sl')}</option>
                {serviceLines.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={fArea} onChange={e => setFArea(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                <option value="">{tt('todas_areas')}</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} title={tt('data_inicio')}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-softinsa-400" />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} title={tt('data_fim')}
                className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-softinsa-400" />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder={tt('pesquisar_cons_badge')}
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-softinsa-400" />
              </div>
              {temFiltros && (
                <button type="button" onClick={limpar}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  <X className="h-4 w-4" /> {tt('limpar_filtros')}
                </button>
              )}
            </div>
          </div>

          {/* Tabela */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {aba === 'OBTIDOS' ? tt('tab_obtidos') : tt('tab_em_processo')} ({lista.length})
              </h3>
              <div className="relative">
                <button type="button" onClick={() => setExportAberto(v => !v)}
                  className="flex items-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700">
                  <Download className="h-4 w-4" /> {tt('exportar')} <ChevronDown className="h-4 w-4" />
                </button>
                {exportAberto && (
                  <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    <button type="button" onClick={() => exportar('excel')} className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">Excel (CSV)</button>
                    <button type="button" onClick={() => exportar('pdf')} className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">PDF</button>
                  </div>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="flex min-h-[30vh] items-center justify-center"><Carregando /></div>
            ) : lista.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">{tt('sem_registos')}</p>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                        <th className="px-3 py-3 text-left">{tt('col_consultor')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_badge')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_service_line')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_area')}</th>
                        <th className="px-3 py-3 text-left">{tt('nivel')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_data')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_estado')}</th>
                        <th className="px-3 py-3 text-left">{tt('col_acao')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {listaPagina.map(c => {
                        const est = ESTADO_CFG[c.estado_atual] || { key: null, cls: 'bg-slate-100 text-slate-600' };
                        return (
                          <tr key={c.id_candidatura} className="hover:bg-slate-50/60">
                            <td className="px-3 py-3.5 font-medium text-slate-800">{c.nome_consultor}</td>
                            <td className="px-3 py-3.5">
                              <span className="flex items-center gap-2 text-slate-700">
                                {c.imagem_url
                                  ? <img src={c.imagem_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                                  : <Award className="h-4 w-4 text-softinsa-500" />}
                                {c.titulo_badge}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-slate-600">{c.nome_service_line || '—'}</td>
                            <td className="px-3 py-3.5 text-slate-600">{c.nome_area || '—'}</td>
                            <td className="px-3 py-3.5 text-slate-600">{c.codigo_nivel ? `${c.codigo_nivel} · ${c.nome_nivel || ''}` : '—'}</td>
                            <td className="px-3 py-3.5 text-slate-600">{formatarData(dataRegisto(c))}</td>
                            <td className="px-3 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${est.cls}`}>{est.key ? tt(est.key) : c.estado_atual}</span></td>
                            <td className="px-3 py-3.5">
                              <button type="button" onClick={() => setModalCand(c.id_candidatura)}
                                className="flex items-center gap-1.5 text-sm font-medium text-softinsa-600 hover:underline">
                                <Eye className="h-4 w-4" /> {tt('ver_candidatura')}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPaginas > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-slate-500">{tt('a_mostrar')} {inicio + 1}-{Math.min(inicio + POR_PAGINA, lista.length)} {tt('de_total')} {lista.length}</span>
                    <div className="flex items-center gap-2">
                      <button type="button" disabled={paginaAtual <= 1} onClick={() => setPagina(p => Math.max(1, p - 1))}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50">{tt('pagina_anterior')}</button>
                      <span className="text-slate-500">{tt('pagina')} {paginaAtual}/{totalPaginas}</span>
                      <button type="button" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50">{tt('pagina_seguinte')}</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
