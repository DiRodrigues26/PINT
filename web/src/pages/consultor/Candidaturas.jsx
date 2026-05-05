import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Edit, Eye, Clock, CheckCircle, Info, Plus, Search, X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';
import { useLanguage } from '../../context/LanguageContext';

function formatarData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function diasRestantes(dataAbertura, limiteDias) {
  if (!limiteDias) return null;
  const fim = new Date(dataAbertura);
  fim.setDate(fim.getDate() + limiteDias);
  const diff = Math.ceil((fim - Date.now()) / 86_400_000);
  return diff;
}

const ESTADO_CONFIG = {
  OPEN:                   { label: 'Em Progresso',   cor: 'bg-slate-100 text-slate-600' },
  SUBMITTED:              { label: 'Submitted',       cor: 'bg-blue-100 text-blue-600' },
  IN_TALENT_REVIEW:       { label: 'Em Validação',    cor: 'bg-amber-100 text-amber-700' },
  IN_SERVICE_LINE_REVIEW: { label: 'Em Validação',    cor: 'bg-amber-100 text-amber-700' },
  SENT_BACK:              { label: 'Devolvida',       cor: 'bg-orange-100 text-orange-700' },
  APPROVED:               { label: 'Aprovado',        cor: 'bg-emerald-100 text-emerald-700' },
  REJECTED:               { label: 'Rejeitado',       cor: 'bg-red-100 text-red-600' },
  CLOSED:                 { label: 'Fechado',         cor: 'bg-slate-100 text-slate-500' },
};

const NIVEL_COR = { A: 'text-softinsa-600', B: 'text-blue-500', C: 'text-indigo-500', D: 'text-violet-600', E: 'text-purple-700' };

function BotaoAcao({ estado, id }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const acoes = {
    OPEN:                   { label: t('editar_cand'),      icon: Edit,         variante: 'primary' },
    SENT_BACK:              { label: t('editar_cand'),      icon: Edit,         variante: 'primary' },
    SUBMITTED:              { label: t('ver_detalhes'),     icon: Eye,          variante: 'secondary' },
    IN_TALENT_REVIEW:       { label: t('acompanhar'),       icon: Clock,        variante: 'secondary' },
    IN_SERVICE_LINE_REVIEW: { label: t('acompanhar'),       icon: Clock,        variante: 'secondary' },
    APPROVED:               { label: t('ver_resultado'),    icon: CheckCircle,  variante: 'secondary' },
    REJECTED:               { label: t('motivo_rejeicao'), icon: Info,         variante: 'secondary' },
    CLOSED:                 { label: t('ver_detalhes'),     icon: Eye,          variante: 'secondary' },
  };

  const acao = acoes[estado] || acoes.CLOSED;
  const Icon = acao.icon;

  return (
    <button
      type="button"
      onClick={() => navigate(`/candidaturas/${id}`)}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
        acao.variante === 'primary'
          ? 'bg-softinsa-700 text-white hover:bg-softinsa-800'
          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} />
      {acao.label}
    </button>
  );
}

export default function Candidaturas() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [pesquisa, setPesquisa] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['candidaturas-consultor'],
    queryFn: async () => {
      const { data } = await api.get('/api/candidaturas?por_pagina=100');
      return data;
    },
    staleTime: 30_000,
  });

  const candidaturas = useMemo(() => {
    let lista = data?.dados ?? [];
    if (pesquisa) lista = lista.filter(c => c.titulo_badge.toLowerCase().includes(pesquisa.toLowerCase()));
    if (filtroArea) lista = lista.filter(c => c.nome_area === filtroArea);
    if (filtroNivel) lista = lista.filter(c => c.codigo_nivel === filtroNivel);
    if (filtroEstado) lista = lista.filter(c => c.estado_atual === filtroEstado);
    return lista;
  }, [data, pesquisa, filtroArea, filtroNivel, filtroEstado]);

  const areas = useMemo(() => [...new Set((data?.dados ?? []).map(c => c.nome_area))], [data]);
  const temFiltros = pesquisa || filtroArea || filtroNivel || filtroEstado;

  function limpar() { setPesquisa(''); setFiltroArea(''); setFiltroNivel(''); setFiltroEstado(''); }

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <ConsultorSidebar />
      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo={t('desc_cands')} />

        <main className="px-5 py-8 lg:px-10 pb-24 lg:pb-10">
          {/* Info + botão nova candidatura */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
              <Info className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              {t('info_cands')}
            </div>
            <button
              type="button"
              onClick={() => navigate('/badges')}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-softinsa-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-800"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              {t('nova_candidatura')}
            </button>
          </div>

          {/* Filtros */}
          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                <input
                  value={pesquisa}
                  onChange={e => setPesquisa(e.target.value)}
                  placeholder={t('procurar_badge')}
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-softinsa-400"
                />
              </div>
              <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className="rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-softinsa-400">
                <option value="">{t('area')}</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)} className="rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-softinsa-400">
                <option value="">Nível</option>
                {['A','B','C','D','E'].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-softinsa-400">
                <option value="">Estado</option>
                <option value="OPEN">Em Progresso</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="IN_TALENT_REVIEW">Em Validação (Talent)</option>
                <option value="IN_SERVICE_LINE_REVIEW">Em Validação (SL)</option>
                <option value="APPROVED">Aprovado</option>
                <option value="REJECTED">Rejeitado</option>
                <option value="SENT_BACK">Devolvida</option>
              </select>
              {temFiltros && (
                <button type="button" onClick={limpar} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  <X className="h-4 w-4" /> {t('limpar_filtros')}
                </button>
              )}
            </div>
          </div>

          {/* Tabela */}
          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center"><Carregando /></div>
          ) : candidaturas.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <Eye className="h-7 w-7 text-slate-400" strokeWidth={1.5} />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-600">{t('nenhuma_cand')}</p>
              <p className="mt-1 text-sm text-slate-400">Explora o catálogo de badges e submete a tua primeira candidatura.</p>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="px-5 py-3.5 text-left">{t('badge_col')}</th>
                      <th className="px-4 py-3.5 text-left">Service Line</th>
                      <th className="px-4 py-3.5 text-left">{t('area')}</th>
                      <th className="px-4 py-3.5 text-center">{t('nivel')}</th>
                      <th className="px-4 py-3.5 text-left">{t('data_submissao')}</th>
                      <th className="px-4 py-3.5 text-left">{t('estado_col')}</th>
                      <th className="px-4 py-3.5 text-left">{t('tempo_sla')}</th>
                      <th className="px-4 py-3.5 text-right">{t('acao_col')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidaturas.map(c => {
                      const cfg = ESTADO_CONFIG[c.estado_atual] || ESTADO_CONFIG.CLOSED;
                      const dias = diasRestantes(c.data_abertura, 30);
                      return (
                        <tr key={c.id_candidatura} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-4 font-semibold text-slate-800">{c.titulo_badge}</td>
                          <td className="px-4 py-4 text-slate-600">{c.nome_service_line}</td>
                          <td className="px-4 py-4 text-slate-600">{c.nome_area}</td>
                          <td className="px-4 py-4 text-center">
                            <span className={`font-bold ${NIVEL_COR[c.codigo_nivel] || 'text-slate-600'}`}>
                              {c.codigo_nivel}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-600">{formatarData(c.data_submissao || c.data_abertura)}</td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cor}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {dias !== null ? (
                              <span className={dias <= 1 ? 'font-semibold text-red-500' : dias <= 3 ? 'font-semibold text-amber-600' : ''}>
                                {dias > 0 ? `${dias} dias` : 'Expirado'}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <BotaoAcao estado={c.estado_atual} id={c.id_candidatura} />
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
