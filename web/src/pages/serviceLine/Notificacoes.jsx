import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Filter, Mail, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';
import { useLanguage } from '../../context/LanguageContext';
import {
  FILTROS_NOTIFICACOES,
  NotificacaoItem,
  TOPBAR_NOTIFICACOES_QUERY_KEY,
  classificarNotificacao,
} from '../../components/NotificacoesComuns';

function destinoNotif(n) {
  if (n.categoria === 'CANDIDATURA') {
    const m = `${n.mensagem || ''} ${n.titulo || ''}`.match(/#(\d+)/);
    if (m) return `/sl/pedidos/${m[1]}`;
  }
  return null;
}

function acaoNotificacao(n, navigate, t) {
  const destino = destinoNotif(n);
  if (!destino) return null;
  return { label: t('sl_notif_ver_detalhe'), onClick: () => navigate(destino) };
}

export default function ServiceLineNotificacoes() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sl-notificacoes'],
    queryFn: async () => {
      const { data } = await api.get('/api/notificacoes', { params: { por_pagina: 100 } });
      return data;
    },
    staleTime: 30_000,
  });

  const notificacoes = useMemo(() => {
    let lista = data?.dados || [];
    if (filtroCategoria) lista = lista.filter(n => classificarNotificacao(n) === filtroCategoria);
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
  }, [data, filtroCategoria, filtroDataInicio, filtroDataFim]);

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
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter className="h-4 w-4" strokeWidth={1.8} />
              {t('sl_notif_filtros')}
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t('sl_notif_tipo_label')}</label>
                <select
                  value={filtroCategoria}
                  onChange={e => setFiltroCategoria(e.target.value)}
                  className="input text-sm"
                >
                  {FILTROS_NOTIFICACOES.map(c => (
                    <option key={c.valor || 'todos'} value={c.valor}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t('sl_notif_intervalo')}</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <input
                    type="date"
                    value={filtroDataInicio}
                    onChange={e => setFiltroDataInicio(e.target.value)}
                    className="input text-sm"
                  />
                  <span className="text-center text-xs text-slate-400">{t('sl_notif_ate')}</span>
                  <input
                    type="date"
                    value={filtroDataFim}
                    onChange={e => setFiltroDataFim(e.target.value)}
                    className="input text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={limparFiltros}
                disabled={!temFiltros}
                className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
                {t('sl_notif_limpar')}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => mutLerTodas.mutate()}
              disabled={mutLerTodas.isPending || naoLidas === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-softinsa-700 disabled:opacity-50"
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

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="border-b border-slate-100 pb-3">
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
              <div className="mt-4 space-y-3">
                {notificacoes.map(n => (
                  <NotificacaoItem
                    key={n.id_notificacao}
                    notif={n}
                    onLer={(id) => mutLer.mutate(id)}
                    onEliminar={(id) => mutEliminar.mutate(id)}
                    acao={acaoNotificacao(n, navigate, t)}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
