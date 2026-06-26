import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
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
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: async () => { const { data } = await api.get('/api/notificacoes'); return data; },
    staleTime: 30_000,
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
          {isLoading ? (
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
