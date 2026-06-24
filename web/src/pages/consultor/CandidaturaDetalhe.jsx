import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, ArrowLeft, CheckCircle, Clock,
  FileText, Info, Shield, Trash2, Upload, X,
} from 'lucide-react';
import { api, extrairErro } from '../../lib/api';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

const EDITAVEIS = ['OPEN', 'SENT_BACK'];

/* ─── Timeline de validação ─────────────────────────────────────────────── */
const PASSOS = [
  { label: 'Open',     icon: Clock,        estados: ['OPEN', 'SENT_BACK'] },
  { label: 'Review',   icon: FileText,     estados: ['SUBMITTED', 'IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW'] },
  { label: 'Approved', icon: CheckCircle,  estados: ['APPROVED', 'CLOSED'] },
];

function indicePasso(estado) {
  if (['OPEN', 'SENT_BACK'].includes(estado)) return 0;
  if (['SUBMITTED', 'IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW'].includes(estado)) return 1;
  return 2;
}

/* ─── Card de requisito ─────────────────────────────────────────────────── */
function CardRequisito({ req, evidencias, externo, podeEditar, idCandidatura }) {
  const fileRef = useRef(null);
  const queryClient = useQueryClient();
  const minhasEv = evidencias.filter(e => Number(e.id_requisito) === Number(req.id_requisito));
  const carregado = minhasEv.length > 0;

  const reutilizar = useMutation({
    mutationFn: () => api.post(`/api/candidaturas/${idCandidatura}/evidencias/reutilizar`, { id_evidencia_origem: externo?.id_evidencia }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidatura', idCandidatura] });
      toast.success('Evidência reutilizada do outro badge.');
    },
    onError: (err) => toast.error(extrairErro(err, 'Erro ao reutilizar.')),
  });

  const upload = useMutation({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('ficheiro', file);
      form.append('id_requisito', String(req.id_requisito));
      return api.post(`/api/candidaturas/${idCandidatura}/evidencias`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidatura', idCandidatura] });
      toast.success('Evidência carregada.');
    },
    onError: (err) => toast.error(extrairErro(err, 'Erro ao carregar evidência.')),
  });

  const remover = useMutation({
    mutationFn: (idEv) => api.delete(`/api/candidaturas/${idCandidatura}/evidencias/${idEv}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidatura', idCandidatura] });
      toast.success('Evidência removida.');
    },
    onError: (err) => toast.error(extrairErro(err, 'Erro ao remover.')),
  });

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    // Validação client-side (igual ao que o servidor aceita)
    const EXT_OK = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'zip', 'doc', 'docx'];
    const MAX_MB = 10;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!EXT_OK.includes(ext)) {
      toast.error(`Tipo de ficheiro não permitido (.${ext}). Aceites: ${EXT_OK.join(', ')}.`);
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Ficheiro demasiado grande (máx. ${MAX_MB} MB).`);
      return;
    }
    upload.mutate(file);
  }

  /* Evidências necessárias: vem de tipo_evidencia ou parsed da descricao */
  const evNecessarias = req.tipo_evidencia
    ? req.tipo_evidencia.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-softinsa-600">
          {req.codigo_requisito || `R${req.ordem}`}
        </span>
        {carregado ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircle className="h-3 w-3" /> Carregado
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            <Clock className="h-3 w-3" /> Pendente
          </span>
        )}
      </div>

      <h4 className="mt-2 text-sm font-bold text-slate-800">{req.titulo}</h4>
      {req.descricao && (
        <p className="mt-1 text-xs leading-5 text-slate-500">{req.descricao}</p>
      )}
      {req.imagem_url && (
        <img
          src={req.imagem_url}
          alt={req.titulo}
          className="mt-4 h-36 w-full rounded-lg border border-slate-200 object-cover"
        />
      )}

      {/* Evidências necessárias */}
      {evNecessarias.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-600">Evidências Necessárias:</p>
          <ul className="mt-1 space-y-0.5">
            {evNecessarias.map((item, i) => (
              <li key={i} className="text-xs text-slate-500">• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Requisito já cumprido noutro badge — reutilizar evidência */}
      {podeEditar && !carregado && externo && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle className="h-3.5 w-3.5" /> Já cumpriste este requisito no badge “{externo.badge_origem}”
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-emerald-700/80">
            Não precisas de voltar a submeter — podes reutilizar a evidência “{externo.nome_ficheiro}”.
          </p>
          <button
            type="button"
            onClick={() => reutilizar.mutate()}
            disabled={reutilizar.isPending}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <Upload className="h-3.5 w-3.5" /> {reutilizar.isPending ? 'A reutilizar...' : 'Reutilizar evidência'}
          </button>
        </div>
      )}

      {/* Upload zone */}
      {podeEditar && (
        <div
          role="button"
          tabIndex={0}
          className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-6 transition hover:border-softinsa-400 hover:bg-softinsa-50 focus:outline-none"
          onClick={() => fileRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
        >
          {upload.isPending ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-softinsa-200 border-t-softinsa-600" />
          ) : (
            <>
              <Upload className="h-6 w-6 text-softinsa-500" strokeWidth={1.5} />
              <p className="text-xs font-semibold text-softinsa-600">Upload de Evidência</p>
              <p className="text-[11px] text-slate-400">PDF, Imagem, Certificado ou Relatório</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.zip,.doc,.docx"
            onChange={handleFile}
          />
        </div>
      )}

      {/* Ficheiros uploaded */}
      {minhasEv.length > 0 && (
        <ul className="mt-3 space-y-2">
          {minhasEv.map(ev => (
            <li key={ev.id_evidencia} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.8} />
                <span className="truncate text-xs font-medium text-slate-700">{ev.nome_ficheiro}</span>
              </div>
              {podeEditar && (
                <button
                  type="button"
                  onClick={() => remover.mutate(ev.id_evidencia)}
                  disabled={remover.isPending}
                  className="ml-2 shrink-0 text-slate-400 transition hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Modal Política RGPD ───────────────────────────────────────────────── */
function ModalRGPD({ onFechar }) {
  const politica = useQuery({
    queryKey: ['rgpd', 'politica-ativa', 'GERAL'],
    queryFn: async () => (await api.get('/api/rgpd/politica-ativa', { params: { tipo: 'GERAL' } })).data,
  });
  const politicaAtiva = politica.data?.politica;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onFechar}>
      <div
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-softinsa-600" strokeWidth={1.8} />
            <div>
              <h2 className="text-base font-bold text-slate-900">{politicaAtiva?.titulo || 'Política de Privacidade e RGPD'}</h2>
              {politicaAtiva?.versao && <p className="text-xs text-slate-500">Versão {politicaAtiva.versao}</p>}
            </div>
          </div>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-slate-600 space-y-4 leading-6">
          {politica.isLoading ? (
            <p>A carregar política...</p>
          ) : politicaAtiva ? (
            <div className="whitespace-pre-wrap">{politicaAtiva.conteudo}</div>
          ) : (
            <>
              <p className="font-semibold text-slate-800">1. Responsável pelo Tratamento</p>
              <p>A Softinsa, S.A. é a entidade responsável pelo tratamento dos dados pessoais recolhidos através desta plataforma de badges digitais.</p>

              <p className="font-semibold text-slate-800">2. Dados Recolhidos</p>
              <p>Para emissão e publicação de badges, são recolhidos os seguintes dados: nome completo, endereço de email, área de competência, badges obtidos e evidências submetidas.</p>

              <p className="font-semibold text-slate-800">3. Finalidade do Tratamento</p>
              <ul className="space-y-1 pl-4">
                <li>• Emissão e verificação de badges digitais de competências</li>
                <li>• Publicação do perfil público de certificações</li>
                <li>• Partilha em plataformas profissionais (ex: LinkedIn)</li>
                <li>• Análise de progressão e competências internas</li>
              </ul>

              <p className="font-semibold text-slate-800">4. Base Legal</p>
              <p>O tratamento dos dados baseia-se no consentimento expresso do titular (Art. 6.º, n.º 1, al. a) do RGPD) e na execução de contrato de trabalho.</p>

              <p className="font-semibold text-slate-800">5. Partilha de Dados</p>
              <p>Os dados poderão ser partilhados com entidades parceiras da Softinsa para efeitos de verificação de competências, bem como tornados públicos através do perfil de badges, mediante consentimento.</p>

              <p className="font-semibold text-slate-800">6. Prazo de Conservação</p>
              <p>Os dados são conservados durante a vigência do vínculo profissional e até 5 anos após a cessação do mesmo, salvo obrigação legal de conservação por prazo superior.</p>

              <p className="font-semibold text-slate-800">7. Direitos do Titular</p>
              <p>Pode exercer os seus direitos de acesso, retificação, apagamento, portabilidade e oposição contactando <span className="font-semibold text-softinsa-600">dpo@softinsa.pt</span>.</p>

              <p className="font-semibold text-slate-800">8. Revogação do Consentimento</p>
              <p>O consentimento pode ser revogado a qualquer momento, sem prejuízo da licitude do tratamento efetuado com base no consentimento previamente dado. A revogação pode ser feita nas definições do perfil.</p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onFechar}
            className="w-full rounded-lg bg-softinsa-600 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700"
          >
            Compreendi
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────────── */
export default function CandidaturaDetalhe() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rgpdAceite, setRgpdAceite] = useState(false);
  const [submetido, setSubmetido] = useState(false);
  const [mostrarRGPD, setMostrarRGPD] = useState(false);

  /* Candidatura */
  const { data, isLoading } = useQuery({
    queryKey: ['candidatura', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/candidaturas/${id}`);
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 15000,
  });

  const candidatura = data?.candidatura;
  const evidencias = data?.evidencias ?? [];

  /* Badge + requisitos */
  const { data: badgeData } = useQuery({
    queryKey: ['badge-detalhe', candidatura?.id_badge],
    queryFn: async () => {
      const { data } = await api.get(`/api/badges/${candidatura.id_badge}`);
      return data;
    },
    enabled: !!candidatura?.id_badge,
    staleTime: 120_000,
  });

  const requisitos = badgeData?.requisitos ?? [];
  const podeEditar = EDITAVEIS.includes(candidatura?.estado_atual);
  const passoCurrent = indicePasso(candidatura?.estado_atual ?? 'OPEN');

  const totalReq = requisitos.length;
  const cumpridos = requisitos.filter(r =>
    evidencias.some(e => Number(e.id_requisito) === Number(r.id_requisito))
  ).length;
  const pct = totalReq > 0 ? Math.round((cumpridos / totalReq) * 100) : 0;

  /* Submeter */
  const submeter = useMutation({
    mutationFn: () => api.post(`/api/candidaturas/${id}/submeter`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidatura', id] });
      queryClient.invalidateQueries({ queryKey: ['candidaturas-consultor'] });
      setSubmetido(true);
    },
    onError: (err) => toast.error(extrairErro(err, 'Erro ao submeter.')),
  });

  function handleSubmeter() {
    if (!rgpdAceite) {
      toast.error('Aceita os termos RGPD antes de submeter.');
      return;
    }
    submeter.mutate();
  }

  const tituloBadge = candidatura?.titulo_badge ?? 'Detalhe da Candidatura';

  /* ── Ecrã de sucesso após submissão ─────────────────────────────────── */
  if (submetido) {
    return (
      <div className="min-h-screen bg-[#f3f6fa]">
        <ConsultorSidebar />
        <div className="lg:pl-[260px]">
          <ConsultorTopbar subtitulo={t('sub_cand_submetida')} />
          <main className="flex min-h-[calc(100vh-92px)] items-center justify-center px-4 pb-24 lg:pb-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-10 w-10 text-emerald-500" strokeWidth={1.8} />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-slate-900">
                A sua candidatura foi submetida com sucesso!
              </h2>
              <p className="mt-3 text-sm text-slate-500">Receberá um email de confirmação em breve.</p>
              <p className="mt-1 text-sm text-slate-500">
                O processo de validação será iniciado pelo seu Talent Manager.
              </p>
              <button
                type="button"
                onClick={() => navigate('/candidaturas')}
                className="mt-8 rounded-lg bg-softinsa-700 px-8 py-3 text-sm font-semibold text-white transition hover:bg-softinsa-800"
              >
                Voltar para Candidaturas
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      {mostrarRGPD && <ModalRGPD onFechar={() => setMostrarRGPD(false)} />}
      <ConsultorSidebar />

      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo={tituloBadge} />

        <main className="px-4 py-6 lg:px-8 pb-28">
          {isLoading ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <Carregando />
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-4">
              {/* Voltar */}
              <button
                type="button"
                onClick={() => navigate('/candidaturas')}
                className="flex items-center gap-1.5 text-sm font-semibold text-softinsa-600 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Voltar às candidaturas
              </button>

              {/* Info banner */}
              <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
                Este Badge é atribuído apenas quando todos os requisitos deste nível forem cumpridos.
              </div>

              {/* Progresso */}
              {totalReq > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>Requisitos cumpridos: {cumpridos} / {totalReq}</span>
                    <span className="text-softinsa-600">{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-softinsa-600 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}

              {/* Processo de Validação */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-bold text-slate-800">Processo de Validação</h3>
                <div className="flex items-start">
                  {PASSOS.map((passo, i) => {
                    const Icon = passo.icon;
                    const concluido = i < passoCurrent;
                    const atual = i === passoCurrent;
                    return (
                      <div key={passo.label} className="flex flex-1 items-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${
                            concluido || atual
                              ? 'border-softinsa-600 bg-softinsa-600'
                              : 'border-slate-300 bg-white'
                          }`}>
                            <Icon className={`h-4 w-4 ${concluido || atual ? 'text-white' : 'text-slate-400'}`} strokeWidth={2} />
                          </div>
                          <span className={`text-[11px] font-semibold ${atual ? 'text-softinsa-600' : concluido ? 'text-slate-600' : 'text-slate-400'}`}>
                            {passo.label}
                          </span>
                        </div>
                        {i < PASSOS.length - 1 && (
                          <div className={`mx-2 mb-4 flex-1 h-0.5 ${i < passoCurrent ? 'bg-softinsa-600' : 'bg-slate-200'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600 space-y-1">
                  <p>• Submissão de evidências pelo candidato</p>
                  <p>• Revisão pelo responsável da Service Line</p>
                  <p>• Validação final e atribuição do badge</p>
                </div>
              </div>

              {/* RGPD */}
              {podeEditar && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <input
                    type="checkbox"
                    checked={rgpdAceite}
                    onChange={e => setRgpdAceite(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-softinsa-600 focus:ring-softinsa-400"
                  />
                  <span className="text-sm text-slate-600">
                    Autorizo a publicação e partilha deste badge na plataforma e em páginas públicas.{' '}
                    <button
                      type="button"
                      onClick={e => { e.preventDefault(); setMostrarRGPD(true); }}
                      className="font-semibold text-softinsa-600 hover:underline"
                    >
                      Ver Política RGPD
                    </button>
                  </span>
                </label>
              )}

              {/* Requisitos */}
              {requisitos.length > 0 && (
                <>
                  <h3 className="text-base font-bold text-slate-900">Requisitos do Badge</h3>
                  <div className="space-y-4">
                    {requisitos.map(req => (
                      <CardRequisito
                        key={req.id_requisito}
                        req={req}
                        evidencias={evidencias}
                        externo={(data?.requisitos_externos || {})[req.id_requisito]}
                        podeEditar={podeEditar}
                        idCandidatura={id}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Avaliações/feedback */}
              {data?.avaliacoes?.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-3 text-sm font-bold text-slate-800">Feedback da Avaliação</h3>
                  <div className="space-y-3">
                    {data.avaliacoes.map(av => (
                      <div key={av.id_avaliacao} className={`rounded-lg p-3 text-xs ${
                        av.decisao === 'APROVAR' ? 'bg-emerald-50 text-emerald-700' :
                        av.decisao === 'REJEITAR' ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        <p className="font-semibold">{av.tipo_avaliador} — {av.decisao}</p>
                        {av.comentario && <p className="mt-1">{av.comentario}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Botão submeter fixo no fundo */}
        {podeEditar && !isLoading && (
          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white px-4 py-3 lg:left-[260px]">
            <div className="mx-auto flex max-w-2xl justify-end">
              <button
                type="button"
                onClick={handleSubmeter}
                disabled={submeter.isPending}
                className="rounded-lg bg-softinsa-600 px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700 disabled:opacity-60"
              >
                {submeter.isPending ? 'A submeter...' : 'Submeter Candidatura'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
