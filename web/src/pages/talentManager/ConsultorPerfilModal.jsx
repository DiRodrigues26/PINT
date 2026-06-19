import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, X, Download, Plus, Target, CheckCircle2, Circle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { useTM } from './i18n';

function formatarData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const ESTADO_OBJ = {
  PENDENTE:  { key: 'obj_pendente',  cls: 'bg-slate-100 text-slate-600', icon: Circle },
  EM_CURSO:  { key: 'obj_em_curso',  cls: 'bg-blue-100 text-blue-700',   icon: Clock },
  CONCLUIDO: { key: 'obj_concluido', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  CANCELADO: { key: 'obj_cancelado', cls: 'bg-rose-100 text-rose-600',   icon: X },
};

export default function ConsultorPerfilModal({ consultor, onFechar }) {
  const tt = useTM();
  const queryClient = useQueryClient();
  const id = consultor?.id_utilizador;
  const [mostrarForm, setMostrarForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);

  const { data, isLoading } = useQuery({
    queryKey: ['tm-consultor-badges', id],
    queryFn: async () => { const { data } = await api.get(`/api/badge-atribuido/consultor/${id}`); return data; },
    enabled: !!id,
  });
  const { data: tlData } = useQuery({
    queryKey: ['tm-timeline', id],
    queryFn: async () => { const { data } = await api.get(`/api/timeline?id_utilizador=${id}`); return data; },
    enabled: !!id,
  });

  const criarObjetivo = useMutation({
    mutationFn: (payload) => api.post('/api/timeline', { ...payload, id_utilizador: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tm-timeline', id] });
      toast.success(tt('novo_objetivo') + ' ✓');
      setMostrarForm(false); setTitulo(''); setDescricao(''); setDataFim('');
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const badges = data?.dados ?? [];
  const timeline = tlData?.dados ?? [];
  const nome = consultor?.nome || 'Consultor';
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');

  function descarregarCertificado(idBA, tituloBadge) {
    toast(tt('a_preparar_cert'), { icon: '📄' });
    api.get(`/api/badge-atribuido/${idBA}/certificado`, { responseType: 'blob' })
      .then(({ data }) => {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-${(tituloBadge || 'badge').replace(/\s+/g, '-')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error(tt('cert_erro')));
  }

  function submeterObjetivo() {
    if (!titulo.trim()) { toast.error(tt('objetivo_ph')); return; }
    criarObjetivo.mutate({ titulo: titulo.trim(), descricao: descricao.trim() || null, data_fim: dataFim || null, estado: 'PENDENTE' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onFechar}>
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{tt('perfil_consultor')}</h2>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Cabeçalho */}
          <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-[#eaf2fc] to-[#f4f9ff] p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-softinsa-600 text-lg font-bold text-white">{iniciais}</div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-900">{nome}</h3>
              <p className="text-sm text-slate-500">{tt('consultor_lbl')}{consultor?.nome_area ? ` · ${consultor.nome_area}` : ''}</p>
              {consultor?.email && <p className="truncate text-xs text-slate-400">{consultor.email}</p>}
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-softinsa-50 p-4 text-center">
              <p className="text-2xl font-bold text-softinsa-700">{consultor?.total_badges ?? badges.length}</p>
              <p className="mt-0.5 text-xs text-slate-500">{tt('col_badges_obtidos')}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{Number(consultor?.pontos_totais ?? 0).toLocaleString('pt-PT')}</p>
              <p className="mt-0.5 text-xs text-slate-500">{tt('col_pontos_totais')}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 text-center">
              <p className="text-sm font-bold leading-tight text-emerald-700">{consultor?.nome_service_line || '—'}</p>
              <p className="mt-1 text-xs text-slate-500">{tt('col_service_line')}</p>
            </div>
          </div>

          {/* Badges conquistados (com download de certificado) */}
          <div className="mt-5">
            <h4 className="text-sm font-bold text-slate-900">{tt('badges_conquistados')}</h4>
            {isLoading ? (
              <div className="flex justify-center py-8"><div className="h-7 w-7 animate-spin rounded-full border-4 border-softinsa-200 border-t-softinsa-600" /></div>
            ) : badges.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">{tt('sem_badges_consultor')}</p>
            ) : (
              <div className="mt-3 space-y-2">
                {badges.map(b => (
                  <div key={b.id_badge_atribuido} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-softinsa-100 text-softinsa-600"><Award className="h-5 w-5" strokeWidth={1.8} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{b.titulo}</p>
                      <p className="text-xs text-slate-400">{formatarData(b.data_atribuicao)}</p>
                    </div>
                    {Number(b.pontos) > 0 && <span className="shrink-0 text-sm font-bold text-softinsa-600">+{b.pontos}</span>}
                    <button type="button" onClick={() => descarregarCertificado(b.id_badge_atribuido, b.titulo)}
                      title={tt('descarregar_certificado')}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-softinsa-300 hover:text-softinsa-600">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline de evolução profissional (bónus TM) */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Target className="h-4 w-4 text-softinsa-600" /> {tt('timeline_evolucao')}</h4>
              {!mostrarForm && (
                <button type="button" onClick={() => setMostrarForm(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-softinsa-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-softinsa-700">
                  <Plus className="h-3.5 w-3.5" /> {tt('novo_objetivo')}
                </button>
              )}
            </div>

            {mostrarForm && (
              <div className="mt-3 space-y-2 rounded-xl border border-slate-200 p-4">
                <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder={tt('objetivo_ph')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400" autoFocus />
                <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder={tt('descricao_opcional')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400" />
                <div className="flex items-center gap-2">
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} title={tt('prazo_lbl')}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none focus:border-softinsa-400" />
                  <button type="button" onClick={submeterObjetivo} disabled={criarObjetivo.isPending}
                    className="rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-semibold text-white hover:bg-softinsa-700 disabled:opacity-60">{tt('adicionar')}</button>
                  <button type="button" onClick={() => setMostrarForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">{tt('cancelar')}</button>
                </div>
              </div>
            )}

            {timeline.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">{tt('sem_objetivos')}</p>
            ) : (
              <div className="mt-3 space-y-2">
                {timeline.map(o => {
                  const est = ESTADO_OBJ[o.estado] || ESTADO_OBJ.PENDENTE;
                  const Icon = est.icon;
                  return (
                    <div key={o.id_objetivo} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{o.titulo}</p>
                        {o.descricao && <p className="text-xs text-slate-500">{o.descricao}</p>}
                        {o.data_fim && <p className="mt-0.5 text-[11px] text-slate-400">{tt('prazo_lbl')}: {formatarData(o.data_fim)}</p>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${est.cls}`}>{tt(est.key)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
