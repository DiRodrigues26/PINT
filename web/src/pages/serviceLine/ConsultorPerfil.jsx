import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Award, CheckCircle, Clock, Download, Star } from 'lucide-react';
import { api } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';
import { gerarCertificadoBadge } from '../../lib/exportar';
import { useLanguage } from '../../context/LanguageContext';

/* ─── Cores por nível ────────────────────────────────────────────────── */
const NIVEL_BG = {
  A: 'bg-blue-500',
  B: 'bg-blue-600',
  C: 'bg-softinsa-600',
  D: 'bg-indigo-700',
  E: 'bg-purple-700',
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

function iniciais(nome) {
  return (nome || '?').split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
}

/* ─── Barra de progresso de nível ───────────────────────────────────── */
function BarraNivel({ nivel }) {
  const { t } = useLanguage();
  const total = Number(nivel.total_badges_nivel);
  const obtidos = Number(nivel.obtidos);
  const pct = total > 0 ? Math.round((obtidos / total) * 100) : 0;
  const completo = pct === 100;
  const bgCls = NIVEL_BG[nivel.codigo_nivel] || 'bg-softinsa-600';

  return (
    <div className="flex items-center gap-4">
      {/* Ícone do nível */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${bgCls}`}>
        {nivel.codigo_nivel}
      </div>

      {/* Info + barra */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <div>
            <span className="text-sm font-semibold text-slate-800">
              {t('sl_consult_perfil_nivel').replace('{cod}', nivel.codigo_nivel)}
            </span>
            <span className="ml-2 text-xs text-slate-400">
              {t('sl_consult_perfil_de_badges').replace('{obt}', obtidos).replace('{total}', total)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            <span className={`text-sm font-bold ${completo ? 'text-emerald-600' : 'text-slate-700'}`}>
              {pct}%
            </span>
            {completo && <CheckCircle className="h-4 w-4 text-emerald-500" strokeWidth={2} />}
          </div>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${completo ? 'bg-emerald-500' : 'bg-slate-800'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Card de badge obtido ───────────────────────────────────────────── */
function CardBadgeObtido({ badge, nomeConsultor }) {
  const { t } = useLanguage();
  const bgCls = NIVEL_BG[badge.codigo_nivel] || 'bg-softinsa-600';
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      {badge.imagem_url ? (
        <img src={badge.imagem_url} alt={badge.titulo} className="h-9 w-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${bgCls}`}>
          {badge.codigo_nivel}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{badge.titulo}</p>
        <p className="text-xs text-slate-400">
          {badge.data_atribuicao
            ? new Date(badge.data_atribuicao).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge.pontos > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
            <Star className="h-3.5 w-3.5" strokeWidth={1.8} />
            {badge.pontos}
          </span>
        )}
        <button
          type="button"
          title="Descarregar Certificado PDF"
          onClick={() => gerarCertificadoBadge(badge, nomeConsultor)}
          className="flex items-center gap-1 rounded-md border border-softinsa-200 bg-white px-2 py-1 text-[11px] font-semibold text-softinsa-600 hover:bg-softinsa-50 transition"
        >
          <Download className="h-3 w-3" strokeWidth={2} />
          {t('sl_consult_perfil_cert')}
        </button>
      </div>
    </div>
  );
}

/* ─── Card de badge em processo ─────────────────────────────────────── */
function CardBadgeProcesso({ c }) {
  const { t } = useLanguage();
  const ESTADO_CFG = getEstadoCfg(t);
  const cfg = ESTADO_CFG[c.estado_atual] || { label: c.estado_atual, cls: 'bg-slate-100 text-slate-500' };
  const bgCls = NIVEL_BG[c.codigo_nivel] || 'bg-softinsa-600';
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      {c.imagem_url ? (
        <img src={c.imagem_url} alt={c.titulo_badge} className="h-9 w-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${bgCls}`}>
          {c.codigo_nivel}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{c.titulo_badge}</p>
        <p className="text-xs text-slate-400">
          {c.data_submissao
            ? t('sl_consult_perfil_subm') + ' ' + new Date(c.data_submissao).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
            : t('sl_consult_perfil_em_aberto')}
        </p>
      </div>
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${cfg.cls}`}>
        {cfg.label}
      </span>
    </div>
  );
}

/* ─── Página principal ───────────────────────────────────────────────── */
export default function ServiceLineConsultorPerfil() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sl-consultor-perfil', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/estatisticas/service-line/consultor/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });

  // Badges obtidos (endpoint separado)
  const { data: badgesData } = useQuery({
    queryKey: ['sl-consultor-badges', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/badge-atribuido/consultor/${id}`);
      return data.dados || [];
    },
    enabled: !!id,
    staleTime: 60_000,
  });

  const info = data?.info;
  const ranking = data?.ranking;
  const progressoNivel = data?.progresso_nivel || [];
  const candidaturasAtivas = data?.candidaturas_ativas || [];
  const badgesObtidos = badgesData || [];

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo={t('sl_consult_perfil_subtitulo')} />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8 space-y-5">

          {/* Voltar */}
          <button
            type="button"
            onClick={() => navigate('/sl/consultores')}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            {t('sl_consult_perfil_voltar')}
          </button>

          {isLoading ? (
            <div className="flex justify-center py-20"><Carregando /></div>
          ) : isError || !info ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-600">
              {t('sl_consult_perfil_erro')}
            </div>
          ) : (
            <>
              {/* ── Informação Geral ───────────────────────────────── */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-bold text-slate-700">{t('sl_consult_perfil_info')}</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('sl_consult_perfil_nome')}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-softinsa-600 text-[10px] font-bold text-white">
                        {iniciais(info.nome)}
                      </div>
                      <p className="text-sm font-bold text-slate-900">{info.nome}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('sl_consult_perfil_area')}</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{info.nome_area}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('sl_consult_perfil_sl')}</p>
                    <p className="mt-1 text-sm font-semibold text-softinsa-600">{info.nome_service_line}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('sl_consult_perfil_pontos')}</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{Number(info.pontos_totais).toLocaleString('pt-PT')}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('sl_consult_perfil_ranking')}</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      #{ranking?.posicao} <span className="font-normal text-slate-400">{t('sl_consult_perfil_de')} {ranking?.total}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Progresso por Nível ────────────────────────────── */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-sm font-bold text-slate-700">{t('sl_consult_perfil_progresso')}</h2>
                <div className="space-y-5">
                  {progressoNivel.map(n => (
                    <BarraNivel key={n.id_nivel} nivel={n} />
                  ))}
                  {progressoNivel.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">{t('sl_consult_perfil_sem_niveis')}</p>
                  )}
                </div>
              </div>

              {/* ── Badges Obtidos + Em Processo ──────────────────── */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Badges Obtidos */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" strokeWidth={1.8} />
                    <h2 className="text-sm font-bold text-slate-700">
                      {t('sl_consult_perfil_obtidos_t')}
                      <span className="ml-1.5 text-xs font-normal text-slate-400">({badgesObtidos.length})</span>
                    </h2>
                  </div>
                  {badgesObtidos.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-slate-400">
                      <Award className="h-8 w-8 opacity-30 mb-2" strokeWidth={1.5} />
                      <p className="text-xs">{t('sl_consult_perfil_sem_obt')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {badgesObtidos.map(b => (
                        <CardBadgeObtido key={b.id_badge_atribuido} badge={b} nomeConsultor={info.nome} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Badges em Processo */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" strokeWidth={1.8} />
                    <h2 className="text-sm font-bold text-slate-700">
                      {t('sl_consult_perfil_processo')}
                      <span className="ml-1.5 text-xs font-normal text-slate-400">({candidaturasAtivas.length})</span>
                    </h2>
                  </div>
                  {candidaturasAtivas.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-slate-400">
                      <Clock className="h-8 w-8 opacity-30 mb-2" strokeWidth={1.5} />
                      <p className="text-xs">{t('sl_consult_perfil_sem_proc')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {candidaturasAtivas.map(c => (
                        <CardBadgeProcesso key={c.id_candidatura} c={c} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}
