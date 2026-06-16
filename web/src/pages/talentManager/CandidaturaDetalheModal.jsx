import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, X, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';

const ESTADO_CFG = {
  OPEN:                   { label: 'Aberto',       cls: 'bg-blue-100 text-blue-700' },
  SUBMITTED:              { label: 'Submetido',    cls: 'bg-amber-100 text-amber-700' },
  IN_TALENT_REVIEW:       { label: 'Em Validação', cls: 'bg-amber-100 text-amber-700' },
  IN_SERVICE_LINE_REVIEW: { label: 'Em Validação', cls: 'bg-orange-100 text-orange-700' },
  APPROVED:               { label: 'Aprovado',     cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:               { label: 'Rejeitado',    cls: 'bg-rose-100 text-rose-700' },
  SENT_BACK:              { label: 'Devolvido',    cls: 'bg-orange-100 text-orange-600' },
  CLOSED:                 { label: 'Fechado',      cls: 'bg-slate-100 text-slate-500' },
};

function prioridade(pontos) {
  const p = Number(pontos) || 0;
  if (p >= 350) return { label: 'Alta', cls: 'bg-rose-100 text-rose-600' };
  if (p >= 250) return { label: 'Média', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Baixa', cls: 'bg-slate-100 text-slate-600' };
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
  const navigate = useNavigate();
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
      toast.success(decisao === 'CORRETO'
        ? 'Aprovada — evidências validadas e enviadas ao Service Line. Consultor notificado.'
        : 'Rejeitada — devolvida ao consultor, que foi notificado.');
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
  const estadoCfg = c ? (ESTADO_CFG[estado] || { label: estado, cls: 'bg-slate-100 text-slate-600' }) : null;
  const prio = c ? prioridade(c.pontos) : null;

  const observacoes = avalFinal?.comentario
    || (aberto ? 'Aguardando submissão de evidências pelo consultor.'
      : podeIniciar ? 'Aguardando validação do Talent Manager.'
      : '');

  function rejeitar() {
    if (!comentario.trim()) { toast.error('Indica o motivo da rejeição/devolução no comentário.'); return; }
    avaliar.mutate({ decisao: 'INCORRETO' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onFechar}>
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Detalhes da Candidatura</h2>
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
                <Campo label="Consultor">{c.nome_consultor}</Campo>
                <Campo label={fechado ? 'Estado' : 'Estado'}>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estadoCfg.cls}`}>{estadoCfg.label}</span>
                </Campo>
                <div className="col-span-2"><Campo label="Badge">{c.titulo_badge}</Campo></div>
                <Campo label="Prioridade">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${prio.cls}`}>{prio.label}</span>
                </Campo>
                <Campo label="Pontos"><span className="text-softinsa-600">{c.pontos || 0}</span></Campo>
                <Campo label="Prazo">{fechado ? 'Concluído' : formatarData(c.data_submissao || c.data_abertura)}</Campo>
                <Campo label="Área">{c.nome_area || '—'}</Campo>
              </div>

              {/* Validação (fechado) */}
              {fechado && avalFinal && (
                <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-100 pt-5">
                  <Campo label="Validado dia">{formatarData(avalFinal.data_avaliacao || avalFinal.created_at || c.data_fecho)}</Campo>
                  <Campo label="Validado por">{avalFinal.nome_avaliador || '—'}</Campo>
                </div>
              )}

              {/* Evidências */}
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-sm font-bold text-slate-900">Evidências ({evidencias.length})</p>
                {evidencias.length === 0 ? (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> Sem evidências submetidas
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {evidencias.map(ev => (
                      <a key={ev.id_evidencia} href={ficheiroUrl(ev.ficheiro_url)} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">{ev.nome_ficheiro || 'Ficheiro'}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Observações */}
              {observacoes && (
                <div className="mt-5">
                  <p className="text-sm font-bold text-slate-900">Observações</p>
                  <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{observacoes}</div>
                </div>
              )}

              {/* Caixa de resultado / estado */}
              {aprovado && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <CheckCircle className="h-4 w-4" /> Candidatura Aprovada
                  </p>
                  <p className="mt-1 text-xs leading-5 text-emerald-700/90">
                    Certificação validada com sucesso. {avalFinal?.comentario || ''}
                  </p>
                </div>
              )}
              {rejeitado && (
                <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-rose-700">
                    <XCircle className="h-4 w-4" /> Candidatura Rejeitada
                  </p>
                  <p className="mt-1 text-xs leading-5 text-rose-700/90">
                    {avalFinal?.comentario || 'A candidatura não cumpriu os requisitos necessários.'}
                  </p>
                </div>
              )}
              {aberto && (
                <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                  Esta candidatura ainda está em modo aberto. Aguardando submissão de evidências pelo consultor.
                </div>
              )}
              {slReview && (
                <div className="mt-5 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-xs font-medium text-blue-700">
                  <Clock className="h-4 w-4 shrink-0" /> Já validada por ti — aguarda a validação final do Service Line.
                </div>
              )}

              {/* Comentário do Talent Manager (em validação) */}
              {emValidacao && (
                <div className="mt-5">
                  <label className="mb-1 block text-xs font-medium text-slate-500">Comentário do Talent Manager</label>
                  <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={3}
                    placeholder="Adicione observações sobre a validação..."
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
                <CheckCircle className="h-4 w-4" /> {iniciar.isPending ? 'A iniciar...' : 'Iniciar Validação'}
              </button>
            ) : emValidacao ? (
              <div className="flex gap-3">
                <button type="button" onClick={() => avaliar.mutate({ decisao: 'CORRETO' })} disabled={avaliar.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                  <CheckCircle className="h-4 w-4" /> Aprovar
                </button>
                <button type="button" onClick={rejeitar} disabled={avaliar.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">
                  <XCircle className="h-4 w-4" /> Rejeitar
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => { onFechar(); navigate(`/tm/pedidos/${c.id_candidatura}`); }}
                className="w-full rounded-lg bg-softinsa-600 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700">
                Ver Candidatura
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
