import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Filter, FileText, AlertCircle, CheckCircle, XCircle, Bell, Check, CheckCheck, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { TalentManagerSidebar, TalentManagerTopbar } from '../../components/TalentManagerShell';
import Carregando from '../../components/Carregando';
import CandidaturaDetalheModal from './CandidaturaDetalheModal';
import { useTM } from './i18n';

const TOPBAR_NOTIFICACOES_QUERY_KEY = ['topbar-notificacoes-nao-lidas'];

const NT_KEY = { APROVACAO: 'nt_aprovacao', REJEICAO: 'nt_rejeicao', VALIDACAO: 'nt_em_validacao', SUBMISSAO: 'nt_submissao', SISTEMA: 'nt_sistema' };

/* Mapeia o tipo da notificação para categoria visual */
function tipoVisual(n) {
  const t = `${n.tipo || ''} ${n.categoria || ''}`.toUpperCase();
  if (t.includes('APROV')) return { key: 'APROVACAO', badge: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, icCor: 'text-emerald-500', borda: 'border-l-emerald-400' };
  if (t.includes('REJEIT') || t.includes('DEVOLV')) return { key: 'REJEICAO', badge: 'bg-rose-100 text-rose-600', icon: XCircle, icCor: 'text-rose-500', borda: 'border-l-rose-400' };
  if (t.includes('VALIDA') || t.includes('REVISAO') || t.includes('PENDENTE')) return { key: 'VALIDACAO', badge: 'bg-amber-100 text-amber-700', icon: AlertCircle, icCor: 'text-amber-500', borda: 'border-l-amber-400' };
  if (t.includes('SUBMET') || t.includes('NOVA') || t.includes('CANDIDATURA')) return { key: 'SUBMISSAO', badge: 'bg-blue-100 text-blue-700', icon: FileText, icCor: 'text-blue-500', borda: 'border-l-blue-400' };
  return { key: 'SISTEMA', badge: 'bg-slate-100 text-slate-600', icon: Bell, icCor: 'text-slate-400', borda: 'border-l-slate-300' };
}

function tempoRelativo(d, tt) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60_000), h = Math.floor(diff / 3_600_000), dias = Math.floor(diff / 86_400_000);
  const ha = tt('ha');
  const pre = ha ? `${ha} ` : '';
  if (min < 60) { const v = min || 1; return `${pre}${v} ${v !== 1 ? tt('minutos') : tt('minuto')}`; }
  if (h < 24) return `${pre}${h} ${h !== 1 ? tt('horas') : tt('hora')}`;
  if (dias === 1) return `${pre}1 ${tt('dia')}`;
  return `${pre}${dias} ${tt('dias')}`;
}

function grupoPeriodo(d) {
  const data = new Date(d); const hoje = new Date();
  const sameDay = data.toDateString() === hoje.toDateString();
  if (sameDay) return 'HOJE';
  const diff = (hoje - data) / 86_400_000;
  if (diff < 7) return 'ESTA SEMANA';
  return 'ANTERIOR';
}

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
                <option value="">{tt('todos_tipo')}</option>
                <option value="SUBMISSAO">{tt('nt_submissao')}</option>
                <option value="VALIDACAO">{tt('nt_em_validacao')}</option>
                <option value="APROVACAO">{tt('nt_aprovacao')}</option>
                <option value="REJEICAO">{tt('nt_rejeicao')}</option>
              </select>
              <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                <option value="">{tt('todas_status')}</option>
                <option value="nao">{tt('nao_lidas')}</option>
                <option value="lidas">{tt('lidas')}</option>
              </select>
              <select value={fPeriodo} onChange={e => setFPeriodo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                <option value="">{tt('todos_periodo')}</option>
                <option value="HOJE">{tt('hoje')}</option>
                <option value="ESTA SEMANA">{tt('esta_semana')}</option>
                <option value="ANTERIOR">{tt('anterior')}</option>
              </select>
              {(fTipo || fStatus || fPeriodo) && (
                <button type="button" onClick={() => { setFTipo(''); setFStatus(''); setFPeriodo(''); }}
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

          {/* Lista agrupada */}
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
                              <p className="mt-1 text-xs text-slate-400">{tempoRelativo(n.data_criacao, tt)}</p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${v.badge}`}>{tt(NT_KEY[v.key])}</span>
                              {candidaturaId(n) && (
                                <button type="button" onClick={() => abrirCandidatura(n)}
                                  className="flex items-center gap-1 text-xs font-semibold text-softinsa-600 hover:underline">
                                  <Eye className="h-3.5 w-3.5" /> {tt('ver_candidatura_btn')}
                                </button>
                              )}
                              {!n.lida && (
                                <button type="button" onClick={() => marcarLida.mutate(n.id_notificacao)}
                                  className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:underline">
                                  <Check className="h-3.5 w-3.5" /> {tt('marcar_lida')}
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
