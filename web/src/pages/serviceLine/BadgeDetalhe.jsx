import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Award, CheckCircle, FileText, Info, Layers, Star, Timer } from 'lucide-react';
import { api } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';
import { useLanguage } from '../../context/LanguageContext';

/* ─── Cores por nível ────────────────────────────────────────────────── */
const NIVEL_COR = {
  A: 'bg-blue-400',
  B: 'bg-blue-600',
  C: 'bg-softinsa-600',
  D: 'bg-rose-400',
  E: 'bg-purple-600',
};

const NIVEL_PILL = {
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-indigo-100 text-indigo-700',
  C: 'bg-softinsa-100 text-softinsa-700',
  D: 'bg-rose-100 text-rose-600',
  E: 'bg-purple-100 text-purple-700',
};

function mesesDeValidade(validade_dias) {
  if (!validade_dias) return null;
  return Math.round(Number(validade_dias) / 30);
}

/* ─── Card de requisito ──────────────────────────────────────────────── */
function CardRequisito({ req }) {
  const { t } = useLanguage();
  const linhas = (req.descricao || '').split('\n').filter(Boolean);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Código */}
        <span className="flex h-7 min-w-[2rem] shrink-0 items-center justify-center rounded-full bg-softinsa-600 px-2 text-[11px] font-bold text-white">
          {req.codigo_requisito}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{req.titulo}</p>
          {linhas.length > 0 && (
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              {linhas.join(' ')}
            </p>
          )}
        </div>
      </div>

      {/* Tipo de evidência */}
      {req.tipo_evidencia && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t('sl_badge_det_tipo_ev')}
          </p>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
            <span className="text-xs text-slate-700">{req.tipo_evidencia}</span>
          </div>
        </div>
      )}

      {/* Obrigatório */}
      {req.obrigatorio_badge === 0 && (
        <span className="mt-3 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
          {t('sl_badge_det_opcional')}
        </span>
      )}
    </div>
  );
}

/* ─── Página principal ───────────────────────────────────────────────── */
export default function ServiceLineBadgeDetalhe() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['badge-detalhe-sl', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/badges/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 120_000,
  });

  const badge = data?.badge;
  const requisitos = data?.requisitos ?? [];
  const meses = mesesDeValidade(badge?.validade_dias);
  const cirCls = NIVEL_COR[badge?.codigo_nivel] || 'bg-softinsa-600';
  const pilCls = NIVEL_PILL[badge?.codigo_nivel] || 'bg-slate-100 text-slate-600';

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo={badge ? badge.titulo : t('sl_badge_det_subtitulo')} />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8 space-y-5">

          {/* Voltar */}
          <button
            type="button"
            onClick={() => navigate('/sl/badges')}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            {t('sl_badge_det_voltar')}
          </button>

          {isLoading ? (
            <div className="flex justify-center py-20"><Carregando /></div>
          ) : isError || !badge ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-600">
              {t('sl_badge_det_erro')}
            </div>
          ) : (
            <>
              {/* ── Info principal ─────────────────────────────────── */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Ícone */}
                  <div className="shrink-0 flex justify-center">
                    {badge.imagem_url ? (
                      <img src={badge.imagem_url} alt={badge.titulo}
                        className="h-28 w-28 rounded-full object-cover" />
                    ) : (
                      <div className={`flex h-28 w-28 items-center justify-center rounded-full ${cirCls}`}>
                        <Award className="h-12 w-12 text-white" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {/* Dados */}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-slate-900">{badge.titulo}</h1>
                    {badge.descricao && (
                      <p className="mt-1 text-sm text-slate-500 leading-relaxed">{badge.descricao}</p>
                    )}

                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Learning Path */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('sl_badge_det_lp')}</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">{badge.nome_learning_path}</p>
                      </div>
                      {/* Service Line */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('sl_badge_det_sl')}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="h-3.5 w-1 rounded-full shrink-0 bg-softinsa-500" />
                          <p className="text-sm font-medium text-slate-700">{badge.nome_service_line}</p>
                        </div>
                      </div>
                      {/* Área */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('sl_badge_det_area')}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.8} />
                          <p className="text-sm font-medium text-slate-700">{badge.nome_area}</p>
                        </div>
                      </div>
                      {/* Nível */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('sl_badge_det_nivel')}</p>
                        <span className={`mt-1 inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${pilCls}`}>
                          {t('sl_badge_det_nivel_tag').replace('{cod}', badge.codigo_nivel).replace('{nome}', badge.nome_nivel)}
                        </span>
                      </div>
                      {/* Pontos */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('sl_badge_det_pontos')}</p>
                        <div className="mt-1 flex items-center gap-1">
                          {badge.pontos > 0 ? (
                            <>
                              <Star className="h-4 w-4 text-amber-400" strokeWidth={1.8} />
                              <p className="text-sm font-semibold text-slate-700">{badge.pontos} {t('sl_badge_det_pontos_tag')}</p>
                            </>
                          ) : (
                            <p className="text-sm text-slate-400">—</p>
                          )}
                        </div>
                      </div>
                      {/* Expiração */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('sl_badge_det_expiracao')}</p>
                        <div className="mt-1 flex items-center gap-1">
                          {meses ? (
                            <>
                              <Timer className="h-4 w-4 text-amber-500" strokeWidth={1.8} />
                              <p className="text-sm font-semibold text-amber-600">
                                {meses === 1
                                  ? t('sl_badge_det_expira').replace('{n}', meses)
                                  : t('sl_badge_det_expira_pl').replace('{n}', meses)}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-slate-400">{t('sl_badge_det_sem_exp')}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stat consultores */}
                    {badge.total_requisitos > 0 && (
                      <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                        <FileText className="h-4 w-4 text-softinsa-500 shrink-0" strokeWidth={1.8} />
                        {badge.total_requisitos === 1
                          ? t('sl_badge_det_stat').replace('{n}', badge.total_requisitos)
                          : t('sl_badge_det_stat_pl').replace('{n}', badge.total_requisitos)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Requisitos ──────────────────────────────────────── */}
              {requisitos.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-slate-900">
                    {t('sl_badge_det_req_titulo').replace('{nivel}', badge.codigo_nivel)}
                  </h2>

                  {/* Aviso */}
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <Info className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" strokeWidth={2} />
                    <p>{t('sl_badge_det_aviso')}</p>
                  </div>

                  {/* Lista */}
                  <div className="space-y-3">
                    {requisitos.map(r => (
                      <CardRequisito key={r.id_requisito} req={r} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
