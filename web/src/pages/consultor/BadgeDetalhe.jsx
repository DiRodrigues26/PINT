import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Award, CheckCircle, ClipboardList, Clock, ExternalLink,
  Sparkles, Star, TriangleAlert,
} from 'lucide-react';
import { api, extrairErro } from '../../lib/api';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

const NIVEL_BG = { A: 'bg-softinsa-600', B: 'bg-blue-500', C: 'bg-indigo-500', D: 'bg-violet-600', E: 'bg-purple-700' };

function paraLista(campo) {
  if (!campo) return [];
  try {
    const parsed = JSON.parse(campo);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* texto simples */ }
  return String(campo).split('\n').map(l => l.trim()).filter(Boolean);
}

export default function BadgeDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ['badge-detalhe-pagina', id],
    queryFn: async () => { const { data } = await api.get(`/api/badges/${id}`); return data; },
  });

  const { data: obtidosData } = useQuery({
    queryKey: ['meus-badges-ids'],
    queryFn: async () => { const { data } = await api.get('/api/badge-atribuido/meus'); return data; },
    staleTime: 60_000,
  });

  const { data: candidaturasData } = useQuery({
    queryKey: ['candidaturas-ativas'],
    queryFn: async () => { const { data } = await api.get('/api/candidaturas?fechadas=0&por_pagina=100'); return data; },
    staleTime: 60_000,
  });

  const candidatar = useMutation({
    mutationFn: () => api.post('/api/candidaturas', { id_badge: Number(id) }),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['candidaturas-ativas'] });
      queryClient.invalidateQueries({ queryKey: ['candidaturas-consultor'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-consultor'] });
      toast.success('Candidatura criada com sucesso!');
      navigate(`/candidaturas/${data.id_candidatura}`);
    },
    onError: (err) => toast.error(extrairErro(err, 'Erro ao criar candidatura.')),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f3f6fa]">
        <ConsultorSidebar />
        <div className="lg:pl-[260px]">
          <ConsultorTopbar subtitulo={t('sub_badge_detalhe')} />
          <div className="flex min-h-[60vh] items-center justify-center"><Carregando /></div>
        </div>
      </div>
    );
  }

  const badge = data?.badge;
  const requisitos = data?.requisitos ?? [];

  if (!badge) {
    return (
      <div className="min-h-screen bg-[#f3f6fa]">
        <ConsultorSidebar />
        <div className="lg:pl-[260px]">
          <ConsultorTopbar subtitulo={t('sub_badge_detalhe')} />
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
            <TriangleAlert className="h-12 w-12 text-amber-400" />
            <p className="font-semibold text-slate-600">Badge não encontrado.</p>
            <Link to="/badges" className="text-sm font-semibold text-softinsa-600 hover:underline">Voltar ao catálogo</Link>
          </div>
        </div>
      </div>
    );
  }

  const obtido = (obtidosData?.dados ?? []).find(o => o.id_badge === badge.id_badge);
  const candidaturaAtiva = (candidaturasData?.dados ?? []).find(
    c => c.id_badge === badge.id_badge && !['APPROVED', 'REJECTED', 'CLOSED'].includes(c.estado_atual),
  );
  const beneficios = paraLista(badge.beneficios);
  const competencias = paraLista(badge.competencias_certificadas);

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <ConsultorSidebar />
      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo={t('sub_catalogo_detalhe')} />

        <main className="px-5 py-8 lg:px-10 pb-24 lg:pb-10">
          <button onClick={() => navigate('/badges')}
            className="mb-5 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-softinsa-600">
            <ArrowLeft className="h-4 w-4" /> {t('catalogo')}
          </button>

          {/* Cabeçalho */}
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:flex-row sm:text-left">
            <div className="relative shrink-0">
              {badge.imagem_url ? (
                <img src={badge.imagem_url} alt={badge.titulo} className="h-28 w-28 rounded-full object-cover ring-4 ring-softinsa-100" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-softinsa-100 ring-4 ring-softinsa-50">
                  <Award className="h-14 w-14 text-softinsa-500" strokeWidth={1.5} />
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ring-4 ring-white ${NIVEL_BG[badge.codigo_nivel] || 'bg-softinsa-600'}`}>
                {badge.codigo_nivel}
              </div>
            </div>

            <div className="flex-1">
              <p className="text-xs font-medium text-slate-400">{badge.nome_learning_path}</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">{badge.titulo}</h1>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="rounded-full bg-softinsa-600 px-3 py-0.5 text-xs font-semibold text-white">{badge.nome_service_line}</span>
                <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-600">{badge.nome_area}</span>
                <span className="text-xs font-semibold text-slate-600">Nível {badge.codigo_nivel} — {badge.nome_nivel}</span>
                {badge.is_conquista_especial ? (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    <Sparkles className="h-3 w-3" /> {t('conquista_especial')}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-600 sm:justify-start">
                {badge.pontos > 0 && (
                  <span className="flex items-center gap-1.5 font-semibold text-amber-500">
                    <Star className="h-4 w-4 fill-current" /> {badge.pontos} pontos
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {badge.tem_expiracao ? `Validade de ${badge.validade_dias} dias` : 'Sem expiração'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Coluna principal */}
            <div className="space-y-6 lg:col-span-2">
              {badge.descricao && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-900">Descrição</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{badge.descricao}</p>
                </section>
              )}

              {/* Requisitos como cards (req 9) */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <ClipboardList className="h-4 w-4 text-softinsa-600" />
                  Requisitos ({requisitos.length})
                </h2>
                <p className="mt-1 text-xs text-slate-500">Para obter este badge tens de evidenciar todos os requisitos abaixo.</p>
                {requisitos.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">Sem requisitos definidos.</p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {requisitos.map(r => (
                      <div key={r.id_requisito} className="flex gap-3 rounded-xl border border-slate-200 p-4">
                        {r.imagem_url ? (
                          <img src={r.imagem_url} alt={r.titulo} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-softinsa-50 text-softinsa-500">
                            <CheckCircle className="h-6 w-6" strokeWidth={1.8} />
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
              </section>

              {/* Benefícios */}
              {beneficios.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-900">Benefícios</h2>
                  <ul className="mt-3 space-y-2">
                    {beneficios.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Competências certificadas (req 27) */}
              {(competencias.length > 0 || badge.sobre_certificacao) && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-900">Competências certificadas</h2>
                  {competencias.length > 0 && (
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {competencias.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {badge.sobre_certificacao && <p className="mt-3 text-sm leading-6 text-slate-600">{badge.sobre_certificacao}</p>}
                </section>
              )}

              {/* Integração Softinsa (req 28) — info geral da empresa, secção à parte */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">Sobre a Softinsa</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Conhece as áreas de atuação e competências da Softinsa no site oficial.
                </p>
                <a href="https://www.softinsa.pt" target="_blank" rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-softinsa-300 hover:text-softinsa-700">
                  <ExternalLink className="h-4 w-4" /> Visitar softinsa.pt
                </a>
              </section>
            </div>

            {/* Coluna lateral — ação */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                {obtido ? (
                  <div className="text-center">
                    <CheckCircle className="mx-auto h-10 w-10 text-emerald-500" />
                    <p className="mt-3 text-sm font-bold text-slate-900">Já tens este badge!</p>
                    <Link to="/meus-badges" className="mt-4 block w-full rounded-lg bg-softinsa-600 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700">
                      Ver nos meus badges
                    </Link>
                  </div>
                ) : candidaturaAtiva ? (
                  <div className="text-center">
                    <Clock className="mx-auto h-10 w-10 text-amber-500" />
                    <p className="mt-3 text-sm font-bold text-slate-900">Candidatura em curso</p>
                    <p className="mt-1 text-xs text-slate-500">Já tens uma candidatura ativa para este badge.</p>
                    <button onClick={() => navigate(`/candidaturas/${candidaturaAtiva.id_candidatura}`)}
                      className="mt-4 w-full rounded-lg bg-softinsa-600 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700">
                      {t('continuar_cand')}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-bold text-slate-900">Pronto para começar?</p>
                    <p className="mt-1 text-xs text-slate-500">Submete a tua candidatura e faz upload das evidências dos requisitos.</p>
                    <button onClick={() => candidatar.mutate()} disabled={candidatar.isPending}
                      className="mt-4 w-full rounded-lg bg-softinsa-600 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700 disabled:opacity-60">
                      {candidatar.isPending ? 'A criar...' : t('candidatar')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
