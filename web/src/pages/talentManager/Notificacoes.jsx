import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Filter, FileText, AlertCircle, CheckCircle, XCircle, Bell, Check, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { TalentManagerSidebar, TalentManagerTopbar } from '../../components/TalentManagerShell';
import Carregando from '../../components/Carregando';

const TOPBAR_NOTIFICACOES_QUERY_KEY = ['topbar-notificacoes-nao-lidas'];

/* Mapeia o tipo da notificação para categoria visual */
function tipoVisual(n) {
  const t = `${n.tipo || ''} ${n.categoria || ''}`.toUpperCase();
  if (t.includes('APROV')) return { key: 'APROVACAO', label: 'Aprovação', badge: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, icCor: 'text-emerald-500', borda: 'border-l-emerald-400' };
  if (t.includes('REJEIT') || t.includes('DEVOLV')) return { key: 'REJEICAO', label: 'Rejeição', badge: 'bg-rose-100 text-rose-600', icon: XCircle, icCor: 'text-rose-500', borda: 'border-l-rose-400' };
  if (t.includes('VALIDA') || t.includes('REVISAO') || t.includes('PENDENTE')) return { key: 'VALIDACAO', label: 'Em Validação', badge: 'bg-amber-100 text-amber-700', icon: AlertCircle, icCor: 'text-amber-500', borda: 'border-l-amber-400' };
  if (t.includes('SUBMET') || t.includes('NOVA') || t.includes('CANDIDATURA')) return { key: 'SUBMISSAO', label: 'Submissão', badge: 'bg-blue-100 text-blue-700', icon: FileText, icCor: 'text-blue-500', borda: 'border-l-blue-400' };
  return { key: 'SISTEMA', label: 'Sistema', badge: 'bg-slate-100 text-slate-600', icon: Bell, icCor: 'text-slate-400', borda: 'border-l-slate-300' };
}

function tempoRelativo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60_000), h = Math.floor(diff / 3_600_000), dias = Math.floor(diff / 86_400_000);
  if (min < 60) return `há ${min || 1} minuto${min !== 1 ? 's' : ''}`;
  if (h < 24) return `há ${h} hora${h !== 1 ? 's' : ''}`;
  if (dias === 1) return 'há 1 dia';
  return `há ${dias} dias`;
}

function grupoPeriodo(d) {
  const data = new Date(d); const hoje = new Date();
  const sameDay = data.toDateString() === hoje.toDateString();
  if (sameDay) return 'HOJE';
  const diff = (hoje - data) / 86_400_000;
  if (diff < 7) return 'ESTA SEMANA';
  return 'ANTERIOR';
}

export default function TalentNotificacoes() {
  const queryClient = useQueryClient();
  const [fTipo, setFTipo] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fPeriodo, setFPeriodo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tm-notificacoes'],
    queryFn: async () => { const { data } = await api.get('/api/notificacoes?por_pagina=100'); return data; },
    staleTime: 20_000,
  });

  const marcarLida = useMutation({
    mutationFn: (id) => api.post(`/api/notificacoes/${id}/ler`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-notificacoes'] });
      queryClient.invalidateQueries({ queryKey: ['tm-notif-nao-lidas'] });
      queryClient.invalidateQueries({ queryKey: TOPBAR_NOTIFICACOES_QUERY_KEY });
    },
  });
  const marcarTodas = useMutation({
    mutationFn: () => api.post('/api/notificacoes/ler-todas'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-notificacoes'] });
      queryClient.invalidateQueries({ queryKey: ['tm-notif-nao-lidas'] });
      queryClient.invalidateQueries({ queryKey: TOPBAR_NOTIFICACOES_QUERY_KEY });
      toast.success('Todas marcadas como lidas.');
    },
  });

  const todas = data?.dados ?? [];
  const naoLidas = todas.filter(n => !n.lida).length;

  const lista = useMemo(() => {
    let l = todas;
    if (fTipo) l = l.filter(n => tipoVisual(n).key === fTipo);
    if (fStatus === 'nao') l = l.filter(n => !n.lida);
    if (fStatus === 'lidas') l = l.filter(n => n.lida);
    if (fPeriodo) l = l.filter(n => grupoPeriodo(n.data_criacao) === fPeriodo);
    return l;
  }, [todas, fTipo, fStatus, fPeriodo]);

  const grupos = useMemo(() => {
    const g = { HOJE: [], 'ESTA SEMANA': [], ANTERIOR: [] };
    for (const n of lista) (g[grupoPeriodo(n.data_criacao)] ||= []).push(n);
    return g;
  }, [lista]);

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <TalentManagerSidebar />
      <div className="lg:pl-[240px]">
        <TalentManagerTopbar titulo="Notificações" subtitulo="Acompanhamento de eventos e atualizações do sistema" />

        <main className="px-5 py-8 lg:px-8 pb-24 lg:pb-10">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">Notificações</h2>
            {naoLidas > 0 && <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-bold text-white">{naoLidas} novas</span>}
          </div>

          {/* Filtros */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><Filter className="h-4 w-4 text-slate-500" /> Filtros</div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select value={fTipo} onChange={e => setFTipo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                <option value="">Todos os Tipo</option>
                <option value="SUBMISSAO">Submissão</option>
                <option value="VALIDACAO">Em Validação</option>
                <option value="APROVACAO">Aprovação</option>
                <option value="REJEICAO">Rejeição</option>
              </select>
              <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                <option value="">Todas</option>
                <option value="nao">Não lidas</option>
                <option value="lidas">Lidas</option>
              </select>
              <select value={fPeriodo} onChange={e => setFPeriodo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                <option value="">Todos os Período</option>
                <option value="HOJE">Hoje</option>
                <option value="ESTA SEMANA">Esta semana</option>
                <option value="ANTERIOR">Anterior</option>
              </select>
              {(fTipo || fStatus || fPeriodo) && (
                <button type="button" onClick={() => { setFTipo(''); setFStatus(''); setFPeriodo(''); }}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Limpar filtros</button>
              )}
              {naoLidas > 0 && (
                <button type="button" onClick={() => marcarTodas.mutate()}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <CheckCheck className="h-4 w-4" /> Marcar todas como lidas
                </button>
              )}
            </div>
          </div>

          {/* Lista agrupada */}
          {isLoading ? (
            <div className="flex min-h-[30vh] items-center justify-center"><Carregando /></div>
          ) : lista.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <Bell className="h-14 w-14 text-slate-300" strokeWidth={1} />
              <p className="mt-4 text-base font-semibold text-slate-600">Sem notificações</p>
            </div>
          ) : (
            ['HOJE', 'ESTA SEMANA', 'ANTERIOR'].filter(k => grupos[k]?.length).map(k => (
              <div key={k} className="mt-6">
                <p className="text-xs font-bold tracking-wide text-slate-400">{k}</p>
                <div className="mt-3 space-y-3">
                  {grupos[k].map(n => {
                    const v = tipoVisual(n);
                    const Icon = v.icon;
                    return (
                      <div key={n.id_notificacao}
                        className={`flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${!n.lida ? `border-l-4 ${v.borda}` : ''}`}>
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 ${v.icCor}`}>
                          <Icon className="h-5 w-5" strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                                {n.titulo}
                                {!n.lida && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}
                              </p>
                              {n.mensagem && <p className="mt-0.5 text-sm text-slate-500">{n.mensagem}</p>}
                              <p className="mt-1 text-xs text-slate-400">{tempoRelativo(n.data_criacao)}</p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${v.badge}`}>{v.label}</span>
                              {!n.lida && (
                                <button type="button" onClick={() => marcarLida.mutate(n.id_notificacao)}
                                  className="flex items-center gap-1 text-xs font-semibold text-softinsa-600 hover:underline">
                                  <Check className="h-3.5 w-3.5" /> Marcar como lida
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
