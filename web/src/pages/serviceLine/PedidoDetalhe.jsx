import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle, XCircle, RotateCcw,
  Download, Clock, User, Layers, Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';

/* ─── Dados ─────────────────────────────────────────────────────────── */
function usePedido(id) {
  return useQuery({
    queryKey: ['sl-pedido', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/candidaturas/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/* ─── Helpers ───────────────────────────────────────────────────────── */
const NIVEL_COR = { A: 'bg-blue-400', B: 'bg-blue-500', C: 'bg-softinsa-600', D: 'bg-indigo-700', E: 'bg-purple-800' };

const ESTADO_CFG = {
  OPEN:                   { label: 'Open',               cls: 'bg-slate-100 text-slate-600' },
  SUBMITTED:              { label: 'Submetido',          cls: 'bg-amber-100 text-amber-700' },
  IN_TALENT_REVIEW:       { label: 'Talent Review',      cls: 'bg-blue-100 text-blue-700' },
  IN_SERVICE_LINE_REVIEW: { label: 'Em Validação',       cls: 'bg-orange-100 text-orange-700' },
  APPROVED:               { label: 'Fechado – Aprovado', cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:               { label: 'Fechado – Rejeitado',cls: 'bg-rose-100 text-rose-700' },
  SENT_BACK:              { label: 'Devolvido',          cls: 'bg-orange-100 text-orange-600' },
  CLOSED:                 { label: 'Fechado',            cls: 'bg-slate-100 text-slate-500' },
};

const TM_DECISAO_CFG = {
  CORRETO:   { label: 'Aprovado',  cls: 'bg-emerald-100 text-emerald-700' },
  INCORRETO: { label: 'Rejeitado', cls: 'bg-rose-100 text-rose-600' },
  APROVAR:   { label: 'Aprovado',  cls: 'bg-emerald-100 text-emerald-700' },
  REJEITAR:  { label: 'Rejeitado', cls: 'bg-rose-100 text-rose-600' },
  SEND_BACK: { label: 'Devolvido', cls: 'bg-orange-100 text-orange-600' },
};

function formatarDataHora(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatarData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ─── Campo de info ─────────────────────────────────────────────────── */
function CampoInfo({ label, valor, destaque }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm ${destaque ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{valor || '—'}</p>
    </div>
  );
}

/* ─── Bloco de requisito ────────────────────────────────────────────── */
function BlocoRequisito({ req, evidencias, tmDecisao }) {
  const evidenciasDoReq = evidencias.filter(e => e.id_requisito === req.id_requisito);
  const temEvidencia = evidenciasDoReq.length > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-softinsa-100 text-[10px] font-bold text-softinsa-700">
            {req.codigo_requisito}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">{req.titulo}</p>
            {req.descricao && <p className="mt-0.5 text-xs text-slate-500">{req.descricao}</p>}
          </div>
        </div>
        {temEvidencia
          ? <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" strokeWidth={1.8} />
          : <XCircle className="h-5 w-5 shrink-0 text-slate-300" strokeWidth={1.8} />}
      </div>

      {/* Evidências */}
      {evidenciasDoReq.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-500">Evidência</p>
          {evidenciasDoReq.map(ev => (
            <a
              key={ev.id_evidencia}
              href={`http://localhost:3000/${ev.ficheiro_url}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs text-softinsa-600 hover:underline"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              {ev.nome_ficheiro}
            </a>
          ))}
        </div>
      )}

      {/* Validação TM */}
      {tmDecisao && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Validação TM:</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TM_DECISAO_CFG[tmDecisao.decisao]?.cls || 'bg-slate-100 text-slate-600'}`}>
              {TM_DECISAO_CFG[tmDecisao.decisao]?.label || tmDecisao.decisao}
            </span>
          </div>
          {tmDecisao.comentario && (
            <p className="mt-1.5 text-xs text-slate-500 italic">{tmDecisao.comentario}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Timeline histórico ────────────────────────────────────────────── */
function ItemHistorico({ h }) {
  const labelAcao = {
    SUBMISSAO:                  'Submissão do Pedido',
    SUBMIT:                     'Submissão do Pedido',
    'TALENT_CORRETO':           'Validação do Talent Manager',
    'TALENT_INCORRETO':         'Devolução pelo Talent Manager',
    'SERVICE_LINE_APROVAR':     'Aprovação do Service Line',
    'SERVICE_LINE_REJEITAR':    'Rejeição pelo Service Line',
    'SERVICE_LINE_SEND_BACK':   'Devolvido pelo Service Line',
  };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="h-3 w-3 rounded-full bg-softinsa-600 mt-0.5 shrink-0" />
        <div className="flex-1 w-px bg-slate-200 mt-1" />
      </div>
      <div className="pb-5">
        <p className="text-xs font-semibold text-slate-700">
          {labelAcao[h.acao] || h.acao || h.estado_destino}
          <span className="ml-2 font-normal text-slate-400">{formatarDataHora(h.data_evento)}</span>
        </p>
        <p className="text-xs text-slate-500">Por: {h.nome_responsavel}</p>
        {h.comentario && <p className="mt-1 text-xs text-slate-500 italic">{h.comentario}</p>}
      </div>
    </div>
  );
}

/* ─── Painel de decisão ─────────────────────────────────────────────── */
function PainelDecisao({ idCandidatura, estadoAtual }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comentario, setComentario] = useState('');
  const [erro, setErro] = useState('');

  const podeDecidirAgora = estadoAtual === 'IN_SERVICE_LINE_REVIEW';

  const mutation = useMutation({
    mutationFn: ({ decisao }) => api.post(`/api/candidaturas/${idCandidatura}/avaliar-service-line`, {
      decisao,
      comentario,
    }),
    onSuccess: (_, { decisao }) => {
      const msgs = { APROVAR: 'Badge aprovado com sucesso!', REJEITAR: 'Candidatura rejeitada.', SEND_BACK: 'Candidatura devolvida para correção.' };
      toast.success(msgs[decisao] || 'Avaliação registada.');
      queryClient.invalidateQueries({ queryKey: ['sl-pedido', String(idCandidatura)] });
      queryClient.invalidateQueries({ queryKey: ['sl-pedidos'] });
      navigate('/sl/pedidos');
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  function submeter(decisao) {
    if (!comentario.trim()) {
      setErro('O comentário é obrigatório.');
      return;
    }
    setErro('');
    mutation.mutate({ decisao });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sticky top-[88px]">
      <h2 className="text-sm font-bold text-slate-900">Decisão do Service Line</h2>
      <p className="mt-0.5 text-xs text-slate-500">A decisão final sobre a atribuição do badge</p>

      {!podeDecidirAgora ? (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Esta candidatura não está em revisão de Service Line (estado: <strong>{ESTADO_CFG[estadoAtual]?.label || estadoAtual}</strong>). Não é possível decidir agora.
        </div>
      ) : (
        <>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Comentário da Decisão <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={comentario}
              onChange={e => { setComentario(e.target.value); setErro(''); }}
              placeholder="Adicione o seu comentário sobre a decisão..."
              rows={8}
              className="input resize-none text-sm"
            />
            {erro && <p className="mt-1 text-xs text-rose-500">{erro}</p>}
            {!erro && <p className="mt-1 text-xs text-slate-400">O comentário é obrigatório</p>}
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => submeter('APROVAR')}
              disabled={mutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
            >
              <CheckCircle className="h-4 w-4" strokeWidth={2} />
              Aprovar Badge
            </button>
            <button
              type="button"
              onClick={() => submeter('REJEITAR')}
              disabled={mutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition"
            >
              <XCircle className="h-4 w-4" strokeWidth={2} />
              Rejeitar
            </button>
            <button
              type="button"
              onClick={() => submeter('SEND_BACK')}
              disabled={mutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={2} />
              Enviar para Correção
            </button>
          </div>

          <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
            <p><span className="font-semibold text-emerald-600">Aprovar:</span> Fechado – Aprovado</p>
            <p><span className="font-semibold text-rose-600">Rejeitar:</span> Fechado – Rejeitado</p>
            <p><span className="font-semibold text-slate-500">Correção:</span> Open</p>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────── */
export default function ServiceLinePedidoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePedido(id);

  if (isLoading) return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />
      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo="Pedidos de Badge – Validação Final" />
        <div className="flex flex-1 items-center justify-center"><Carregando /></div>
      </div>
    </div>
  );

  if (isError || !data) return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />
      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo="Pedidos de Badge – Validação Final" />
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Candidatura não encontrada.</div>
      </div>
    </div>
  );

  const { candidatura, consultor, requisitos = [], evidencias = [], avaliacoes = [], historico = [] } = data;
  const estadoCfg = ESTADO_CFG[candidatura.estado_atual] || { label: candidatura.estado_atual, cls: 'bg-slate-100 text-slate-600' };
  const tmAvaliacao = avaliacoes.find(a => a.tipo_avaliador === 'TALENT_MANAGER');
  const slAvaliacao = avaliacoes.find(a => a.tipo_avaliador === 'SERVICE_LINE');

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo={`Pedidos de Badge – Validação Final\nService Line: ${candidatura.nome_service_line || ''}`} />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8">
          {/* Voltar */}
          <button
            type="button"
            onClick={() => navigate('/sl/pedidos')}
            className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Voltar à lista
          </button>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Coluna principal */}
            <div className="lg:col-span-2 space-y-5">

              {/* Informações da Candidatura */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-bold text-slate-900">Informações da Candidatura</h2>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                  <CampoInfo label="Consultor" valor={consultor?.nome || candidatura.nome_consultor} />
                  <CampoInfo label="Área" valor={candidatura.nome_area} />
                  <CampoInfo label="Service Line" valor={candidatura.nome_service_line} />
                  <CampoInfo label="Badge" valor={candidatura.titulo_badge} destaque />
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Nível</p>
                    <span className={`mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${NIVEL_COR[candidatura.codigo_nivel] || 'bg-slate-400'}`}>
                      {candidatura.codigo_nivel}
                    </span>
                  </div>
                  <CampoInfo label="Data Submissão" valor={formatarData(candidatura.data_submissao)} />
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Estado</p>
                    <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estadoCfg.cls}`}>
                      {estadoCfg.label}
                    </span>
                  </div>
                  <CampoInfo label="Validado por" valor={tmAvaliacao?.nome_avaliador || slAvaliacao?.nome_avaliador} />
                </div>
              </div>

              {/* Requisitos */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">Requisitos do Nível {candidatura.codigo_nivel}</h2>
                <p className="mt-0.5 mb-4 text-xs text-slate-500">
                  O Badge é atribuído apenas quando todos os requisitos do nível estão validados.
                </p>
                <div className="space-y-3">
                  {requisitos.length === 0 ? (
                    <p className="text-xs text-slate-400">Sem requisitos registados para este badge.</p>
                  ) : requisitos.map(req => (
                    <BlocoRequisito
                      key={req.id_requisito}
                      req={req}
                      evidencias={evidencias}
                      tmDecisao={tmAvaliacao}
                    />
                  ))}
                </div>
              </div>

              {/* Histórico */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-bold text-slate-900">Histórico do Processo</h2>
                {historico.length === 0 ? (
                  <p className="text-xs text-slate-400">Sem histórico registado.</p>
                ) : (
                  <div>
                    {historico.map(h => <ItemHistorico key={h.id_historico} h={h} />)}
                  </div>
                )}
              </div>
            </div>

            {/* Painel de decisão */}
            <div>
              <PainelDecisao idCandidatura={candidatura.id_candidatura} estadoAtual={candidatura.estado_atual} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
