import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, TriangleAlert, CheckCircle, XCircle, Bell,
  CheckCheck, Trash2, Mail, Filter, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';

/* ─── Mapeamento tipo → ícone + cor ────────────────────────────────── */
const TIPO_CONFIG = {
  NOVO_PEDIDO:             { icon: FileText,       bg: 'bg-blue-500',     label: 'Novo Pedido' },
  PEDIDO_VALIDACAO:        { icon: FileText,       bg: 'bg-blue-500',     label: 'Pedido em Validação' },
  SLA_LIMITE:              { icon: TriangleAlert,  bg: 'bg-amber-500',    label: 'SLA Limite' },
  SLA_PROXIMO:             { icon: TriangleAlert,  bg: 'bg-amber-500',    label: 'SLA Próximo' },
  BADGE_APROVADO:          { icon: CheckCircle,    bg: 'bg-emerald-500',  label: 'Badge Aprovado' },
  CANDIDATURA_APROVADA:    { icon: CheckCircle,    bg: 'bg-emerald-500',  label: 'Badge Aprovado' },
  BADGE_REJEITADO:         { icon: XCircle,        bg: 'bg-rose-500',     label: 'Badge Rejeitado' },
  CANDIDATURA_REJEITADA:   { icon: XCircle,        bg: 'bg-rose-500',     label: 'Badge Rejeitado' },
  AVISO:                   { icon: Bell,           bg: 'bg-slate-400',    label: 'Aviso' },
  SISTEMA:                 { icon: Bell,           bg: 'bg-slate-400',    label: 'Sistema' },
  default:                 { icon: Bell,           bg: 'bg-slate-400',    label: 'Geral' },
};

function getCfg(tipo) {
  return TIPO_CONFIG[tipo] || TIPO_CONFIG.default;
}

function formatarDataHora(dataStr) {
  if (!dataStr) return '—';
  const d = new Date(dataStr);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

const CATEGORIAS = [
  { valor: '', label: 'Todos os Tipos' },
  { valor: 'CANDIDATURA', label: 'Candidatura' },
  { valor: 'BADGE',       label: 'Badge' },
  { valor: 'SISTEMA',     label: 'Sistema' },
];

/* ─── Item de notificação ───────────────────────────────────────────── */
function ItemNotificacao({ notif, onLer, onEliminar }) {
  const cfg = getCfg(notif.tipo);
  const Icon = cfg.icon;

  return (
    <div className={`flex items-start gap-4 px-5 py-4 border-b border-slate-100 transition hover:bg-slate-50/60 ${!notif.lida ? 'bg-white' : 'bg-slate-50/30'}`}>
      {/* Ícone */}
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
        <Icon className="h-4 w-4 text-white" strokeWidth={1.8} />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${!notif.lida ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
          {notif.titulo}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{notif.mensagem}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[11px] text-slate-400">{formatarDataHora(notif.data_criacao)}</span>
          {!notif.lida && (
            <span className="inline-flex items-center rounded-full bg-softinsa-50 px-2 py-0.5 text-[10px] font-semibold text-softinsa-600">
              Não Lida
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
            title="Marcar como lida"
          />
        )}
        <button
          type="button"
          onClick={() => onEliminar(notif.id_notificacao)}
          className="text-slate-300 hover:text-rose-500 transition"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────── */
export default function ServiceLineNotificacoes() {
  const queryClient = useQueryClient();
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sl-notificacoes'] }),
    onError: (err) => toast.error(extrairErro(err)),
  });

  const mutLerTodas = useMutation({
    mutationFn: () => api.post('/api/notificacoes/ler-todas'),
    onSuccess: () => {
      toast.success('Todas as notificações marcadas como lidas.');
      queryClient.invalidateQueries({ queryKey: ['sl-notificacoes'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const mutEliminar = useMutation({
    mutationFn: (id) => api.delete(`/api/notificacoes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sl-notificacoes'] }),
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
        <ServiceLineTopbar subtitulo="Alertas e Atualizações da Service Line" />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8 space-y-4">

          {/* Filtros */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter className="h-4 w-4" strokeWidth={1.8} />
              Filtros
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Notificação</label>
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
                <label className="block text-xs font-medium text-slate-500 mb-1">Intervalo de Datas</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filtroDataInicio}
                    onChange={e => setFiltroDataInicio(e.target.value)}
                    className="input text-sm"
                  />
                  <span className="text-xs text-slate-400">até</span>
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
                  Limpar Filtros
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
              Marcar Todas como Lidas
              {naoLidas > 0 && (
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{naoLidas}</span>
              )}
            </button>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
              Notificações também enviadas por email, conforme preferências do utilizador.
            </p>
          </div>

          {/* Lista */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-800">
                Lista de Notificações
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
                <p className="text-sm font-medium">Sem notificações</p>
                {temFiltros && (
                  <button onClick={limparFiltros} className="mt-2 text-xs text-softinsa-600 hover:underline">
                    Limpar filtros
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
                />
              ))
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
