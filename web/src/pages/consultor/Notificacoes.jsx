import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Award, Bell, BookOpen, CheckCheck, Clock, FileText, RefreshCw, Settings, TriangleAlert } from 'lucide-react';
import { api } from '../../lib/api';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

function tempoRelativo(dataStr) {
  const diff = Date.now() - new Date(dataStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const horas = Math.floor(diff / 3_600_000);
  const dias = Math.floor(diff / 86_400_000);
  if (mins < 60) return `Há ${mins || 1} min`;
  if (horas < 24) return `Há ${horas} hora${horas > 1 ? 's' : ''}`;
  if (dias === 1) return 'Há 1 dia';
  return `Há ${dias} dias`;
}

/* Mapeia tipos/categorias de notificação para ícone + cor + categoria */
const TIPO_CONFIG = {
  CANDIDATURA_APROVADA:       { icon: Award,         bg: 'bg-emerald-500',    categoria: 'CANDIDATURA' },
  CANDIDATURA_REJEITADA:      { icon: TriangleAlert,  bg: 'bg-red-500',        categoria: 'CANDIDATURA' },
  CANDIDATURA_DEVOLVIDA:      { icon: RefreshCw,      bg: 'bg-orange-500',     categoria: 'CANDIDATURA' },
  CANDIDATURA_EM_REVISAO:     { icon: Clock,          bg: 'bg-amber-500',      categoria: 'CANDIDATURA' },
  BADGE_ATRIBUIDO:            { icon: Award,          bg: 'bg-emerald-500',    categoria: 'BADGE' },
  BADGE_EXPIRACAO:            { icon: TriangleAlert,  bg: 'bg-red-500',        categoria: 'BADGE' },
  BADGE_RECOMENDADO:          { icon: Award,          bg: 'bg-softinsa-500',   categoria: 'BADGE' },
  EVIDENCIA_RECEBIDA:         { icon: FileText,       bg: 'bg-blue-500',       categoria: 'CANDIDATURA' },
  SISTEMA:                    { icon: Settings,       bg: 'bg-purple-500',     categoria: 'SISTEMA' },
  default:                    { icon: Bell,           bg: 'bg-slate-500',      categoria: 'SISTEMA' },
};

function getCfg(tipo) {
  return TIPO_CONFIG[tipo] || TIPO_CONFIG.default;
}

/* Botão de ação por tipo */
function BotaoAcao({ tipo, entidade, navigate }) {
  if (!entidade) return null;
  if (tipo?.includes('CANDIDATURA') || tipo?.includes('EVIDENCIA')) {
    return (
      <button
        type="button"
        onClick={() => navigate(`/candidaturas/${entidade}`)}
        className="mt-3 flex items-center gap-1.5 rounded-lg bg-softinsa-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-softinsa-700 transition"
      >
        Ver Candidatura →
      </button>
    );
  }
  if (tipo?.includes('BADGE')) {
    return (
      <button
        type="button"
        onClick={() => navigate('/meus-badges')}
        className="mt-3 flex items-center gap-1.5 rounded-lg bg-softinsa-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-softinsa-700 transition"
      >
        Ver Badge →
      </button>
    );
  }
  if (tipo === 'BADGE_EXPIRACAO') {
    return (
      <button
        type="button"
        onClick={() => navigate('/meus-badges')}
        className="mt-3 flex items-center gap-1.5 rounded-lg bg-softinsa-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-softinsa-700 transition"
      >
        Renovar Badge →
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => navigate('/badges')}
      className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
    >
      Ver Detalhes →
    </button>
  );
}

function ItemNotificacao({ notif, onLer }) {
  const navigate = useNavigate();
  const cfg = getCfg(notif.tipo);
  const Icon = cfg.icon;

  return (
    <div
      className={`flex gap-4 rounded-xl border border-l-4 bg-white p-5 shadow-sm transition ${
        notif.lida ? 'border-slate-200 border-l-slate-200 opacity-80' : `border-slate-200 ${cfg.bg.replace('bg-', 'border-l-')}`
      }`}
      onClick={() => !notif.lida && onLer(notif.id_notificacao)}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
        <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-slate-800">{notif.titulo}</p>
          <div className="flex shrink-0 items-center gap-2">
            {!notif.lida && (
              <span className="rounded-full bg-softinsa-600 px-2 py-0.5 text-[10px] font-bold text-white">NOVO</span>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
              {tempoRelativo(notif.data_criacao)}
            </span>
          </div>
        </div>
        {notif.mensagem && <p className="mt-0.5 text-xs text-slate-500">{notif.mensagem}</p>}
        <BotaoAcao tipo={notif.tipo} entidade={notif.entidade_relacionada} navigate={navigate} />
      </div>
    </div>
  );
}

// TABS are built dynamically inside the component using t()

/* ─── Item de lembrete ──────────────────────────────────────────────────── */
function ItemLembrete({ lembrete }) {
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
        <p className="text-sm font-bold text-slate-800">{lembrete.titulo}</p>
        {lembrete.descricao && <p className="mt-0.5 text-xs text-slate-500">{lembrete.descricao}</p>}
        {lembrete.data_limite && (
          <p className={`mt-1 text-xs font-semibold ${vencido ? 'text-red-500' : dias <= 3 ? 'text-amber-600' : 'text-slate-400'}`}>
            {vencido ? 'Prazo ultrapassado' : dias === 0 ? 'Vence hoje' : `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>
      {lembrete.concluido && (
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-600">
          <CheckCheck className="h-4 w-4" /> Concluído
        </span>
      )}
    </div>
  );
}

export default function Notificacoes() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const marcarTodas = useMutation({
    mutationFn: () => api.post('/api/notificacoes/ler-todas'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      toast.success('Todas as notificações marcadas como lidas.');
    },
  });

  const notificacoes = useMemo(() => {
    const lista = data?.dados ?? [];
    if (!tabAtiva) return lista;
    return lista.filter(n => {
      const cfg = getCfg(n.tipo);
      return cfg.categoria === tabAtiva || n.categoria === tabAtiva;
    });
  }, [data, tabAtiva]);

  const temNaoLidas = (data?.dados ?? []).some(n => !n.lida);

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <ConsultorSidebar />
      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo="Notificações" />

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
            loadLembretes ? (
              <div className="flex min-h-[40vh] items-center justify-center"><Carregando /></div>
            ) : (lembretesData?.dados ?? []).length === 0 ? (
              <div className="mt-16 flex flex-col items-center text-center">
                <BookOpen className="h-14 w-14 text-slate-300" strokeWidth={1} />
                <p className="mt-4 text-base font-semibold text-slate-600">{t('sem_lembretes')}</p>
                <p className="mt-1 text-sm text-slate-400">{t('sem_lembretes_desc')}</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {(lembretesData?.dados ?? []).map(l => <ItemLembrete key={l.id_lembrete} lembrete={l} />)}
              </div>
            )
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
                <ItemNotificacao key={n.id_notificacao} notif={n} onLer={(id) => marcarLida.mutate(id)} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
