import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Check, CheckCheck, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import {
  NotificacaoItem,
  TOPBAR_NOTIFICACOES_QUERY_KEY,
  classificarNotificacao,
} from '../../components/NotificacoesComuns';

function acaoNotificacao(notif, navigate) {
  const tipo = notif.tipo || '';
  const entidade = notif.entidade_relacionada;

  if ((tipo.includes('CANDIDATURA') || tipo.includes('EVIDENCIA')) && entidade) {
    return { label: 'Ver candidatura', onClick: () => navigate(`/candidaturas/${entidade}`) };
  }
  if (tipo === 'BADGE_EXPIRACAO') {
    return { label: 'Renovar badge', onClick: () => navigate('/meus-badges') };
  }
  if (tipo.includes('BADGE')) {
    return { label: 'Ver badge', onClick: () => navigate('/meus-badges') };
  }
  return null;
}

// TABS are built dynamically inside the component using t()

/* ─── Item de lembrete ──────────────────────────────────────────────────── */
function ItemLembrete({ lembrete, onToggle, onEliminar }) {
  const vencido = lembrete.data_limite && new Date(lembrete.data_limite) < new Date();
  const dias = lembrete.data_limite
    ? Math.ceil((new Date(lembrete.data_limite) - Date.now()) / 86_400_000)
    : null;

  return (
    <div className={`flex gap-4 rounded-xl border-l-4 bg-white p-5 shadow-sm ${
      lembrete.concluido ? 'border-l-emerald-400 opacity-70' : vencido ? 'border-l-red-400' : 'border-l-softinsa-400'
    } border border-slate-200`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
        lembrete.concluido ? 'bg-emerald-100' : vencido ? 'bg-red-100' : 'bg-softinsa-100'
      }`}>
        <BookOpen className={`h-5 w-5 ${lembrete.concluido ? 'text-emerald-600' : vencido ? 'text-red-500' : 'text-softinsa-600'}`} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold text-slate-800 ${lembrete.concluido ? 'line-through' : ''}`}>{lembrete.titulo}</p>
        {lembrete.descricao && <p className="mt-0.5 text-xs text-slate-500">{lembrete.descricao}</p>}
        {lembrete.data_limite && (
          <p className={`mt-1 text-xs font-semibold ${lembrete.concluido ? 'text-emerald-600' : vencido ? 'text-red-500' : dias <= 3 ? 'text-amber-600' : 'text-slate-400'}`}>
            {lembrete.concluido ? 'Concluído' : vencido ? 'Prazo ultrapassado' : dias === 0 ? 'Vence hoje' : `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-1.5">
        <button
          type="button"
          onClick={() => onToggle(lembrete)}
          title={lembrete.concluido ? 'Reabrir lembrete' : 'Marcar como concluído'}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
            lembrete.concluido
              ? 'border-slate-200 text-slate-400 hover:bg-slate-50'
              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
          }`}
        >
          {lembrete.concluido ? <RefreshCw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => onEliminar(lembrete.id_lembrete)}
          title="Eliminar lembrete"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Formulário de novo lembrete ───────────────────────────────────────── */
function FormLembrete({ onCriar, onCancelar, aPending }) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataLimite, setDataLimite] = useState('');

  function submeter(e) {
    e.preventDefault();
    if (!titulo.trim()) return;
    onCriar({ titulo: titulo.trim(), descricao: descricao.trim() || null, data_limite: dataLimite || null });
  }

  return (
    <form onSubmit={submeter} className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Título *</label>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex.: Concluir curso de AWS"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400" autoFocus />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Descrição</label>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes (opcional)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Data limite</label>
          <input type="date" value={dataLimite} onChange={e => setDataLimite(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={aPending || !titulo.trim()}
          className="rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700 disabled:opacity-60">
          {aPending ? 'A guardar...' : 'Criar lembrete'}
        </button>
        <button type="button" onClick={onCancelar}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function Notificacoes() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tabAtiva, setTabAtiva] = useState('');

  const TABS = [
    { key: '',            label: t('tab_todas') },
    { key: 'CANDIDATURA', label: t('tab_candidaturas') },
    { key: 'BADGE',       label: t('tab_badges') },
    { key: 'SISTEMA',     label: t('tab_sistema') },
    { key: 'LEMBRETES',   label: t('tab_lembretes') },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: async () => { const { data } = await api.get('/api/notificacoes'); return data; },
    staleTime: 30_000,
  });

  const { data: lembretesData, isLoading: loadLembretes } = useQuery({
    queryKey: ['lembretes'],
    queryFn: async () => { const { data } = await api.get('/api/lembretes'); return data; },
    staleTime: 60_000,
    enabled: tabAtiva === 'LEMBRETES' || tabAtiva === '',
  });

  const marcarLida = useMutation({
    mutationFn: (id) => api.post(`/api/notificacoes/${id}/ler`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      queryClient.invalidateQueries({ queryKey: TOPBAR_NOTIFICACOES_QUERY_KEY });
    },
  });

  const marcarTodas = useMutation({
    mutationFn: () => api.post('/api/notificacoes/ler-todas'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      queryClient.invalidateQueries({ queryKey: TOPBAR_NOTIFICACOES_QUERY_KEY });
      toast.success('Todas as notificações marcadas como lidas.');
    },
  });

  /* Gestão de lembretes (req 22) */
  const [mostrarFormLembrete, setMostrarFormLembrete] = useState(false);
  const criarLembrete = useMutation({
    mutationFn: (payload) => api.post('/api/lembretes', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lembretes'] }); toast.success('Lembrete criado.'); setMostrarFormLembrete(false); },
    onError: () => toast.error('Erro ao criar lembrete.'),
  });
  const toggleLembrete = useMutation({
    mutationFn: (l) => api.put(`/api/lembretes/${l.id_lembrete}`, { concluido: !l.concluido }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lembretes'] }),
    onError: () => toast.error('Erro ao atualizar lembrete.'),
  });
  const eliminarLembrete = useMutation({
    mutationFn: (id) => api.delete(`/api/lembretes/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['lembretes'] }); toast.success('Lembrete eliminado.'); },
    onError: () => toast.error('Erro ao eliminar lembrete.'),
  });

  const notificacoes = useMemo(() => {
    const lista = data?.dados ?? [];
    if (!tabAtiva) return lista;
    return lista.filter(n => {
      return classificarNotificacao(n) === tabAtiva || n.categoria === tabAtiva;
    });
  }, [data, tabAtiva]);

  const temNaoLidas = (data?.dados ?? []).some(n => !n.lida);

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <ConsultorSidebar />
      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo={t('sub_notificacoes')} />

        <main className="px-5 py-8 lg:px-10 pb-24 lg:pb-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t('titulo_notifs')}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {t('desc_notifs')}
              </p>
            </div>
            {temNaoLidas && (
              <button
                type="button"
                onClick={() => marcarTodas.mutate()}
                disabled={marcarTodas.isPending}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <CheckCheck className="h-4 w-4" strokeWidth={1.8} />
                {t('marcar_lidas')}
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-2">
            {TABS.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTabAtiva(t.key)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  tabAtiva === t.key
                    ? 'bg-softinsa-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Lista */}
          {/* Tab Lembretes (req 22) */}
          {tabAtiva === 'LEMBRETES' ? (
            <>
              {/* Cabeçalho com botão de novo lembrete */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">Lembretes pessoais para os teus objetivos de formação.</p>
                {!mostrarFormLembrete && (
                  <button
                    type="button"
                    onClick={() => setMostrarFormLembrete(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2} /> Novo lembrete
                  </button>
                )}
              </div>

              {mostrarFormLembrete && (
                <FormLembrete
                  onCriar={(payload) => criarLembrete.mutate(payload)}
                  onCancelar={() => setMostrarFormLembrete(false)}
                  aPending={criarLembrete.isPending}
                />
              )}

              {loadLembretes ? (
                <div className="flex min-h-[30vh] items-center justify-center"><Carregando /></div>
              ) : (lembretesData?.dados ?? []).length === 0 ? (
                <div className="mt-12 flex flex-col items-center text-center">
                  <BookOpen className="h-14 w-14 text-slate-300" strokeWidth={1} />
                  <p className="mt-4 text-base font-semibold text-slate-600">{t('sem_lembretes')}</p>
                  <p className="mt-1 text-sm text-slate-400">{t('sem_lembretes_desc')}</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {(lembretesData?.dados ?? []).map(l => (
                    <ItemLembrete
                      key={l.id_lembrete}
                      lembrete={l}
                      onToggle={(lem) => toggleLembrete.mutate(lem)}
                      onEliminar={(id) => eliminarLembrete.mutate(id)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center"><Carregando /></div>
          ) : notificacoes.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <Bell className="h-14 w-14 text-slate-300" strokeWidth={1} />
              <p className="mt-4 text-base font-semibold text-slate-600">{t('sem_notifs')}</p>
              <p className="mt-1 text-sm text-slate-400">{t('sem_notifs_desc')}</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {notificacoes.map(n => (
                <NotificacaoItem
                  key={n.id_notificacao}
                  notif={n}
                  onLer={(id) => marcarLida.mutate(id)}
                  acao={acaoNotificacao(n, navigate)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
