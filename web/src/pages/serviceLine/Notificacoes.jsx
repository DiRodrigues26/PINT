import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, TriangleAlert, CheckCircle, XCircle, Bell,
  CheckCheck, Trash2, Mail, Filter, X, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';
import { useLanguage } from '../../context/LanguageContext';

/* ─── Mapeamento tipo → ícone + cor ────────────────────────────────── */
const TIPO_ICON_BG = {
  NOVO_PEDIDO:             { icon: FileText,       bg: 'bg-blue-500'    },
  PEDIDO_VALIDACAO:        { icon: FileText,       bg: 'bg-blue-500'    },
  SLA_LIMITE:              { icon: TriangleAlert,  bg: 'bg-amber-500'   },
  SLA_PROXIMO:             { icon: TriangleAlert,  bg: 'bg-amber-500'   },
  BADGE_APROVADO:          { icon: CheckCircle,    bg: 'bg-emerald-500' },
  CANDIDATURA_APROVADA:    { icon: CheckCircle,    bg: 'bg-emerald-500' },
  BADGE_REJEITADO:         { icon: XCircle,        bg: 'bg-rose-500'    },
  CANDIDATURA_REJEITADA:   { icon: XCircle,        bg: 'bg-rose-500'    },
  AVISO:                   { icon: Bell,           bg: 'bg-slate-400'   },
  SISTEMA:                 { icon: Bell,           bg: 'bg-slate-400'   },
  default:                 { icon: Bell,           bg: 'bg-slate-400'   },
};
const TOPBAR_NOTIFICACOES_QUERY_KEY = ['topbar-notificacoes-nao-lidas'];

function getTipoConfig(t) {
  return {
    NOVO_PEDIDO:           { ...TIPO_ICON_BG.NOVO_PEDIDO,           label: t('sl_notif_tipo_novo_pedido') },
    PEDIDO_VALIDACAO:      { ...TIPO_ICON_BG.PEDIDO_VALIDACAO,      label: t('sl_notif_tipo_pedido_val')  },
    SLA_LIMITE:            { ...TIPO_ICON_BG.SLA_LIMITE,            label: t('sl_notif_tipo_sla_limite')  },
    SLA_PROXIMO:           { ...TIPO_ICON_BG.SLA_PROXIMO,           label: t('sl_notif_tipo_sla_proximo') },
    BADGE_APROVADO:        { ...TIPO_ICON_BG.BADGE_APROVADO,        label: t('sl_notif_tipo_badge_aprov') },
    CANDIDATURA_APROVADA:  { ...TIPO_ICON_BG.CANDIDATURA_APROVADA,  label: t('sl_notif_tipo_badge_aprov') },
    BADGE_REJEITADO:       { ...TIPO_ICON_BG.BADGE_REJEITADO,       label: t('sl_notif_tipo_badge_rejeit') },
    CANDIDATURA_REJEITADA: { ...TIPO_ICON_BG.CANDIDATURA_REJEITADA, label: t('sl_notif_tipo_badge_rejeit') },
    AVISO:                 { ...TIPO_ICON_BG.AVISO,                 label: t('sl_notif_tipo_aviso')       },
    SISTEMA:               { ...TIPO_ICON_BG.SISTEMA,               label: t('sl_notif_tipo_sistema')     },
    default:               { ...TIPO_ICON_BG.default,               label: t('sl_notif_tipo_geral')       },
  };
}

function formatarDataHora(dataStr) {
  if (!dataStr) return '—';
  const d = new Date(dataStr);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

/* ─── Item de notificação ───────────────────────────────────────────── */
function ItemNotificacao({ notif, onLer, onEliminar, onAbrir, temLink }) {
  const { t } = useLanguage();
  const TIPO_CONFIG = getTipoConfig(t);
  const cfg = TIPO_CONFIG[notif.tipo] || TIPO_CONFIG.default;
  const Icon = cfg.icon;

  return (
    <div className={`flex items-start gap-4 px-5 py-4 border-b border-slate-100 transition hover:bg-slate-50/60 ${!notif.lida ? 'bg-white' : 'bg-slate-50/30'}`}>
      {/* Ícone */}
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
        <Icon className="h-4 w-4 text-white" strokeWidth={1.8} />
      </div>

      {/* Conteúdo */}
      <div
        className={`flex-1 min-w-0 ${temLink ? 'cursor-pointer' : ''}`}
        onClick={temLink ? () => onAbrir(notif) : undefined}
        role={temLink ? 'button' : undefined}
      >
        <p className={`text-sm ${temLink ? 'hover:text-softinsa-600 transition' : ''} ${!notif.lida ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
          {notif.titulo}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{notif.mensagem}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[11px] text-slate-400">{formatarDataHora(notif.data_criacao)}</span>
          {!notif.lida && (
            <span className="inline-flex items-center rounded-full bg-softinsa-50 px-2 py-0.5 text-[10px] font-semibold text-softinsa-600">
              {t('sl_notif_nao_lida')}
            </span>
          )}
          {temLink && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-softinsa-600">
              {t('sl_notif_ver_detalhe')} <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </span>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        {!notif.lida && (
          <button
            type="button"
            onClick={() => onLer(notif.id_notificacao)}
            className="h-2.5 w-2.5 rounded-full bg-softinsa-500 hover:bg-softinsa-700 transition"
            title={t('sl_notif_marcar_lida')}
          />
        )}
        <button
          type="button"
          onClick={() => onEliminar(notif.id_notificacao)}
          className="text-slate-300 hover:text-rose-500 transition"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────── */
/* Determina o destino de uma notificação (deep-link para o conteúdo) */
function destinoNotif(n) {
  if (n.categoria === 'CANDIDATURA') {
    const m = `${n.mensagem || ''} ${n.titulo || ''}`.match(/#(\d+)/);
    if (m) return `/sl/pedidos/${m[1]}`;
  }
  return null;
}

export default function ServiceLineNotificacoes() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  const CATEGORIAS = [
    { valor: '',           label: t('sl_notif_todos_tipos')  },
    { valor: 'CANDIDATURA', label: t('sl_notif_candidatura') },
    { valor: 'BADGE',       label: t('sl_notif_badge')       },
    { valor: 'SISTEMA',     label: t('sl_notif_sistema')     },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['sl-notificacoes', filtroCategoria],
    queryFn: async () => {
      const params = { por_pagina: 100 };
      if (filtroCategoria) params.categoria = filtroCategoria;
      const { data } = await api.get('/api/notificacoes', { params });
      return data;
    },
    staleTime: 30_000,
  });

  const notificacoes = useMemo(() => {
    let lista = data?.dados || [];
    if (filtroDataInicio) {
      const inicio = new Date(filtroDataInicio);
      lista = lista.filter(n => new Date(n.data_criacao) >= inicio);
    }
    if (filtroDataFim) {
      const fim = new Date(filtroDataFim);
      fim.setHours(23, 59, 59);
      lista = lista.filter(n => new Date(n.data_criacao) <= fim);
    }
    return lista;
  }, [data, filtroDataInicio, filtroDataFim]);

  const mutLer = useMutation({
    mutationFn: (id) => api.post(`/api/notificacoes/${id}/ler`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sl-notificacoes'] });
      queryClient.invalidateQueries({ queryKey: TOPBAR_NOTIFICACOES_QUERY_KEY });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const mutLerTodas = useMutation({
    mutationFn: () => api.post('/api/notificacoes/ler-todas'),
    onSuccess: () => {
      toast.success(t('sl_notif_todas_lidas'));
      queryClient.invalidateQueries({ queryKey: ['sl-notificacoes'] });
      queryClient.invalidateQueries({ queryKey: TOPBAR_NOTIFICACOES_QUERY_KEY });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const mutEliminar = useMutation({
    mutationFn: (id) => api.delete(`/api/notificacoes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sl-notificacoes'] });
      queryClient.invalidateQueries({ queryKey: TOPBAR_NOTIFICACOES_QUERY_KEY });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  function abrirNotif(n) {
    const destino = destinoNotif(n);
    if (!n.lida) mutLer.mutate(n.id_notificacao);
    if (destino) navigate(destino);
  }

  function limparFiltros() {
    setFiltroCategoria('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
  }

  const temFiltros = filtroCategoria || filtroDataInicio || filtroDataFim;
  const naoLidas = data?.nao_lidas || 0;

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo={t('sl_notif_subtitulo')} />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8 space-y-4">

          {/* Filtros */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter className="h-4 w-4" strokeWidth={1.8} />
              {t('sl_notif_filtros')}
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_notif_tipo_label')}</label>
                <select
                  value={filtroCategoria}
                  onChange={e => setFiltroCategoria(e.target.value)}
                  className="input text-sm"
                >
                  {CATEGORIAS.map(c => (
                    <option key={c.valor} value={c.valor}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_notif_intervalo')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filtroDataInicio}
                    onChange={e => setFiltroDataInicio(e.target.value)}
                    className="input text-sm"
                  />
                  <span className="text-xs text-slate-400">{t('sl_notif_ate')}</span>
                  <input
                    type="date"
                    value={filtroDataFim}
                    onChange={e => setFiltroDataFim(e.target.value)}
                    className="input text-sm"
                  />
                </div>
              </div>
              {temFiltros && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                  {t('sl_notif_limpar')}
                </button>
              )}
            </div>
          </div>

          {/* Barra de ações */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => mutLerTodas.mutate()}
              disabled={mutLerTodas.isPending || naoLidas === 0}
              className="flex items-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2 text-xs font-semibold text-white hover:bg-softinsa-700 disabled:opacity-50 transition"
            >
              <CheckCheck className="h-4 w-4" strokeWidth={2} />
              {t('sl_notif_marcar_todas')}
              {naoLidas > 0 && (
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{naoLidas}</span>
              )}
            </button>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
              {t('sl_notif_email_info')}
              <button
                type="button"
                onClick={() => navigate('/sl/perfil#preferencias-notificacao')}
                className="font-semibold text-softinsa-600 hover:underline"
              >
                {t('sl_notif_gerir_prefs')}
              </button>
            </p>
          </div>

          {/* Lista */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-800">
                {t('sl_notif_lista_titulo')}
                {notificacoes.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-slate-400">({notificacoes.length})</span>
                )}
              </h2>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Carregando /></div>
            ) : notificacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                <Bell className="h-10 w-10 mb-3 opacity-30" strokeWidth={1.5} />
                <p className="text-sm font-medium">{t('sl_notif_sem')}</p>
                {temFiltros && (
                  <button onClick={limparFiltros} className="mt-2 text-xs text-softinsa-600 hover:underline">
                    {t('sl_notif_limpar_link')}
                  </button>
                )}
              </div>
            ) : (
              notificacoes.map(n => (
                <ItemNotificacao
                  key={n.id_notificacao}
                  notif={n}
                  onLer={(id) => mutLer.mutate(id)}
                  onEliminar={(id) => mutEliminar.mutate(id)}
                  onAbrir={abrirNotif}
                  temLink={!!destinoNotif(n)}
                />
              ))
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
