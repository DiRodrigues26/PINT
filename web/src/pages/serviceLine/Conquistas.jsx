import { useQuery } from '@tanstack/react-query';
import { Star, Users, Award, Zap, Clock } from 'lucide-react';
import { api } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';
import { useLanguage } from '../../context/LanguageContext';

/* ─── Helpers ────────────────────────────────────────────────────────── */
const TIPO_CLS = {
  BADGES_AREA:  'bg-blue-100 text-blue-700',
  BADGES_TOTAL: 'bg-purple-100 text-purple-700',
  PONTOS:       'bg-amber-100 text-amber-700',
  NIVEL:        'bg-emerald-100 text-emerald-700',
};

function getTipoLabel(t) {
  return {
    BADGES_AREA:  t('sl_conq_tipo_badges_area'),
    BADGES_TOTAL: t('sl_conq_tipo_badges_total'),
    PONTOS:       t('sl_conq_tipo_pontos'),
    NIVEL:        t('sl_conq_tipo_nivel'),
  };
}

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── Card de Conquista ──────────────────────────────────────────────── */
function CartaoConquista({ c }) {
  const { t } = useLanguage();
  const TIPO_LABEL = getTipoLabel(t);
  const tipoCls = TIPO_CLS[c.tipo_criterio] || 'bg-slate-100 text-slate-600';
  const totalObtido = Number(c.total_obtido_sl);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        {c.imagem_url ? (
          <img src={c.imagem_url} alt={c.nome}
            className="h-12 w-12 shrink-0 rounded-lg object-cover border border-slate-100" />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-lg bg-amber-100 flex items-center justify-center">
            <Star className="h-6 w-6 text-amber-500" strokeWidth={1.8} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm leading-snug">{c.nome}</h3>
          {c.tipo_criterio && (
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${tipoCls}`}>
              {TIPO_LABEL[c.tipo_criterio] || c.tipo_criterio}
            </span>
          )}
        </div>
      </div>

      {/* Descrição */}
      {c.descricao && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{c.descricao}</p>
      )}

      {/* Critério */}
      {c.criterio && (
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">{t('sl_conq_criterio')} </span>{c.criterio}
          {c.valor_objetivo && (
            <span className="ml-1 font-bold text-softinsa-600">({c.valor_objetivo})</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Users className="h-3.5 w-3.5" strokeWidth={2} />
          <span>
            <span className="font-bold text-slate-800">{totalObtido}</span>
            {' '}{totalObtido === 1 ? t('sl_conq_consultor_s') : t('sl_conq_consultor_pl')}
          </span>
        </div>
        {Number(c.pontos_bonus) > 0 && (
          <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
            <Zap className="h-3.5 w-3.5" strokeWidth={2} />
            +{Number(c.pontos_bonus)} pts
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Página principal ───────────────────────────────────────────────── */
export default function ServiceLineConquistas() {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ['sl-conquistas'],
    queryFn: async () => {
      const { data } = await api.get('/api/estatisticas/service-line/conquistas');
      return data;
    },
    staleTime: 60_000,
  });

  const conquistas  = data?.conquistas  || [];
  const atribuicoes = data?.atribuicoes || [];
  const resumo      = data?.resumo      || {};

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo={t('sl_conq_subtitulo')} />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8 space-y-6">

          {/* Título */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('sl_conq_titulo')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('sl_conq_desc')}</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><Carregando /></div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: t('sl_conq_kpi_tipos'),      valor: resumo.total_tipos             ?? 0, icon: Star,  cls: 'bg-amber-500' },
                  { label: t('sl_conq_kpi_premiados'),   valor: resumo.consultores_premiados   ?? 0, icon: Users, cls: 'bg-softinsa-600' },
                  { label: t('sl_conq_kpi_total'),       valor: resumo.total_atribuicoes       ?? 0, icon: Award, cls: 'bg-emerald-500' },
                  { label: t('sl_conq_kpi_pontos'),      valor: resumo.pontos_bonus_total      ?? 0, icon: Zap,   cls: 'bg-purple-500' },
                ].map(k => (
                  <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${k.cls}`}>
                      <k.icon className="h-5 w-5 text-white" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{k.label}</p>
                      <p className="text-xl font-bold text-slate-900">{Number(k.valor).toLocaleString('pt-PT')}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid de conquistas */}
              {conquistas.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                  <Star className="mx-auto h-10 w-10 text-slate-200 mb-3" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-slate-400">{t('sl_conq_sem_conf')}</p>
                </div>
              ) : (
                <div>
                  <h2 className="mb-3 text-base font-bold text-slate-900">{t('sl_conq_todas')}</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {conquistas.map(c => (
                      <CartaoConquista key={c.id_conquista} c={c} />
                    ))}
                  </div>
                </div>
              )}

              {/* Últimas atribuições */}
              {atribuicoes.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                    <Clock className="h-4 w-4 text-slate-500" strokeWidth={1.8} />
                    <h2 className="text-sm font-bold text-slate-800">{t('sl_conq_ult_atrib')}</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-5 py-3 text-left">{t('sl_conq_th_consultor')}</th>
                          <th className="px-3 py-3 text-left">{t('sl_conq_th_area')}</th>
                          <th className="px-3 py-3 text-left">{t('sl_conq_th_conquista')}</th>
                          <th className="px-3 py-3 text-right">{t('sl_conq_th_bonus')}</th>
                          <th className="px-3 py-3 text-left">{t('sl_conq_th_data')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {atribuicoes.map((r, i) => (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                            <td className="px-5 py-3 font-semibold text-slate-900">{r.nome_consultor}</td>
                            <td className="px-3 py-3">
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                {r.nome_area}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-700">{r.nome_conquista}</td>
                            <td className="px-3 py-3 text-right font-bold text-amber-600">
                              {Number(r.pontos_bonus) > 0
                                ? `+${Number(r.pontos_bonus)}`
                                : <span className="text-slate-300 font-normal">—</span>}
                            </td>
                            <td className="px-3 py-3 text-slate-500">{fmt(r.data_atribuicao)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
