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
import { useLanguage } from '../../context/LanguageContext';

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

function getEstadoCfg(t) {
  return {
    OPEN:                   { label: t('sl_estado_open'),             cls: 'bg-slate-100 text-slate-600' },
    SUBMITTED:              { label: t('sl_estado_submitted'),        cls: 'bg-amber-100 text-amber-700' },
    IN_TALENT_REVIEW:       { label: t('sl_estado_talent_review'),    cls: 'bg-blue-100 text-blue-700' },
    IN_SERVICE_LINE_REVIEW: { label: t('sl_estado_sl_review'),        cls: 'bg-orange-100 text-orange-700' },
    APPROVED:               { label: t('sl_estado_closed_approved'),  cls: 'bg-emerald-100 text-emerald-700' },
    REJECTED:               { label: t('sl_estado_closed_rejected'),  cls: 'bg-rose-100 text-rose-700' },
    SENT_BACK:              { label: t('sl_estado_sent_back'),        cls: 'bg-orange-100 text-orange-600' },
    CLOSED:                 { label: t('sl_estado_closed'),           cls: 'bg-slate-100 text-slate-500' },
  };
}

function getTMDecisaoCfg(t) {
  return {
    CORRETO:   { label: t('sl_ped_det_tm_aprov'),  cls: 'bg-emerald-100 text-emerald-700' },
    INCORRETO: { label: t('sl_ped_det_tm_rejeit'), cls: 'bg-rose-100 text-rose-600' },
    APROVAR:   { label: t('sl_ped_det_tm_aprov'),  cls: 'bg-emerald-100 text-emerald-700' },
    REJEITAR:  { label: t('sl_ped_det_tm_rejeit'), cls: 'bg-rose-100 text-rose-600' },
    SEND_BACK: { label: t('sl_ped_det_tm_devol'),  cls: 'bg-orange-100 text-orange-600' },
  };
}

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

function obterUrlFicheiro(caminho) {
  if (!caminho) return '#';
  if (/^https?:\/\//i.test(caminho)) return caminho;
  return `${api.defaults.baseURL || ''}/${String(caminho).replace(/^\/+/, '')}`;
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
  const { t } = useLanguage();
  const TM_DECISAO_CFG = getTMDecisaoCfg(t);
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
          <p className="text-xs font-semibold text-slate-500">{t('sl_ped_det_evidencia')}</p>
          {evidenciasDoReq.map(ev => (
            <a
              key={ev.id_evidencia}
              href={obterUrlFicheiro(ev.ficheiro_url)}
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
            <span className="text-xs font-semibold text-slate-500">{t('sl_ped_det_val_tm')}</span>
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
  const { t } = useLanguage();
  const labelAcao = {
    SUBMISSAO:                  t('sl_ped_det_acao_submissao'),
    SUBMIT:                     t('sl_ped_det_acao_submissao'),
    'TALENT_CORRETO':           t('sl_ped_det_acao_talent_ok'),
    'TALENT_INCORRETO':         t('sl_ped_det_acao_talent_nok'),
    'SERVICE_LINE_APROVAR':     t('sl_ped_det_acao_sl_aprov'),
    'SERVICE_LINE_REJEITAR':    t('sl_ped_det_acao_sl_rejeit'),
    'SERVICE_LINE_SEND_BACK':   t('sl_ped_det_acao_sl_back'),
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
        <p className="text-xs text-slate-500">{t('sl_ped_det_por')} {h.nome_responsavel}</p>
        {h.comentario && <p className="mt-1 text-xs text-slate-500 italic">{h.comentario}</p>}
      </div>
    </div>
  );
}

/* ─── Painel de decisão ─────────────────────────────────────────────── */
function PainelDecisao({ idCandidatura, estadoAtual }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comentario, setComentario] = useState('');
  const [erro, setErro] = useState('');

  const ESTADO_CFG = getEstadoCfg(t);
  const podeDecidirAgora = estadoAtual === 'IN_SERVICE_LINE_REVIEW';

  const mutation = useMutation({
    mutationFn: ({ decisao }) => api.post(`/api/candidaturas/${idCandidatura}/avaliar-service-line`, {
      decisao,
      comentario,
    }),
    onSuccess: (_, { decisao }) => {
      const msgs = {
        APROVAR:    t('sl_ped_det_toast_aprov'),
        REJEITAR:   t('sl_ped_det_toast_rejeit'),
        SEND_BACK:  t('sl_ped_det_toast_back'),
      };
      toast.success(msgs[decisao] || t('sl_ped_det_toast_ok'));
      queryClient.invalidateQueries({ queryKey: ['sl-pedido', String(idCandidatura)] });
      queryClient.invalidateQueries({ queryKey: ['sl-pedidos'] });
      navigate('/sl/pedidos');
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  function submeter(decisao) {
    if (!comentario.trim()) {
      setErro(t('sl_ped_det_coment_obrig'));
      return;
    }
    setErro('');
    mutation.mutate({ decisao });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sticky top-[88px]">
      <h2 className="text-sm font-bold text-slate-900">{t('sl_ped_det_decisao_titulo')}</h2>
      <p className="mt-0.5 text-xs text-slate-500">{t('sl_ped_det_decisao_desc')}</p>

      {!podeDecidirAgora ? (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          {t('sl_ped_det_nao_sl').replace('{estado}', ESTADO_CFG[estadoAtual]?.label || estadoAtual)}
        </div>
      ) : (
        <>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('sl_ped_det_coment_label')} <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={comentario}
              onChange={e => { setComentario(e.target.value); setErro(''); }}
              placeholder={t('sl_ped_det_coment_ph')}
              rows={8}
              className="input resize-none text-sm"
            />
            {erro && <p className="mt-1 text-xs text-rose-500">{erro}</p>}
            {!erro && <p className="mt-1 text-xs text-slate-400">{t('sl_ped_det_coment_info')}</p>}
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => submeter('APROVAR')}
              disabled={mutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
            >
              <CheckCircle className="h-4 w-4" strokeWidth={2} />
              {t('sl_ped_det_aprovar')}
            </button>
            <button
              type="button"
              onClick={() => submeter('REJEITAR')}
              disabled={mutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition"
            >
              <XCircle className="h-4 w-4" strokeWidth={2} />
              {t('sl_ped_det_rejeitar')}
            </button>
            <button
              type="button"
              onClick={() => submeter('SEND_BACK')}
              disabled={mutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={2} />
              {t('sl_ped_det_correcao')}
            </button>
          </div>

          <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
            <p><span className="font-semibold text-emerald-600">{t('sl_ped_det_resultado_aprov')}</span> {t('sl_estado_closed_approved')}</p>
            <p><span className="font-semibold text-rose-600">{t('sl_ped_det_resultado_rejeit')}</span> {t('sl_estado_closed_rejected')}</p>
            <p><span className="font-semibold text-slate-500">{t('sl_ped_det_resultado_corr')}</span> {t('sl_estado_open')}</p>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────── */
export default function ServiceLinePedidoDetalhe() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePedido(id);

  const ESTADO_CFG = getEstadoCfg(t);

  if (isLoading) return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />
      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo={t('sl_ped_det_subtitulo')} />
        <div className="flex flex-1 items-center justify-center"><Carregando /></div>
      </div>
    </div>
  );

  if (isError || !data) return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />
      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo={t('sl_ped_det_subtitulo')} />
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">{t('sl_ped_det_nao_encontrada')}</div>
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
        <ServiceLineTopbar subtitulo={`${t('sl_ped_det_subtitulo')}\nService Line: ${candidatura.nome_service_line || ''}`} />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8">
          {/* Voltar */}
          <button
            type="button"
            onClick={() => navigate('/sl/pedidos')}
            className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            {t('sl_ped_det_voltar')}
          </button>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Coluna principal */}
            <div className="lg:col-span-2 space-y-5">

              {/* Informações da Candidatura */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-bold text-slate-900">{t('sl_ped_det_info_titulo')}</h2>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                  <CampoInfo label={t('sl_ped_det_consultor')} valor={consultor?.nome || candidatura.nome_consultor} />
                  <CampoInfo label={t('sl_ped_det_area')} valor={candidatura.nome_area} />
                  <CampoInfo label={t('sl_ped_det_sl')} valor={candidatura.nome_service_line} />
                  <CampoInfo label={t('sl_ped_det_badge')} valor={candidatura.titulo_badge} destaque />
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('sl_ped_det_nivel')}</p>
                    <span className={`mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${NIVEL_COR[candidatura.codigo_nivel] || 'bg-slate-400'}`}>
                      {candidatura.codigo_nivel}
                    </span>
                  </div>
                  <CampoInfo label={t('sl_ped_det_data_sub')} valor={formatarData(candidatura.data_submissao)} />
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('sl_ped_det_estado')}</p>
                    <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estadoCfg.cls}`}>
                      {estadoCfg.label}
                    </span>
                  </div>
                  <CampoInfo label={t('sl_ped_det_validado')} valor={tmAvaliacao?.nome_avaliador || slAvaliacao?.nome_avaliador} />
                </div>
              </div>

              {/* Requisitos */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">{t('sl_ped_det_req_titulo').replace('{nivel}', candidatura.codigo_nivel)}</h2>
                <p className="mt-0.5 mb-4 text-xs text-slate-500">
                  {t('sl_ped_det_req_desc')}
                </p>
                <div className="space-y-3">
                  {requisitos.length === 0 ? (
                    <p className="text-xs text-slate-400">{t('sl_ped_det_sem_req')}</p>
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
                <h2 className="mb-4 text-sm font-bold text-slate-900">{t('sl_ped_det_hist_titulo')}</h2>
                {historico.length === 0 ? (
                  <p className="text-xs text-slate-400">{t('sl_ped_det_sem_hist')}</p>
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
