import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Eye,
  FileText,
  History,
  MessageSquare,
  Search,
  Send,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { formatarData, formatarDataHora } from '../../lib/formatar';
import Paginacao from '../../components/admin/Paginacao';
import { useLanguage } from '../../context/LanguageContext';

const ESTADOS = ['OPEN', 'SUBMITTED', 'IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW', 'SENT_BACK', 'APPROVED', 'REJECTED', 'CLOSED'];

const ESTADO_CORES = {
  OPEN: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  IN_TALENT_REVIEW: 'bg-amber-100 text-amber-700',
  IN_SERVICE_LINE_REVIEW: 'bg-violet-100 text-violet-700',
  SENT_BACK: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CLOSED: 'bg-slate-200 text-slate-700',
};

const ICONES = {
  check: CheckCircle,
  eye: Eye,
  file: FileText,
  history: History,
  message: MessageSquare,
  search: Search,
  send: Send,
  user: UserRound,
  x: X,
  xcircle: XCircle,
};

function Icon({ nome, className = 'h-5 w-5' }) {
  const Componente = ICONES[nome] || FileText;
  return <Componente className={className} aria-hidden="true" strokeWidth={1.8} />;
}

export function Modal({ titulo, children, onFechar, size = 'lg' }) {
  const sizeClass = size === 'xl' ? 'max-w-6xl' : 'max-w-4xl';
  return (
    <div className="fixed inset-x-0 -top-8 bottom-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 pt-8">
      <div className={`max-h-[96vh] w-full ${sizeClass} overflow-hidden rounded-[28px] bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b-4 border-slate-200 px-7 py-5">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{titulo}</h2>
          <button type="button" onClick={onFechar} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
            <Icon nome="x" className="h-9 w-9" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

async function obterTodasDaRota(rota, params = {}) {
  const primeira = (await api.get(rota, { params: { ...params, pagina: 1, por_pagina: 100 } })).data;
  const todas = [...(primeira.dados || [])];
  const totalPaginas = Math.ceil((primeira.total || 0) / (primeira.por_pagina || 100));

  for (let p = 2; p <= totalPaginas; p += 1) {
    const resposta = (await api.get(rota, { params: { ...params, pagina: p, por_pagina: 100 } })).data;
    todas.push(...(resposta.dados || []));
  }

  return { dados: todas };
}

function dificuldade(item) {
  if (!item?.codigo_nivel) return '—';
  return `(${item.codigo_nivel}) ${item.nome_nivel || ''}`.trim();
}

function ficheiroHref(url) {
  if (!url) return '#';
  if (/^https?:\/\//i.test(url)) return url;
  return `${api.defaults.baseURL || ''}${url}`;
}

function estadoCandidaturaLocal(estado, t) {
  const labels = {
    OPEN: t('admin_dash_state_open'),
    SUBMITTED: t('admin_rel_est_submitted'),
    IN_TALENT_REVIEW: t('admin_rel_est_talent_review'),
    IN_SERVICE_LINE_REVIEW: t('admin_rel_est_sl_review'),
    SENT_BACK: t('admin_dash_state_sent_back'),
    APPROVED: t('admin_dash_state_approved'),
    REJECTED: t('admin_dash_state_rejected'),
    CLOSED: t('admin_rel_est_closed'),
  };
  return { label: labels[estado] || estado || '—', cor: ESTADO_CORES[estado] || 'bg-slate-100 text-slate-700' };
}

function estadoBadge(estado, t) {
  const cfg = estadoCandidaturaLocal(estado, t);
  return <span className={`badge-pill ${cfg.cor}`}>{cfg.label}</span>;
}

function ResumoCampo({ label, valor }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-800">{valor || '—'}</div>
    </div>
  );
}

function Secao({ titulo, icon, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-base font-bold text-slate-900">
        {icon && <Icon nome={icon} className="h-5 w-5 text-softinsa-700" />}
        {titulo}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DetalheCandidatura({ id, onFechar }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [comentario, setComentario] = useState('');

  const detalhe = useQuery({
    queryKey: ['admin', 'candidatura', id],
    queryFn: async () => (await api.get(`/api/candidaturas/${id}`)).data,
    enabled: !!id,
    refetchInterval: 15000,
  });

  const avaliarTalent = useMutation({
    mutationFn: (decisao) => api.post(`/api/candidaturas/${id}/avaliar-talent`, {
      decisao,
      comentario: comentario.trim() || null,
    }),
    onSuccess: () => {
      toast.success(t('admin_cand_toast_talent'));
      setComentario('');
      qc.invalidateQueries({ queryKey: ['admin', 'candidaturas'] });
      qc.invalidateQueries({ queryKey: ['admin', 'candidatura', id] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err, t('admin_cand_erro_avaliacao'))),
  });

  const avaliarServiceLine = useMutation({
    mutationFn: (decisao) => api.post(`/api/candidaturas/${id}/avaliar-service-line`, {
      decisao,
      comentario: comentario.trim() || null,
    }),
    onSuccess: () => {
      toast.success(t('admin_cand_toast_decisao'));
      setComentario('');
      qc.invalidateQueries({ queryKey: ['admin', 'candidaturas'] });
      qc.invalidateQueries({ queryKey: ['admin', 'candidatura', id] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err, t('admin_cand_erro_decisao'))),
  });

  if (detalhe.isLoading) {
    return <div className="px-7 py-12 text-center text-slate-500">{t('admin_cand_a_carregar_processo')}</div>;
  }

  if (detalhe.isError) {
    return (
      <div className="px-7 py-8 text-center">
        <p className="text-sm text-red-600">{extrairErro(detalhe.error, t('admin_cand_erro_abrir_processo'))}</p>
        <button type="button" className="btn-secondary mt-4" onClick={onFechar}>{t('admin_close')}</button>
      </div>
    );
  }

  const data = detalhe.data || {};
  const candidatura = data.candidatura || {};
  const consultor = data.consultor || {};
  const requisitos = data.requisitos || [];
  const evidencias = data.evidencias || [];
  const avaliacoes = data.avaliacoes || [];
  const historico = data.historico || [];
  const estado = candidatura.estado_atual;
  const emTalent = ['SUBMITTED', 'IN_TALENT_REVIEW'].includes(estado);
  const emServiceLine = estado === 'IN_SERVICE_LINE_REVIEW';
  const loadingAcao = avaliarTalent.isPending || avaliarServiceLine.isPending;

  return (
    <>
      <div className="max-h-[72vh] overflow-y-auto bg-slate-50 px-7 py-6">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <div className="text-sm text-slate-500">{t('admin_cand_processo_id').replace('{id}', candidatura.id_candidatura)}</div>
                  <h3 className="mt-1 text-2xl font-bold text-slate-900">{candidatura.titulo_badge}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {estadoBadge(estado, t)}
                    <span className="badge-pill bg-blue-50 text-softinsa-700">{dificuldade(candidatura)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm md:min-w-[320px]">
                  <ResumoCampo label={t('admin_cand_abertura')} valor={formatarData(candidatura.data_abertura)} />
                  <ResumoCampo label={t('admin_rel_col_submissao')} valor={formatarData(candidatura.data_submissao)} />
                  <ResumoCampo label={t('admin_cand_fecho')} valor={formatarData(candidatura.data_fecho)} />
                  <ResumoCampo label={t('admin_cand_evidencias')} valor={`${evidencias.length}/${requisitos.length}`} />
                </div>
              </div>
            </section>

            <Secao titulo={t('admin_cand_requisitos_evidencias')} icon="file">
              <div className="space-y-3">
                {requisitos.map((req) => {
                  const reqEvidencias = evidencias.filter((ev) => Number(ev.id_requisito) === Number(req.id_requisito));
                  return (
                    <div key={req.id_requisito} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{req.titulo}</div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{req.descricao || t('admin_cand_sem_descricao')}</p>
                          <div className="mt-2 text-xs font-semibold text-slate-500">{t('admin_cand_tipo_evidencia').replace('{tipo}', req.tipo_evidencia || '—')}</div>
                        </div>
                        <span className={`badge-pill ${reqEvidencias.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {reqEvidencias.length ? t('admin_cand_evidencias_count').replace('{total}', reqEvidencias.length) : t('admin_cand_sem_evidencia')}
                        </span>
                      </div>
                      {reqEvidencias.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                          {reqEvidencias.map((ev) => (
                            <a
                              key={ev.id_evidencia}
                              href={ficheiroHref(ev.ficheiro_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-softinsa-700 hover:bg-blue-50"
                            >
                              <Icon nome="file" className="h-4 w-4 shrink-0" />
                              <span className="truncate">{ev.nome_ficheiro}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {requisitos.length === 0 && <div className="py-8 text-center text-sm text-slate-500">{t('admin_cand_sem_requisitos')}</div>}
              </div>
            </Secao>

            <Secao titulo={t('admin_cand_historico_auditoria')} icon="history">
              <div className="space-y-3">
                {historico.map((h) => (
                  <div key={h.id_historico} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{h.acao || t('admin_cand_acao_registada')}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {h.estado_origem || '—'} → {h.estado_destino || '—'}
                        </div>
                        {h.comentario && <p className="mt-2 text-sm leading-6 text-slate-600">{h.comentario}</p>}
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div className="font-semibold">{h.nome_responsavel || t('admin_cand_sistema')}</div>
                        <div>{formatarDataHora(h.data_evento)}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {historico.length === 0 && <div className="py-8 text-center text-sm text-slate-500">{t('admin_cand_sem_historico')}</div>}
              </div>
            </Secao>
          </div>

          <aside className="space-y-5">
            <Secao titulo={t('admin_dash_col_consultant')} icon="user">
              <div className="space-y-4 text-sm">
                <ResumoCampo label={t('admin_lp_lbl_nome')} valor={consultor.nome} />
                <ResumoCampo label="Email" valor={consultor.email} />
                <ResumoCampo label="Service Line" valor={candidatura.nome_service_line} />
                <ResumoCampo label={t('admin_rel_col_area')} valor={candidatura.nome_area} />
              </div>
            </Secao>

            <Secao titulo={t('admin_cand_avaliacoes')} icon="message">
              <div className="space-y-3">
                {avaliacoes.map((av) => (
                  <div key={av.id_avaliacao} className="rounded-lg bg-slate-50 px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-slate-800">{av.tipo_avaliador}</span>
                      <span className="badge-pill bg-blue-50 text-softinsa-700">{av.decisao}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{av.nome_avaliador} - {formatarDataHora(av.data_avaliacao)}</div>
                    {av.comentario && <p className="mt-2 leading-6 text-slate-600">{av.comentario}</p>}
                  </div>
                ))}
                {avaliacoes.length === 0 && <div className="py-4 text-sm text-slate-500">{t('admin_cand_sem_avaliacoes')}</div>}
              </div>
            </Secao>

            <Secao titulo={t('admin_cand_decisao')} icon="check">
              {emTalent || emServiceLine ? (
                <div className="space-y-4">
                  <textarea
                    className="input min-h-[110px] resize-y py-3"
                    placeholder={t('admin_cand_comentario_placeholder')}
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                  />
                  {emTalent && (
                    <div className="grid grid-cols-1 gap-3">
                      <button type="button" className="btn-primary justify-center" disabled={loadingAcao} onClick={() => avaliarTalent.mutate('CORRETO')}>
                        <Icon nome="send" className="h-4 w-4" /> {t('admin_cand_enviar_sl')}
                      </button>
                      <button type="button" className="btn-secondary justify-center border-orange-300 text-orange-700 hover:bg-orange-50" disabled={loadingAcao} onClick={() => avaliarTalent.mutate('INCORRETO')}>
                        <Icon nome="xcircle" className="h-4 w-4" /> {t('admin_cand_devolver_consultor')}
                      </button>
                    </div>
                  )}
                  {emServiceLine && (
                    <div className="grid grid-cols-1 gap-3">
                      <button type="button" className="btn-primary justify-center" disabled={loadingAcao} onClick={() => avaliarServiceLine.mutate('APROVAR')}>
                        <Icon nome="check" className="h-4 w-4" /> {t('admin_cand_aprovar_badge')}
                      </button>
                      <button type="button" className="btn-secondary justify-center border-orange-300 text-orange-700 hover:bg-orange-50" disabled={loadingAcao} onClick={() => avaliarServiceLine.mutate('SEND_BACK')}>
                        <Icon nome="send" className="h-4 w-4" /> {t('admin_cand_send_back')}
                      </button>
                      <button type="button" className="btn bg-red-600 text-white hover:bg-red-700" disabled={loadingAcao} onClick={() => avaliarServiceLine.mutate('REJEITAR')}>
                        <Icon nome="xcircle" className="h-4 w-4" /> {t('admin_cand_rejeitar')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                  {t('admin_cand_modo_consulta')}
                </div>
              )}
            </Secao>
          </aside>
        </div>
      </div>
      <div className="flex justify-end border-t-4 border-slate-200 px-7 py-5">
        <button type="button" className="btn-secondary px-6" onClick={onFechar}>{t('admin_close')}</button>
      </div>
    </>
  );
}

export default function AdminCandidaturas() {
  const { t } = useLanguage();
  const [filtros, setFiltros] = useState({
    estado: '',
    id_consultor: '',
    id_badge: '',
    id_service_line: '',
    id_area: '',
  });
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Abrir diretamente o detalhe de uma candidatura quando se navega com state
  // (ex.: "Ver Processo" nos Pedidos Recentes do dashboard).
  useEffect(() => {
    const id = location.state?.abrirCandidaturaId;
    if (id) {
      setModal({ tipo: 'detalhe', id });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const candidaturas = useQuery({
    queryKey: ['admin', 'candidaturas', filtros, pagina],
    queryFn: async () => (await api.get('/api/candidaturas', {
      params: {
        pagina,
        por_pagina: 8,
        estado: filtros.estado || undefined,
        id_consultor: filtros.id_consultor || undefined,
        id_badge: filtros.id_badge || undefined,
        id_service_line: filtros.id_service_line || undefined,
        id_area: filtros.id_area || undefined,
      },
    })).data,
    refetchInterval: 15000,
  });

  const consultores = useQuery({
    queryKey: ['admin', 'candidaturas', 'consultores'],
    queryFn: async () => obterTodasDaRota('/api/utilizadores', { perfil: 'Consultor', ativo: 1 }),
  });

  const badges = useQuery({
    queryKey: ['admin', 'candidaturas', 'badges'],
    queryFn: async () => obterTodasDaRota('/api/badges'),
  });

  const serviceLines = useQuery({
    queryKey: ['admin', 'candidaturas', 'service-lines'],
    queryFn: async () => obterTodasDaRota('/api/service-lines'),
  });

  const areas = useQuery({
    queryKey: ['admin', 'candidaturas', 'areas'],
    queryFn: async () => obterTodasDaRota('/api/areas'),
  });

  const lista = candidaturas.data?.dados || [];
  const total = candidaturas.data?.total || 0;
  const porPagina = candidaturas.data?.por_pagina || 8;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const listaConsultores = consultores.data?.dados || [];
  const listaBadges = badges.data?.dados || [];
  const listaServiceLines = serviceLines.data?.dados || [];
  const listaAreas = areas.data?.dados || [];

  const areasFiltro = useMemo(() => {
    if (!filtros.id_service_line) return listaAreas;
    return listaAreas.filter((area) => String(area.id_service_line) === String(filtros.id_service_line));
  }, [filtros.id_service_line, listaAreas]);

  function atualizarFiltro(campo, valor) {
    setFiltros((atual) => {
      const proximo = { ...atual, [campo]: valor };
      if (campo === 'id_service_line') proximo.id_area = '';
      if (campo === 'id_area') {
        const area = listaAreas.find((item) => String(item.id_area) === String(valor));
        if (area?.id_service_line) proximo.id_service_line = String(area.id_service_line);
      }
      return proximo;
    });
    setPagina(1);
  }

  function limparFiltros() {
    setFiltros({ estado: '', id_consultor: '', id_badge: '', id_service_line: '', id_area: '' });
    setPagina(1);
  }

  return (
    <div className="mx-auto max-w-[1560px] space-y-7">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin_menu_candidaturas')}</h1>
          <p className="mt-2 text-sm text-slate-500">{t('admin_cand_subtitulo')}</p>
        </div>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[190px_1fr_1fr_220px_220px_190px]">
          <select className="input" value={filtros.estado} onChange={(e) => atualizarFiltro('estado', e.target.value)}>
            <option value="">{t('admin_notif_estado_todos')}</option>
            {ESTADOS.map((valor) => <option key={valor} value={valor}>{estadoCandidaturaLocal(valor, t).label}</option>)}
          </select>
          <select className="input" value={filtros.id_consultor} onChange={(e) => atualizarFiltro('id_consultor', e.target.value)}>
            <option value="">{t('admin_cand_consultor_todos')}</option>
            {listaConsultores.map((u) => <option key={u.id_utilizador} value={u.id_utilizador}>{u.nome}</option>)}
          </select>
          <select className="input" value={filtros.id_badge} onChange={(e) => atualizarFiltro('id_badge', e.target.value)}>
            <option value="">{t('admin_cand_badge_todos')}</option>
            {listaBadges.map((badge) => <option key={badge.id_badge} value={badge.id_badge}>{badge.titulo}</option>)}
          </select>
          <select className="input" value={filtros.id_service_line} onChange={(e) => atualizarFiltro('id_service_line', e.target.value)}>
            <option value="">{t('admin_cand_sl_todas')}</option>
            {listaServiceLines.map((sl) => <option key={sl.id_service_line} value={sl.id_service_line}>{sl.nome}</option>)}
          </select>
          <select className="input" value={filtros.id_area} onChange={(e) => atualizarFiltro('id_area', e.target.value)}>
            <option value="">{t('admin_cand_area_todas')}</option>
            {areasFiltro.map((area) => <option key={area.id_area} value={area.id_area}>{area.nome}</option>)}
          </select>
          <button type="button" className="btn-secondary border-softinsa-600 text-softinsa-700" onClick={limparFiltros}>
            <Icon nome="x" className="h-4 w-4" /> {t('admin_notif_limpar_filtros')}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1320px] w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-4 text-left">{t('admin_dash_col_consultant')}</th>
                <th className="px-4 py-4 text-left">{t('admin_dash_col_badge')}</th>
                <th className="px-4 py-4 text-left">Service Line</th>
                <th className="px-4 py-4 text-left">{t('admin_rel_col_area')}</th>
                <th className="px-4 py-4 text-center">{t('admin_dash_level')}</th>
                <th className="px-4 py-4 text-center">{t('admin_dash_col_state')}</th>
                <th className="px-4 py-4 text-center">{t('admin_cand_evidencias')}</th>
                <th className="px-4 py-4 text-center">{t('admin_dash_col_date')}</th>
                <th className="px-4 py-4 text-center">{t('admin_dash_col_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {candidaturas.isLoading ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">{t('admin_cand_a_carregar_pedidos')}</td></tr>
              ) : lista.map((item) => (
                <tr key={item.id_candidatura} className="text-slate-700">
                  <td className="px-4 py-5">
                    <div className="font-semibold text-slate-800">{item.nome_consultor}</div>
                    <div className="text-xs text-slate-500">{item.email_consultor}</div>
                  </td>
                  <td className="px-4 py-5 font-semibold text-slate-800">{item.titulo_badge}</td>
                  <td className="px-4 py-5 text-slate-500">{item.nome_service_line}</td>
                  <td className="px-4 py-5 text-slate-500">{item.nome_area}</td>
                  <td className="px-4 py-5 text-center text-slate-600">{dificuldade(item)}</td>
                  <td className="px-4 py-5 text-center">{estadoBadge(item.estado_atual, t)}</td>
                  <td className="px-4 py-5 text-center font-semibold text-slate-800">{item.evidencias_count || 0}/{item.total_requisitos || 0}</td>
                  <td className="px-4 py-5 text-center text-slate-600">{formatarData(item.data_submissao || item.data_abertura)}</td>
                  <td className="px-4 py-5 text-center">
                    <button type="button" className="btn-secondary mx-auto px-3 py-2 text-softinsa-700" onClick={() => setModal({ tipo: 'detalhe', id: item.id_candidatura })}>
                      <Icon nome="eye" className="h-4 w-4" /> {t('admin_dash_view_process')}
                    </button>
                  </td>
                </tr>
              ))}
              {!candidaturas.isLoading && lista.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">{t('admin_cand_vazio')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Paginacao
          pagina={pagina}
          totalPaginas={totalPaginas}
          total={total}
          porPagina={porPagina}
          itensNaPagina={lista.length}
          onMudarPagina={setPagina}
          rotulo={t('admin_cand_pedidos')}
        />
      </section>

      {modal?.tipo === 'detalhe' && (
        <Modal titulo={t('admin_sla_detalhe_processo')} onFechar={() => setModal(null)} size="xl">
          <DetalheCandidatura id={modal.id} onFechar={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
