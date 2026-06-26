import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Award, Cloud, Calendar, AlertTriangle, Users, FileText,
  TrendingUp, Clock, Download, ChevronDown, CheckCircle, ClipboardList,
  Crown,
} from 'lucide-react';
import { api } from '../../lib/api';
import { TalentManagerSidebar, TalentManagerTopbar } from '../../components/TalentManagerShell';
import Carregando from '../../components/Carregando';
import { exportCSV, exportPDF } from '../../lib/exportar';
import { useTM } from './i18n';

const NIVEL_PILL = {
  A: 'bg-blue-100 text-blue-700', B: 'bg-violet-100 text-violet-700',
  C: 'bg-emerald-100 text-emerald-700', D: 'bg-rose-100 text-rose-700', E: 'bg-amber-100 text-amber-700',
};

function formatarData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TalentBadgeDetalhe() {
  const tt = useTM();
  const { id } = useParams();
  const navigate = useNavigate();
  const [exportAberto, setExportAberto] = useState(false);

  const { data: detalheData, isLoading } = useQuery({
    queryKey: ['tm-badge-detalhe', id],
    queryFn: async () => { const { data } = await api.get(`/api/badges/${id}`); return data; },
    staleTime: 60_000,
  });
  const { data: candData } = useQuery({
    queryKey: ['tm-candidaturas'],
    queryFn: async () => { const { data } = await api.get('/api/candidaturas?por_pagina=200'); return data; },
    staleTime: 30_000,
  });

  const badge = detalheData?.badge;
  const requisitos = detalheData?.requisitos ?? [];
  const ehEspecial = !!badge?.is_conquista_especial;
  const candidaturas = useMemo(
    () => (candData?.dados ?? []).filter(c => String(c.id_badge) === String(id)),
    [candData, id],
  );

  const stats = useMemo(() => {
    const total = candidaturas.length;
    const aprovadas = candidaturas.filter(c => c.estado_atual === 'APPROVED');
    const rejeitadas = candidaturas.filter(c => c.estado_atual === 'REJECTED');
    const decididas = aprovadas.length + rejeitadas.length;
    const taxa = decididas > 0 ? Math.round((aprovadas.length / decididas) * 100) : 0;
    // tempo médio de validação (submissão → fecho) em dias
    const tempos = aprovadas
      .filter(c => c.data_submissao && c.data_fecho)
      .map(c => (new Date(c.data_fecho) - new Date(c.data_submissao)) / 86_400_000);
    const tempoMedio = tempos.length ? (tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0;
    const consultores = new Set(aprovadas.map(c => c.id_consultor)).size;
    return { total, taxa, tempoMedio: tempoMedio.toFixed(1), consultores };
  }, [candidaturas]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f3f6fa]">
        <TalentManagerSidebar />
        <div className="lg:pl-[240px]">
          <TalentManagerTopbar titulo={tt('badges_titulo')} />
          <div className="flex min-h-[60vh] items-center justify-center"><Carregando /></div>
        </div>
      </div>
    );
  }

  if (!badge) {
    return (
      <div className="min-h-screen bg-[#f3f6fa]">
        <TalentManagerSidebar />
        <div className="lg:pl-[240px]">
          <TalentManagerTopbar titulo={tt('badges_titulo')} />
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
            <AlertTriangle className="h-12 w-12 text-amber-400" />
            <p className="text-sm text-slate-500">{tt('badge_nao_encontrado')}</p>
            <button onClick={() => navigate('/tm/badges')} className="text-sm font-semibold text-softinsa-600 hover:underline">{tt('voltar_catalogo')}</button>
          </div>
        </div>
      </div>
    );
  }

  const expiraData = badge.data_expiracao_badge;
  const diasRestantes = expiraData ? Math.ceil((new Date(expiraData) - Date.now()) / 86_400_000) : null;
  const proximoExpiracao = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30;
  const politica = badge.tem_expiracao && badge.validade_dias
    ? `${tt('expira_em')} ${Math.round(badge.validade_dias / 30)} ${tt('meses')}` : tt('sem_expiracao_lbl');

  function exportarDetalhes(tipo) {
    const headers = [tt('col_badge'), '—'];
    const rows = [
      [tt('col_badge'), badge.titulo],
      [tt('learning_path'), badge.nome_learning_path],
      [tt('col_service_line'), badge.nome_service_line],
      [tt('col_area'), badge.nome_area],
      [tt('nivel'), `${badge.codigo_nivel} · ${badge.nome_nivel}`],
      [tt('col_pontos'), badge.pontos],
      [tt('politica_expiracao'), politica],
      [tt('nr_candidaturas_assoc'), stats.total],
      [tt('taxa_aprovacao_pct'), `${stats.taxa}%`],
      [tt('tempo_medio_validacao'), stats.tempoMedio],
      [tt('consultores_obtiveram'), stats.consultores],
    ];
    const nome = `badge_${badge.titulo.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;
    if (tipo === 'pdf') exportPDF(`${nome}.pdf`, `${tt('exportar_detalhes_badge')} — ${badge.titulo}`, headers, rows);
    else exportCSV(`${nome}.csv`, headers, rows);
    setExportAberto(false);
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <TalentManagerSidebar />
      <div className="lg:pl-[240px]">
        <TalentManagerTopbar titulo={tt('badges_titulo')} subtitulo={tt('voltar_catalogo')} />

        <main className="px-5 py-8 lg:px-8 pb-24 lg:pb-10">
          <button onClick={() => navigate('/tm/badges')}
            className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" /> {tt('voltar_catalogo')}
          </button>

          {/* Cartão principal */}
          <div className={`rounded-2xl border p-8 shadow-sm ${
            ehEspecial
              ? 'border-amber-300 ring-1 ring-amber-200 bg-gradient-to-b from-amber-50/60 to-white'
              : 'border-slate-200 bg-white'
          }`}>
            <div className="flex flex-col gap-6 sm:flex-row">
              {badge.imagem_url ? (
                <img
                  src={badge.imagem_url}
                  alt={badge.titulo}
                  className={`h-32 w-32 shrink-0 rounded-full object-cover ${ehEspecial ? 'ring-2 ring-amber-400 ring-offset-2' : 'ring-4 ring-softinsa-50'}`}
                />
              ) : (
                <div className={`flex h-32 w-32 shrink-0 items-center justify-center rounded-full ${ehEspecial ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-softinsa-50'}`}>
                  {ehEspecial ? (
                    <Crown className="h-16 w-16 text-white" strokeWidth={1.4} />
                  ) : (
                    <Award className="h-16 w-16 text-softinsa-500" strokeWidth={1.4} />
                  )}
                </div>
              )}
              <div className="flex-1">
                {ehEspecial && (
                  <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm w-fit">
                    <Crown className="h-3 w-3" strokeWidth={2} />
                    {tt('sl_badges_premium')}
                  </span>
                )}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">{badge.titulo}</h1>
                  <div className="relative">
                    <button type="button" onClick={() => setExportAberto(v => !v)}
                      className="flex items-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700">
                      <Download className="h-4 w-4" /> {tt('exportar_detalhes_badge')} <ChevronDown className="h-4 w-4" />
                    </button>
                    {exportAberto && (
                      <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                        <button type="button" onClick={() => exportarDetalhes('csv')} className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">Excel (CSV)</button>
                        <button type="button" onClick={() => exportarDetalhes('pdf')} className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">PDF</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                  <Campo label={tt('learning_path')} valor={badge.nome_learning_path} />
                  <Campo label={tt('col_service_line')} valor={badge.nome_service_line} barra />
                  <Campo label={tt('col_area')}>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Cloud className="h-4 w-4 text-slate-400" /> {badge.nome_area}</span>
                  </Campo>
                  <Campo label={tt('nivel')}>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${NIVEL_PILL[badge.codigo_nivel] || 'bg-slate-100'}`}>
                      {tt('nivel')} {badge.codigo_nivel} · {badge.nome_nivel}
                    </span>
                  </Campo>
                </div>

                {/* Status */}
                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">{tt('status_badge')}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {proximoExpiracao ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700">
                        <AlertTriangle className="h-4 w-4" /> {tt('st_proximo_exp')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                        {tt('st_ativo')}
                      </span>
                    )}
                    {expiraData && (
                      <span className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Calendar className="h-4 w-4" /> {tt('expira_em_data')} {formatarData(expiraData)}
                        {diasRestantes !== null && <span className="font-semibold text-amber-600"> ({diasRestantes} {tt('dias_restantes')})</span>}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo label={tt('pontos_atribuidos')}><span className="text-lg font-bold text-slate-900">{badge.pontos} {tt('pontos')}</span></Campo>
                  <Campo label={tt('politica_expiracao')} valor={politica} />
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <Users className="h-4 w-4 text-softinsa-500" /> <strong className="text-slate-800">{stats.consultores}</strong> {tt('consultores_obtiveram')}
                </div>
              </div>
            </div>
          </div>

          {/* Descrição */}
          {badge.descricao && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">{tt('descricao')}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{badge.descricao}</p>
            </div>
          )}

          {/* Requisitos */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ClipboardList className="h-4 w-4 text-softinsa-600" /> {tt('requisitos')} ({requisitos.length})
            </h2>
            {requisitos.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">{tt('sem_requisitos')}</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {requisitos.map(r => (
                  <div key={r.id_requisito} className="flex gap-3 rounded-xl border border-slate-200 p-4">
                    {r.imagem_url ? (
                      <img src={r.imagem_url} alt={r.titulo} className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-softinsa-50 text-softinsa-500">
                        <CheckCircle className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {r.codigo_requisito && (
                          <span className="rounded bg-softinsa-100 px-1.5 py-0.5 text-[10px] font-bold text-softinsa-700">{r.codigo_requisito}</span>
                        )}
                        <h3 className="truncate text-sm font-bold text-slate-900">{r.titulo}</h3>
                      </div>
                      {r.descricao && <p className="mt-1 text-xs leading-5 text-slate-500">{r.descricao}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estatísticas */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">{tt('estatisticas_badge')}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <EstatCard icon={FileText} valor={stats.total} label={tt('nr_candidaturas_assoc')} />
              <EstatCard icon={TrendingUp} valor={`${stats.taxa}%`} label={tt('taxa_aprovacao_pct')} />
              <EstatCard icon={Clock} valor={stats.tempoMedio} label={tt('tempo_medio_validacao')} />
            </div>
          </div>

          <button onClick={() => navigate('/tm/candidaturas', { state: { badge: badge.titulo } })}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-softinsa-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700">
            <FileText className="h-4 w-4" /> {tt('ver_candidaturas')}
          </button>
        </main>
      </div>
    </div>
  );
}

function Campo({ label, valor, children, barra }) {
  return (
    <div className={barra ? 'border-l-2 border-softinsa-400 pl-3' : ''}>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      {children || <p className="mt-0.5 text-sm font-semibold text-slate-800">{valor || '—'}</p>}
    </div>
  );
}

function EstatCard({ icon: Icon, valor, label }) {
  return (
    <div className="rounded-xl bg-slate-50 p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
        <Icon className="h-5 w-5 text-softinsa-500" strokeWidth={1.8} />
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
