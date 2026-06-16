import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Award, CheckCircle, ExternalLink, Sparkles, Star, X } from 'lucide-react';
import { api, extrairErro } from '../lib/api';
import toast from 'react-hot-toast';

export default function BadgeModal({ idBadge, onFechar }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /* Bloqueia scroll do body enquanto o modal está aberto */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /* Fecha ao pressionar Escape */
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onFechar(); }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onFechar]);

  const { data, isLoading } = useQuery({
    queryKey: ['badge-detalhe', idBadge],
    queryFn: async () => {
      const { data } = await api.get(`/api/badges/${idBadge}`);
      return data;
    },
    enabled: !!idBadge,
    staleTime: 120_000,
  });

  const candidatar = useMutation({
    mutationFn: () => api.post('/api/candidaturas', { id_badge: idBadge }),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['candidaturas-consultor'] });
      queryClient.invalidateQueries({ queryKey: ['candidaturas-ativas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-consultor'] });
      toast.success('Candidatura criada com sucesso!');
      onFechar();
      navigate(`/candidaturas/${data.id_candidatura}`);
    },
    onError: (err) => toast.error(extrairErro(err, 'Erro ao criar candidatura.')),
  });

  const badge = data?.badge;
  const requisitos = data?.requisitos ?? [];

  /* Parse de campos que podem vir como JSON ou texto simples */
  function parseList(campo) {
    if (!campo) return [];
    try {
      const parsed = JSON.parse(campo);
      return Array.isArray(parsed) ? parsed : [campo];
    } catch {
      return campo.split('\n').filter(Boolean);
    }
  }

  const beneficios = parseList(badge?.beneficios);
  const competencias = parseList(badge?.competencias_certificadas);

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onFechar}
    >
      {/* Modal */}
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho fixo */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-dashed border-slate-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {isLoading ? 'A carregar...' : badge?.titulo}
            </h2>
            {badge && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-softinsa-600 px-3 py-0.5 text-xs font-semibold text-white">
                  {badge.nome_area}
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  Nível {badge.codigo_nivel} — {badge.nome_nivel}
                </span>
                {badge.pontos > 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                    <Award className="h-3.5 w-3.5" strokeWidth={1.8} />
                    {badge.pontos} pontos
                  </span>
                )}
                {badge.is_conquista_especial ? (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    <Sparkles className="h-3 w-3" /> Conquista Especial
                  </span>
                ) : null}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-softinsa-200 border-t-softinsa-600" />
            </div>
          ) : (
            <>
              {/* Descrição */}
              {badge?.descricao && (
                <section className="border-b border-dashed border-slate-200 pb-5">
                  <h3 className="text-sm font-bold text-slate-900">Descrição</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{badge.descricao}</p>
                </section>
              )}

              {/* Requisitos */}
              {requisitos.length > 0 && (
                <section className="border-b border-dashed border-slate-200 pb-5">
                  <h3 className="text-sm font-bold text-slate-900">Requisitos</h3>
                  <ul className="mt-2 space-y-2">
                    {requisitos.map(r => (
                      <li key={r.id_requisito} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                        <span>{r.titulo}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Benefícios */}
              {beneficios.length > 0 && (
                <section className="border-b border-dashed border-slate-200 pb-5">
                  <h3 className="text-sm font-bold text-slate-900">Benefícios</h3>
                  <ul className="mt-2 space-y-2">
                    {beneficios.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Página completa do badge */}
              <section className="border-b border-dashed border-slate-200 pb-5">
                <h3 className="text-sm font-bold text-slate-900">Página do badge</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Vê todos os requisitos, benefícios e competências numa página dedicada antes de te candidatares.
                </p>
                <button
                  type="button"
                  onClick={() => { onFechar(); navigate(`/badges/${idBadge}`); }}
                  className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
                  Ver página completa do badge
                </button>
              </section>

              {/* Competências certificadas (req 27) */}
              {(competencias.length > 0 || badge?.sobre_certificacao) && (
                <section className="border-b border-dashed border-slate-200 pb-5">
                  <h3 className="text-sm font-bold text-slate-900">Competências certificadas</h3>
                  {competencias.length > 0 && (
                    <ul className="mt-2 space-y-2">
                      {competencias.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {badge?.sobre_certificacao && (
                    <p className="mt-2 text-sm leading-6 text-slate-600">{badge.sobre_certificacao}</p>
                  )}
                </section>
              )}

              {/* Integração Softinsa (req 28) — info geral da empresa, à parte */}
              <section className="pb-2">
                <h3 className="text-sm font-bold text-slate-900">Sobre a Softinsa</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Conhece mais sobre as competências e áreas de atuação da Softinsa no site oficial.
                </p>
                <button
                  type="button"
                  onClick={() => window.open('https://www.softinsa.pt', '_blank')}
                  className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
                  Visitar softinsa.pt
                </button>
              </section>
            </>
          )}
        </div>

        {/* Rodapé fixo */}
        <div className="border-t border-slate-200 px-6 py-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => candidatar.mutate()}
              disabled={candidatar.isPending || isLoading}
              className="flex-1 rounded-lg bg-softinsa-600 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700 disabled:opacity-60"
            >
              {candidatar.isPending ? 'A criar...' : 'Candidatar-me'}
            </button>
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">
            Todos os badges possuem uma página pública de verificação.
          </p>
        </div>
      </div>
    </div>
  );
}
