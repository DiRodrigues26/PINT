import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { TalentManagerSidebar, TalentManagerTopbar } from '../../components/TalentManagerShell';
import Carregando from '../../components/Carregando';
import CandidaturaDetalheModal from './CandidaturaDetalheModal';
import { useTM } from './i18n';
import {
  NotificacaoItem,
  TOPBAR_NOTIFICACOES_QUERY_KEY,
  classificarNotificacao,
  grupoPeriodo,
} from '../../components/NotificacoesComuns';

const GRP_KEY = { HOJE: 'grp_hoje', 'ESTA SEMANA': 'grp_semana', ANTERIOR: 'grp_anterior' };

export default function TalentNotificacoes() {
  const tt = useTM();
  const queryClient = useQueryClient();
  const [fTipo, setFTipo] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fPeriodo, setFPeriodo] = useState('');
  const [modalCand, setModalCand] = useState(null);

  // ID da candidatura: do campo entidade (novo) ou extraído de "#123" no entidade/mensagem (antigos)
  function candidaturaId(n) {
    if (/^\d+$/.test(String(n.entidade_relacionada))) return Number(n.entidade_relacionada);
    const fromEnt = String(n.entidade_relacionada || '').match(/#(\d+)/);
    if (fromEnt) return Number(fromEnt[1]);
    const fromMsg = String(n.mensagem || '').match(/#(\d+)/);
    return fromMsg ? Number(fromMsg[1]) : null;
  }

  function abrirCandidatura(n) {
    const id = candidaturaId(n);
    if (!id) return;
    if (!n.lida) marcarLida.mutate(n.id_notificacao);
    setModalCand(id);
  }

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
      toast.success(tt('marcar_todas') + '.');
    },
  });

  const todas = data?.dados ?? [];
  const naoLidas = todas.filter(n => !n.lida).length;
  const temFiltros = fTipo || fStatus || fPeriodo;

  const lista = useMemo(() => {
    let resultado = todas;
    if (fTipo) resultado = resultado.filter(n => classificarNotificacao(n) === fTipo);
    if (fStatus === 'nao') resultado = resultado.filter(n => !n.lida);
    if (fStatus === 'lidas') resultado = resultado.filter(n => n.lida);
    if (fPeriodo) resultado = resultado.filter(n => grupoPeriodo(n.data_criacao) === fPeriodo);
    return resultado;
  }, [todas, fTipo, fStatus, fPeriodo]);

  const grupos = useMemo(() => {
    const agrupado = { HOJE: [], 'ESTA SEMANA': [], ANTERIOR: [] };
    for (const n of lista) agrupado[grupoPeriodo(n.data_criacao)]?.push(n);
    return agrupado;
  }, [lista]);

  function limparFiltros() {
    setFTipo('');
    setFStatus('');
    setFPeriodo('');
  }

  const filtrosTipo = [
    { valor: '', label: tt('todos_tipo') },
    { valor: 'CANDIDATURA', label: tt('nt_submissao') },
    { valor: 'BADGE', label: tt('aba_badges') },
    { valor: 'SLA', label: 'SLA' },
    { valor: 'SISTEMA', label: tt('nt_sistema') },
  ];
  const periodos = [
    { valor: '', label: tt('todos_periodo') },
    { valor: 'HOJE', label: tt('hoje') },
    { valor: 'ESTA SEMANA', label: tt('esta_semana') },
    { valor: 'ANTERIOR', label: tt('anterior') },
  ];

  function acaoNotificacao(n) {
    return candidaturaId(n)
      ? { label: tt('ver_candidatura_btn'), onClick: () => abrirCandidatura(n) }
      : null;
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      {modalCand && <CandidaturaDetalheModal idCandidatura={modalCand} onFechar={() => setModalCand(null)} />}
      <TalentManagerSidebar />
      <div className="lg:pl-[240px]">
        <TalentManagerTopbar titulo={tt('notif_titulo')} subtitulo={tt('notif_sub')} />

        <main className="px-5 py-8 lg:px-8 pb-24 lg:pb-10">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{tt('notif_titulo')}</h2>
            {naoLidas > 0 && <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-bold text-white">{naoLidas} {tt('novas')}</span>}
          </div>

          {/* Filtros */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><Filter className="h-4 w-4 text-slate-500" /> {tt('filtros')}</div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select value={fTipo} onChange={e => setFTipo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                {filtrosTipo.map(f => <option key={f.valor || 'todas'} value={f.valor}>{f.label}</option>)}
              </select>
              <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                <option value="">{tt('todas_status')}</option>
                <option value="nao">{tt('nao_lidas')}</option>
                <option value="lidas">{tt('lidas')}</option>
              </select>
              <select value={fPeriodo} onChange={e => setFPeriodo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                {periodos.map(p => <option key={p.valor || 'todos'} value={p.valor}>{p.label}</option>)}
              </select>
              {temFiltros && (
                <button type="button" onClick={limparFiltros}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">{tt('limpar_filtros')}</button>
              )}
              {naoLidas > 0 && (
                <button type="button" onClick={() => marcarTodas.mutate()}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <CheckCheck className="h-4 w-4" /> {tt('marcar_todas')}
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[30vh] items-center justify-center"><Carregando /></div>
          ) : lista.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <Bell className="h-14 w-14 text-slate-300" strokeWidth={1} />
              <p className="mt-4 text-base font-semibold text-slate-600">{tt('sem_notificacoes')}</p>
            </div>
          ) : (
            ['HOJE', 'ESTA SEMANA', 'ANTERIOR'].filter(k => grupos[k]?.length).map(k => (
              <div key={k} className="mt-6">
                <p className="text-xs font-bold tracking-wide text-slate-400">{tt(GRP_KEY[k])}</p>
                <div className="mt-3 space-y-3">
                  {grupos[k].map(n => (
                    <NotificacaoItem
                      key={n.id_notificacao}
                      notif={n}
                      onLer={(id) => marcarLida.mutate(id)}
                      acao={acaoNotificacao(n)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
