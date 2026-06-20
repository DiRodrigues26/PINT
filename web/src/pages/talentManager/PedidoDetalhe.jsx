import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle, XCircle, RotateCcw, Download, User, Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { TalentManagerSidebar, TalentManagerTopbar } from '../../components/TalentManagerShell';
import Carregando from '../../components/Carregando';
import { useTM } from './i18n';

const NIVEL_COR = { A: 'bg-blue-400', B: 'bg-blue-500', C: 'bg-softinsa-600', D: 'bg-indigo-700', E: 'bg-purple-800' };

function ficheiroUrl(u) {
  if (!u) return '#';
  return u.startsWith('http') ? u : `/${String(u).replace(/^\//, '')}`;
}

function formatarDataHora(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatarData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function CampoInfo({ label, valor, destaque }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm ${destaque ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{valor || '—'}</p>
    </div>
  );
}

function BlocoRequisito({ req, evidencias }) {
  const tt = useTM();
  const evidenciasDoReq = evidencias.filter(e => Number(e.id_requisito) === Number(req.id_requisito));
  const temEvidencia = evidenciasDoReq.length > 0;

  return (
    <div className={`rounded-xl border p-4 ${temEvidencia ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-softinsa-100 text-[10px] font-bold text-softinsa-700">
            {req.codigo_requisito || 'R'}
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

      {evidenciasDoReq.length > 0 ? (
        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-500">{tt('evidencias_submetidas')}</p>
          {evidenciasDoReq.map(ev => (
            <a key={ev.id_evidencia} href={ficheiroUrl(ev.ficheiro_url)} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-xs text-softinsa-600 hover:underline">
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              {ev.nome_ficheiro || tt('arquivo_padrao')}
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">{tt('sem_evidencia_submetida')}</p>
      )}
    </div>
  );
}

function ItemHistorico({ h }) {
  const tt = useTM();
  const labelAcao = {
    SUBMISSAO: tt('hist_submetida'),
    SUBMIT: tt('hist_submetida'),
    TALENT_CORRETO: tt('hist_talent_correto'),
    TALENT_INCORRETO: tt('hist_talent_incorreto'),
    SERVICE_LINE_APROVAR: tt('hist_sl_aprovar'),
    SERVICE_LINE_REJEITAR: tt('hist_sl_rejeitar'),
    SERVICE_LINE_SEND_BACK: tt('hist_sl_devolver'),
  };
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-softinsa-600" />
        <div className="mt-1 w-px flex-1 bg-slate-200" />
      </div>
      <div className="pb-5">
        <p className="text-xs font-semibold text-slate-700">
          {labelAcao[h.acao] || h.acao || h.estado_destino}
          <span className="ml-2 font-normal text-slate-400">{formatarDataHora(h.data_evento)}</span>
        </p>
        {h.nome_responsavel && <p className="text-xs text-slate-500">{tt('por_lbl')} {h.nome_responsavel}</p>}
        {h.comentario && <p className="mt-1 text-xs italic text-slate-500">{h.comentario}</p>}
      </div>
    </div>
  );
}

/* Painel de decisão do Talent Manager */
function PainelDecisao({ idCandidatura, estadoAtual, estadoLabel }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tt = useTM();
  const [comentario, setComentario] = useState('');
  const [erro, setErro] = useState('');

  const podeDecidir = ['SUBMITTED', 'IN_TALENT_REVIEW'].includes(estadoAtual);

  const mutation = useMutation({
    mutationFn: ({ decisao }) => api.post(`/api/candidaturas/${idCandidatura}/avaliar-talent`, { decisao, comentario }),
    onSuccess: (_, { decisao }) => {
      toast.success(decisao === 'CORRETO'
        ? tt('toast_validadas_encaminhadas')
        : tt('toast_devolvida_retificar'));
      queryClient.invalidateQueries({ queryKey: ['tm-pedido', String(idCandidatura)] });
      queryClient.invalidateQueries({ queryKey: ['tm-candidaturas'] });
      navigate('/tm/pedidos');
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  function submeter(decisao) {
    if (decisao === 'INCORRETO' && !comentario.trim()) {
      setErro(tt('motivo_devolucao_consultor'));
      return;
    }
    setErro('');
    mutation.mutate({ decisao });
  }

  return (
    <div className="sticky top-[88px] rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">{tt('validar_evidencias_titulo')}</h2>
      <p className="mt-0.5 text-xs text-slate-500">{tt('confirma_evidencias_desc')}</p>

      {!podeDecidir ? (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          {tt('nao_aguarda_validacao_prefix')} {estadoLabel || estadoAtual}).
        </div>
      ) : (
        <>
          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold text-slate-700">{tt('comentario_label')}</label>
            <textarea
              value={comentario}
              onChange={e => { setComentario(e.target.value); setErro(''); }}
              placeholder={tt('obs_obrigatorio_devolver')}
              rows={6}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400"
            />
            {erro && <p className="mt-1 text-xs text-rose-500">{erro}</p>}
          </div>

          <div className="mt-4 space-y-2">
            <button type="button" onClick={() => submeter('CORRETO')} disabled={mutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
              <CheckCircle className="h-4 w-4" strokeWidth={2} /> {tt('validar_enviar_sl')}
            </button>
            <button type="button" onClick={() => submeter('INCORRETO')} disabled={mutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60">
              <RotateCcw className="h-4 w-4" strokeWidth={2} /> {tt('devolver_consultor')}
            </button>
          </div>

          <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
            <p><span className="font-semibold text-emerald-600">{tt('btn_validar')}</span> → {tt('legenda_validar_desc')}</p>
            <p><span className="font-semibold text-rose-600">{tt('devolver_consultor')}</span> → {tt('legenda_devolver_desc')}</p>
          </div>
        </>
      )}
    </div>
  );
}

export default function TalentPedidoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tt = useTM();

  const ESTADO_CFG = {
    OPEN:                   { label: tt('pest_open'),         cls: 'bg-slate-100 text-slate-600' },
    SUBMITTED:              { label: tt('pest_submitted'),     cls: 'bg-amber-100 text-amber-700' },
    IN_TALENT_REVIEW:       { label: tt('pest_talent_review'), cls: 'bg-blue-100 text-blue-700' },
    IN_SERVICE_LINE_REVIEW: { label: tt('em_validacao_sl'),    cls: 'bg-orange-100 text-orange-700' },
    APPROVED:               { label: tt('pest_approved'),      cls: 'bg-emerald-100 text-emerald-700' },
    REJECTED:               { label: tt('pest_rejected'),      cls: 'bg-rose-100 text-rose-700' },
    SENT_BACK:              { label: tt('pest_sent_back'),     cls: 'bg-orange-100 text-orange-600' },
    CLOSED:                 { label: tt('pest_closed'),        cls: 'bg-slate-100 text-slate-500' },
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tm-pedido', id],
    queryFn: async () => { const { data } = await api.get(`/api/candidaturas/${id}`); return data; },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f3f6fa]">
        <TalentManagerSidebar />
        <div className="lg:pl-[260px]">
          <TalentManagerTopbar subtitulo={tt('pd_subtitulo')} />
          <div className="flex min-h-[60vh] items-center justify-center"><Carregando /></div>
        </div>
      </div>
    );
  }

  if (isError || !data?.candidatura) {
    return (
      <div className="min-h-screen bg-[#f3f6fa]">
        <TalentManagerSidebar />
        <div className="lg:pl-[260px]">
          <TalentManagerTopbar subtitulo={tt('pd_subtitulo')} />
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">{tt('pd_nao_encontrada')}</div>
        </div>
      </div>
    );
  }

  const { candidatura, consultor, requisitos = [], evidencias = [], historico = [] } = data;
  const estadoCfg = ESTADO_CFG[candidatura.estado_atual] || { label: candidatura.estado_atual, cls: 'bg-slate-100 text-slate-600' };
  const totalReq = requisitos.length;
  const comEvidencia = requisitos.filter(r => evidencias.some(e => Number(e.id_requisito) === Number(r.id_requisito))).length;

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <TalentManagerSidebar />
      <div className="lg:pl-[260px]">
        <TalentManagerTopbar subtitulo={tt('pd_subtitulo')} />

        <main className="px-5 py-6 lg:px-8 pb-24 lg:pb-8">
          <button onClick={() => navigate('/tm/pedidos')}
            className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" strokeWidth={2} /> {tt('voltar_validacoes')}
          </button>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              {/* Info */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">{tt('info_candidatura')}</h2>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estadoCfg.cls}`}>{estadoCfg.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                  <CampoInfo label={tt('col_consultor')} valor={consultor?.nome || candidatura.nome_consultor} />
                  <CampoInfo label={tt('col_area')} valor={candidatura.nome_area} />
                  <CampoInfo label={tt('col_service_line')} valor={candidatura.nome_service_line} />
                  <CampoInfo label={tt('col_badge')} valor={candidatura.titulo_badge} destaque />
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{tt('nivel')}</p>
                    <span className={`mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${NIVEL_COR[candidatura.codigo_nivel] || 'bg-slate-400'}`}>
                      {candidatura.codigo_nivel}
                    </span>
                  </div>
                  <CampoInfo label={tt('submetida_em')} valor={formatarData(candidatura.data_submissao)} />
                  <CampoInfo label={tt('col_evidencias')} valor={`${comEvidencia}/${totalReq} ${tt('requisitos_lbl')}`} />
                </div>
              </div>

              {/* Requisitos + evidências */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">{tt('requisitos_e_evidencias')}</h2>
                <p className="mt-0.5 mb-4 text-xs text-slate-500">{tt('verifica_evidencia_antes')}</p>
                <div className="space-y-3">
                  {requisitos.length === 0
                    ? <p className="text-xs text-slate-400">{tt('sem_requisitos_def')}</p>
                    : requisitos.map(req => <BlocoRequisito key={req.id_requisito} req={req} evidencias={evidencias} />)}
                </div>
              </div>

              {/* Histórico */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-bold text-slate-900">{tt('hist_titulo')}</h2>
                {historico.length === 0
                  ? <p className="text-xs text-slate-400">{tt('sem_historico')}</p>
                  : <div>{historico.map(h => <ItemHistorico key={h.id_historico} h={h} />)}</div>}
              </div>
            </div>

            <div>
              <PainelDecisao idCandidatura={candidatura.id_candidatura} estadoAtual={candidatura.estado_atual} estadoLabel={estadoCfg.label} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
