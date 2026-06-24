import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, X, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { useTM } from './i18n';

const ESTADO_CFG = {
  OPEN:                   { key: 'est_aberto',      cls: 'bg-blue-100 text-blue-700' },
  SUBMITTED:              { key: 'est_submetido',   cls: 'bg-amber-100 text-amber-700' },
  IN_TALENT_REVIEW:       { key: 'est_em_validacao', cls: 'bg-amber-100 text-amber-700' },
  IN_SERVICE_LINE_REVIEW: { key: 'est_em_validacao', cls: 'bg-orange-100 text-orange-700' },
  APPROVED:               { key: 'est_aprovado',    cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:               { key: 'est_rejeitado',   cls: 'bg-rose-100 text-rose-700' },
  SENT_BACK:              { key: 'est_devolvido',   cls: 'bg-orange-100 text-orange-600' },
  CLOSED:                 { key: 'est_fechado',     cls: 'bg-slate-100 text-slate-500' },
};

function prioridade(pontos) {
  const p = Number(pontos) || 0;
  if (p >= 350) return { key: 'prio_alta', cls: 'bg-rose-100 text-rose-600' };
  if (p >= 250) return { key: 'prio_media', cls: 'bg-amber-100 text-amber-700' };
  return { key: 'prio_baixa', cls: 'bg-slate-100 text-slate-600' };
}
function formatarData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function ficheiroUrl(u) {
  if (!u) return '#';
  return u.startsWith('http') ? u : `/${String(u).replace(/^\//, '')}`;
}

function Campo({ label, children }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{children}</div>
    </div>
  );
}

export default function CandidaturaDetalheModal({ idCandidatura, onFechar }) {
  const tt = useTM();
  const queryClient = useQueryClient();
  const [comentario, setComentario] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);

  const { data, isLoading } = useQuery({
    queryKey: ['tm-cand-modal', idCandidatura],
    queryFn: async () => { const { data } = await api.get(`/api/candidaturas/${idCandidatura}`); return data; },
    enabled: !!idCandidatura,
  });

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ['tm-candidaturas'] });
    queryClient.invalidateQueries({ queryKey: ['tm-cand-modal', idCandidatura] });
  }

  // Iniciar validação: SUBMITTED → IN_TALENT_REVIEW (sem fechar o modal)
  const iniciar = useMutation({
    mutationFn: () => api.post(`/api/candidaturas/${idCandidatura}/iniciar-validacao-talent`),
    onSuccess: () => { toast.success('Validação iniciada.'); invalidar(); },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const avaliar = useMutation({
    mutationFn: ({ decisao }) => api.post(`/api/candidaturas/${idCandidatura}/avaliar-talent`, { decisao, comentario: comentario.trim() || null }),
    onSuccess: (_, { decisao }) => {
      toast.success(decisao === 'CORRETO' ? tt('cand_aprovada') : tt('cand_rejeitada'));
      invalidar();
      onFechar();
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const c = data?.candidatura;
  const evidencias = data?.evidencias ?? [];
  const avaliacoes = data?.avaliacoes ?? [];
  const estado = c?.estado_atual;

  const podeIniciar = estado === 'SUBMITTED';
  const emValidacao = estado === 'IN_TALENT_REVIEW';
  const aberto = ['OPEN', 'SENT_BACK'].includes(estado);
  const slReview = estado === 'IN_SERVICE_LINE_REVIEW';
  const aprovado = estado === 'APPROVED';
  const rejeitado = estado === 'REJECTED';
  const fechado = aprovado || rejeitado || estado === 'CLOSED';

  const avalFinal = avaliacoes.find(a => a.tipo_avaliador === 'SERVICE_LINE') || avaliacoes[avaliacoes.length - 1];
  const estadoCfg = c ? (ESTADO_CFG[estado] || { key: null, cls: 'bg-slate-100 text-slate-600' }) : null;
  const prio = c ? prioridade(c.pontos) : null;

  const observacoes = avalFinal?.comentario
    || (aberto ? tt('obs_aberto')
      : podeIniciar ? tt('obs_submetido')
      : '');

  function rejeitar() {
    if (!comentario.trim()) { toast.error(tt('motivo_rejeicao_aviso')); return; }
    avaliar.mutate({ decisao: 'INCORRETO' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onFechar}>
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{tt('detalhes_candidatura')}</h2>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading || !c ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-softinsa-200 border-t-softinsa-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Campo label={tt('consultor_lbl')}>{c.nome_consultor}</Campo>
                <Campo label={tt('col_estado')}>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estadoCfg.cls}`}>{estadoCfg.key ? tt(estadoCfg.key) : estado}</span>
                </Campo>
                <div className="col-span-2"><Campo label={tt('col_badge')}>{c.titulo_badge}</Campo></div>
                <Campo label={tt('col_prioridade')}>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${prio.cls}`}>{tt(prio.key)}</span>
                </Campo>
                <Campo label={tt('col_pontos')}><span className="text-softinsa-600">{c.pontos || 0}</span></Campo>
                <Campo label={tt('col_prazo')}>{fechado ? tt('prazo_concluido') : formatarData(c.data_submissao || c.data_abertura)}</Campo>
                <Campo label={tt('col_area')}>{c.nome_area || '—'}</Campo>
              </div>

              {/* Validação (fechado) */}
              {fechado && avalFinal && (
                <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-100 pt-5">
                  <Campo label={tt('validado_dia')}>{formatarData(avalFinal.data_avaliacao || avalFinal.created_at || c.data_fecho)}</Campo>
                  <Campo label={tt('validado_por')}>{avalFinal.nome_avaliador || '—'}</Campo>
                </div>
              )}

              {/* Evidências */}
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-sm font-bold text-slate-900">{tt('col_evidencias')} ({evidencias.length})</p>
                {evidencias.length === 0 ? (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> {tt('sem_evidencias_sub')}
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {evidencias.map(ev => (
                      <a key={ev.id_evidencia} href={ficheiroUrl(ev.ficheiro_url)} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">{ev.nome_ficheiro || tt('ficheiro')}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Observações */}
              {observacoes && (
                <div className="mt-5">
                  <p className="text-sm font-bold text-slate-900">{tt('observacoes')}</p>
                  <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{observacoes}</div>
                </div>
              )}

              {/* Caixa de resultado / estado */}
              {aprovado && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <CheckCircle className="h-4 w-4" /> {tt('cand_aprovada')}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-emerald-700/90">
                    {tt('cand_aprovada_desc')} {avalFinal?.comentario || ''}
                  </p>
                </div>
              )}
              {rejeitado && (
                <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-rose-700">
                    <XCircle className="h-4 w-4" /> {tt('cand_rejeitada')}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-rose-700/90">
                    {avalFinal?.comentario || tt('cand_rejeitada_desc')}
                  </p>
                </div>
              )}
              {aberto && (
                <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                  {tt('em_modo_aberto')}
                </div>
              )}
              {slReview && (
                <div className="mt-5 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-xs font-medium text-blue-700">
                  <Clock className="h-4 w-4 shrink-0" /> {tt('aguarda_sl')}
                </div>
              )}

              {/* Comentário do Talent Manager (em validação) */}
              {emValidacao && (
                <div className="mt-5">
                  <label className="mb-1 block text-xs font-medium text-slate-500">{tt('comentario_tm')}</label>
                  <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={3}
                    placeholder={tt('comentario_ph')}
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé por estado */}
        {!isLoading && c && (
          <div className="border-t border-slate-100 px-6 py-4">
            {podeIniciar ? (
              <button type="button" onClick={() => iniciar.mutate()} disabled={iniciar.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-softinsa-600 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700 disabled:opacity-60">
                <CheckCircle className="h-4 w-4" /> {iniciar.isPending ? tt('a_iniciar') : tt('iniciar_validacao')}
              </button>
            ) : emValidacao ? (
              <div className="flex gap-3">
                <button type="button" onClick={() => avaliar.mutate({ decisao: 'CORRETO' })} disabled={avaliar.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                  <CheckCircle className="h-4 w-4" /> {tt('aprovar')}
                </button>
                <button type="button" onClick={rejeitar} disabled={avaliar.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">
                  <XCircle className="h-4 w-4" /> {tt('rejeitar')}
                </button>
              </div>
            ) : (
              <button type="button" onClick={onFechar}
                className="w-full rounded-lg bg-softinsa-600 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700">
                {tt('fechar')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
