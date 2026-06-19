import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  Award, Calendar, CheckCircle, Download, ExternalLink, Globe, Mail,
  Share2, Search, Sparkles, Star, TriangleAlert, X,
} from 'lucide-react';
import { api, extrairErro } from '../../lib/api';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';
import BadgeModal from '../../components/BadgeModal';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

function formatarData(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function diasParaExpirar(dataExp) {
  if (!dataExp) return null;
  return Math.ceil((new Date(dataExp) - Date.now()) / 86_400_000);
}

const NIVEL_BG   = { A: 'bg-softinsa-600', B: 'bg-blue-500', C: 'bg-indigo-500', D: 'bg-violet-600', E: 'bg-purple-700' };
const NIVEL_TEXT = { A: 'text-softinsa-600', B: 'text-blue-600', C: 'text-indigo-600', D: 'text-violet-700', E: 'text-purple-700' };

/* ─── Card de badge obtido ──────────────────────────────────────────────── */
function CardObtido({ item, onAbrirModal, podePublicar, podeLinkedin }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const expirado = item.data_expiracao && new Date(item.data_expiracao) < new Date();
  const dias = diasParaExpirar(item.data_expiracao);
  const expiraEmBreve = !expirado && dias !== null && dias <= 30;

  /* Link público de verificação (sempre aponta ao frontend) */
  const linkPublico = `${window.location.origin}/verificar/${item.token_publico}`;

  /* LinkedIn share */
  const partilharLinkedIn = useMutation({
    mutationFn: () => api.post(`/api/badge-atribuido/${item.id_badge_atribuido}/linkedin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meus-badges'] });
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(linkPublico)}`,
        '_blank',
      );
    },
    onError: (err) => toast.error(extrairErro(err, 'Erro ao partilhar.')),
  });

  function descarregarPDF() {
    toast('A preparar o certificado...', { icon: '📄' });
    api.get(`/api/badge-atribuido/${item.id_badge_atribuido}/certificado`, { responseType: 'blob' })
      .then(({ data }) => {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-${item.titulo?.replace(/\s+/g, '-')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Certificado ainda não disponível para este badge.'));
  }

  return (
    <div className={`relative flex flex-col rounded-xl border bg-white p-5 shadow-sm ${
      expirado ? 'border-red-200' : expiraEmBreve ? 'border-amber-300' : 'border-slate-200'
    }`}>
      {/* Alerta expiração próxima (req 21) */}
      {expiraEmBreve && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          {dias !== 1 ? t('expira_em_dias_pl').replace('{n}', dias) : t('expira_em_dias').replace('{n}', dias)}
        </div>
      )}

      {/* Tag status */}
      <div className="absolute right-4 top-4">
        {item.is_conquista_especial ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
            <Sparkles className="h-3 w-3" /> {t('conquista_especial')}
          </span>
        ) : expirado ? (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-600">{t('expirado_tag')}</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
            <CheckCircle className="h-3 w-3" /> {t('ativo_tag')}
          </span>
        )}
      </div>

      {/* Imagem */}
      <div className="relative w-fit mx-auto mt-2">
        {item.imagem_url ? (
          <img src={item.imagem_url} alt={item.titulo} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-softinsa-100">
            <Award className="h-8 w-8 text-softinsa-500" strokeWidth={1.5} />
          </div>
        )}
        <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white ${NIVEL_BG[item.codigo_nivel] || 'bg-softinsa-600'}`}>
          {item.codigo_nivel}
        </div>
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-900 leading-snug">{item.titulo}</h3>

      <div className="mt-2 space-y-0.5 text-xs text-slate-500">
        <p>Service Line: {item.nome_service_line}</p>
        <p>Área: {item.nome_area}</p>
        <p>Nível: {item.codigo_nivel} {item.nome_nivel}</p>
      </div>

      {item.pontos > 0 && (
        <p className={`mt-2 flex items-center gap-1 text-sm font-bold ${NIVEL_TEXT[item.codigo_nivel] || 'text-softinsa-600'}`}>
          <Star className="h-3.5 w-3.5 fill-current" />
          {item.pontos} pontos
        </p>
      )}

      <div className="mt-3 space-y-1 text-xs text-slate-500">
        {item.data_atribuicao && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            {`${t('obtido_em')}:`} {formatarData(item.data_atribuicao)}
          </div>
        )}
        {item.data_expiracao && (
          <div className={`flex items-center gap-1.5 ${expirado ? 'text-red-500 font-semibold' : expiraEmBreve ? 'text-amber-600 font-semibold' : ''}`}>
            <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            {`${t('expira_em')}:`} {formatarData(item.data_expiracao)}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {/* Ver detalhes */}
        <button
          type="button"
          onClick={() => onAbrirModal(item.id_badge)}
          className="w-full rounded-lg bg-softinsa-600 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700"
        >
          {t('ver_detalhes')}
        </button>

        {/* Linha: LinkedIn + PDF */}
        <div className="flex gap-2">
          {/* LinkedIn share (req 11) — exige consentimento de partilha (RGPD, req 10) */}
          <button
            type="button"
            title={
              !podeLinkedin
                ? 'Ativa "Permitir partilha no LinkedIn" em Perfil › Privacidade e RGPD'
                : item.linkedin_shared ? 'Já partilhado no LinkedIn' : 'Partilhar no LinkedIn'
            }
            onClick={() => partilharLinkedIn.mutate()}
            disabled={partilharLinkedIn.isPending || !podeLinkedin}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              item.linkedin_shared
                ? 'border-blue-200 bg-blue-50 text-blue-600'
                : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
            }`}
          >
            <Share2 className="h-3.5 w-3.5" strokeWidth={1.8} />
            {item.linkedin_shared ? t('partilhado') : 'LinkedIn'}
          </button>

          {/* Download PDF (req 18) */}
          <button
            type="button"
            title="Descarregar certificado PDF"
            onClick={descarregarPDF}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:border-softinsa-300 hover:text-softinsa-700"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
            {t('certificado')}
          </button>
        </div>

        {/* Página pública de verificação (req 25, 26) — exige consentimento de publicação (RGPD, req 10) */}
        <button
          type="button"
          disabled={!podePublicar}
          title={!podePublicar ? 'Ativa "Permitir publicação de badges" em Perfil › Privacidade e RGPD' : undefined}
          onClick={() => window.open(linkPublico, '_blank')}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-700 transition hover:border-softinsa-300 hover:text-softinsa-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-700"
        >
          <ExternalLink className="h-3.5 w-3.5" /> {t('ver_pagina_pub')}
        </button>
      </div>
    </div>
  );
}

/* ─── Card de candidatura em progresso ─────────────────────────────────── */
function CardEmProgresso({ item, onAbrirModal }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const total = Number(item.total_requisitos) || 0;
  const evCount = Number(item.evidencias_count) || 0;
  const pct = total > 0 ? Math.round((evCount / total) * 100) : 0;

  return (
    <div className="relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="absolute right-4 top-4">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
          {t('em_progresso')}
        </span>
      </div>

      <div className="relative w-fit mx-auto mt-2">
        {item.imagem_url ? (
          <img src={item.imagem_url} alt={item.titulo_badge} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-softinsa-100">
            <Award className="h-8 w-8 text-softinsa-500" strokeWidth={1.5} />
          </div>
        )}
        <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white ${NIVEL_BG[item.codigo_nivel] || 'bg-softinsa-600'}`}>
          {item.codigo_nivel}
        </div>
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-900 leading-snug">{item.titulo_badge}</h3>

      <div className="mt-2 space-y-0.5 text-xs text-slate-500">
        <p>Service Line: {item.nome_service_line}</p>
        <p>Área: {item.nome_area}</p>
        <p>Nível: {item.codigo_nivel} {item.nome_nivel}</p>
      </div>

      {item.pontos > 0 && (
        <p className={`mt-2 flex items-center gap-1 text-sm font-bold ${NIVEL_TEXT[item.codigo_nivel] || 'text-softinsa-600'}`}>
          <Star className="h-3.5 w-3.5 fill-current" />
          {item.pontos} pontos
        </p>
      )}

      <div className="mt-3 space-y-1 text-xs text-slate-500">
        {item.data_abertura && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            {`${t('iniciado_em')}:`} {formatarData(item.data_abertura)}
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1 text-xs text-slate-500">
            <span>{evCount}/{total} requisitos</span>
            <span className="font-semibold text-softinsa-600">{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-softinsa-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => navigate(`/candidaturas/${item.id_candidatura}`)}
          className="w-full rounded-lg bg-softinsa-600 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700"
        >
          {t('continuar_cand')}
        </button>
        <button
          type="button"
          onClick={() => onAbrirModal(item.id_badge)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-700 transition hover:border-softinsa-300 hover:text-softinsa-700"
        >
          <ExternalLink className="h-3.5 w-3.5" /> {t('ver_detalhes')}
        </button>
      </div>
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────────── */
export default function MeusBadges() {
  const { t } = useLanguage();
  const { utilizador } = useAuth();
  const slug = utilizador?.url_slug;
  const [modalBadgeId, setModalBadgeId] = useState(null);
  const [pesquisa, setPesquisa] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroSL, setFiltroSL] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const { data: obtidosData, isLoading: loadObtidos } = useQuery({
    queryKey: ['meus-badges'],
    queryFn: async () => { const { data } = await api.get('/api/badge-atribuido/meus'); return data; },
    staleTime: 60_000,
  });

  const { data: candidaturasData, isLoading: loadCand } = useQuery({
    queryKey: ['candidaturas-ativas'],
    queryFn: async () => { const { data } = await api.get('/api/candidaturas?fechadas=0&por_pagina=100'); return data; },
    staleTime: 60_000,
  });

  /* Consentimentos RGPD (req 10) — gateiam publicação e partilha */
  const { data: rgpdData } = useQuery({
    queryKey: ['rgpd'],
    queryFn: async () => { const { data } = await api.get('/api/rgpd'); return data; },
    staleTime: 60_000,
  });
  const consents = useMemo(() => {
    const c = {};
    for (const r of rgpdData?.dados ?? []) if (!(r.tipo_consentimento in c)) c[r.tipo_consentimento] = !!r.aceite;
    return c;
  }, [rgpdData]);
  const podePublicar = !!consents.publicacao_badge;
  const podeLinkedin = !!consents.partilha_linkedin;

  const isLoading = loadObtidos || loadCand;
  const obtidos = obtidosData?.dados ?? [];
  const candidaturasAtivas = useMemo(
    () => (candidaturasData?.dados ?? []).filter(c => !['APPROVED', 'REJECTED', 'CLOSED'].includes(c.estado_atual)),
    [candidaturasData],
  );

  const kpis = useMemo(() => {
    const agora = new Date();
    return {
      total:       obtidos.length,
      pontos:      obtidos.reduce((s, b) => s + (Number(b.pontos) || 0), 0),
      emProgresso: candidaturasAtivas.length,
      expirados:   obtidos.filter(b => b.data_expiracao && new Date(b.data_expiracao) < agora).length,
    };
  }, [obtidos, candidaturasAtivas]);

  const badgesObtidosFiltrados = useMemo(() => {
    let lista = obtidos;
    if (pesquisa)    lista = lista.filter(b => b.titulo.toLowerCase().includes(pesquisa.toLowerCase()));
    if (filtroArea)  lista = lista.filter(b => b.nome_area === filtroArea);
    if (filtroSL)    lista = lista.filter(b => b.nome_service_line === filtroSL);
    if (filtroNivel) lista = lista.filter(b => b.codigo_nivel === filtroNivel);
    if (filtroEstado === 'ativo')    lista = lista.filter(b => !b.data_expiracao || new Date(b.data_expiracao) >= new Date());
    if (filtroEstado === 'expirado') lista = lista.filter(b => b.data_expiracao && new Date(b.data_expiracao) < new Date());
    return lista;
  }, [obtidos, pesquisa, filtroArea, filtroSL, filtroNivel, filtroEstado]);

  const candidaturasFiltradas = useMemo(() => {
    let lista = candidaturasAtivas;
    if (pesquisa)    lista = lista.filter(c => c.titulo_badge.toLowerCase().includes(pesquisa.toLowerCase()));
    if (filtroNivel) lista = lista.filter(c => c.codigo_nivel === filtroNivel);
    if (filtroEstado && filtroEstado !== 'em_progresso') lista = [];
    return lista;
  }, [candidaturasAtivas, pesquisa, filtroNivel, filtroEstado]);

  const mostrarCandidaturas = !filtroEstado || filtroEstado === 'em_progresso';
  const mostrarObtidos      = !filtroEstado || filtroEstado === 'ativo' || filtroEstado === 'expirado';

  function limparFiltros() { setPesquisa(''); setFiltroArea(''); setFiltroSL(''); setFiltroNivel(''); setFiltroEstado(''); }
  const temFiltros = pesquisa || filtroArea || filtroSL || filtroNivel || filtroEstado;

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      {modalBadgeId && <BadgeModal idBadge={modalBadgeId} onFechar={() => setModalBadgeId(null)} />}
      <ConsultorSidebar />
      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo={t('sub_meus_badges')} />

        <main className="px-5 py-8 lg:px-10 pb-24 lg:pb-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t('titulo_meus')}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {t('desc_meus')}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                to="/assinatura-email"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-softinsa-300 hover:text-softinsa-700"
              >
                <Mail className="h-4 w-4" /> Assinatura de email
              </Link>
              {slug && (
                <button
                  type="button"
                  disabled={!podePublicar}
                  title={!podePublicar ? 'Ativa "Permitir publicação de badges" em Perfil › Privacidade e RGPD' : undefined}
                  onClick={() => window.open(`/perfil-publico/${slug}`, '_blank')}
                  className="flex items-center gap-1.5 rounded-lg bg-softinsa-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-softinsa-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-softinsa-600"
                >
                  <Globe className="h-4 w-4" /> Galeria pública
                </button>
              )}
            </div>
          </div>

          {/* Aviso RGPD — publicação desligada (req 10) */}
          {!isLoading && !podePublicar && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <p>
                <strong>{t('aviso_privados_titulo')}</strong> {t('aviso_privados_desc')}{' '}
                <Link to="/perfil" className="font-semibold underline">{t('aviso_privados_link')}</Link>.
              </p>
            </div>
          )}

          {/* KPIs */}
          {!isLoading && (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: t('total_badges'),      valor: kpis.total,                                       cor: 'text-softinsa-700' },
                { label: t('total_pontos'),       valor: kpis.pontos.toLocaleString('pt-PT'),              cor: 'text-amber-500' },
                { label: t('badges_progresso'),   valor: kpis.emProgresso,                                cor: 'text-emerald-600' },
                { label: t('badges_expirados'),   valor: kpis.expirados,                                  cor: 'text-red-500' },
              ].map(({ label, valor, cor }) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className={`mt-2 text-3xl font-bold ${cor}`}>{valor}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filtros */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar badge"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-softinsa-400" />
              </div>
              <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className="rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-softinsa-400">
                <option value="">{t('todas_areas')}</option>
                {[...new Set(obtidos.map(b => b.nome_area))].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={filtroSL} onChange={e => setFiltroSL(e.target.value)} className="rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-softinsa-400">
                <option value="">{t('todas_sl')}</option>
                {[...new Set(obtidos.map(b => b.nome_service_line))].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)} className="rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-softinsa-400">
                <option value="">Todos os níveis</option>
                {['A','B','C','D','E'].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-softinsa-400">
                <option value="">{t('todos_estados')}</option>
                <option value="ativo">{t('estado_ativo')}</option>
                <option value="expirado">{t('estado_expirado')}</option>
                <option value="em_progresso">{t('estado_progresso')}</option>
              </select>
              {temFiltros && (
                <button type="button" onClick={limparFiltros} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  <X className="h-4 w-4" /> {t('limpar_filtros')}
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center"><Carregando /></div>
          ) : (
            <>
              {mostrarCandidaturas && candidaturasFiltradas.length > 0 && (
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {candidaturasFiltradas.map(c => <CardEmProgresso key={c.id_candidatura} item={c} onAbrirModal={setModalBadgeId} />)}
                </div>
              )}
              {mostrarObtidos && badgesObtidosFiltrados.length > 0 && (
                <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 ${mostrarCandidaturas && candidaturasFiltradas.length > 0 ? 'mt-5' : 'mt-6'}`}>
                  {badgesObtidosFiltrados.map(b => <CardObtido key={b.id_badge_atribuido} item={b} onAbrirModal={setModalBadgeId} podePublicar={podePublicar} podeLinkedin={podeLinkedin} />)}
                </div>
              )}
              {candidaturasFiltradas.length === 0 && badgesObtidosFiltrados.length === 0 && (
                <div className="mt-16 flex flex-col items-center text-center">
                  <Award className="h-14 w-14 text-slate-300" strokeWidth={1} />
                  <p className="mt-4 text-base font-semibold text-slate-600">{t('sem_badges')}</p>
                  <p className="mt-1 text-sm text-slate-400">{t('sem_badges_desc')}</p>
                  <button type="button" onClick={() => window.location.href = '/badges'} className="mt-5 rounded-lg bg-softinsa-600 px-5 py-2 text-sm font-semibold text-white hover:bg-softinsa-700">
                    {t('ver_catalogo')}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
