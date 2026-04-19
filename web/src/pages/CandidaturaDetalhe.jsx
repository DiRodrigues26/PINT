import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../lib/api';
import Carregando from '../components/Carregando';
import { estadoCandidatura, formatarDataHora } from '../lib/formatar';
import { useAuth } from '../context/AuthContext';

export default function CandidaturaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { temPerfil } = useAuth();

  const [comentario, setComentario] = useState('');
  const [requisitoSelecionado, setRequisitoSelecionado] = useState('');
  const inputFicheiro = useRef(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['candidatura', id],
    queryFn: async () => (await api.get(`/api/candidaturas/${id}`)).data,
  });

  const submeter = useMutation({
    mutationFn: async () => (await api.post(`/api/candidaturas/${id}/submeter`)).data,
    onSuccess: () => { toast.success('Candidatura submetida.'); refetch(); qc.invalidateQueries({ queryKey: ['candidaturas'] }); },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const cancelar = useMutation({
    mutationFn: async () => (await api.post(`/api/candidaturas/${id}/cancelar`)).data,
    onSuccess: () => { toast.success('Candidatura cancelada.'); qc.invalidateQueries({ queryKey: ['candidaturas'] }); navigate('/candidaturas'); },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const avaliarTalent = useMutation({
    mutationFn: async (decisao) =>
      (await api.post(`/api/candidaturas/${id}/avaliar-talent`, { decisao, comentario })).data,
    onSuccess: () => { toast.success('Avaliação registada.'); setComentario(''); refetch(); },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const avaliarSL = useMutation({
    mutationFn: async (decisao) =>
      (await api.post(`/api/candidaturas/${id}/avaliar-service-line`, { decisao, comentario })).data,
    onSuccess: () => { toast.success('Decisão registada.'); setComentario(''); refetch(); },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const removerEvidencia = useMutation({
    mutationFn: async (idEvidencia) => (await api.delete(`/api/candidaturas/${id}/evidencias/${idEvidencia}`)).data,
    onSuccess: () => { toast.success('Evidência removida.'); refetch(); },
    onError: (err) => toast.error(extrairErro(err)),
  });

  async function enviarEvidencia(e) {
    e.preventDefault();
    const ficheiro = inputFicheiro.current?.files?.[0];
    if (!ficheiro) return toast.error('Seleciona um ficheiro.');
    if (!requisitoSelecionado) return toast.error('Seleciona o requisito.');
    const fd = new FormData();
    fd.append('ficheiro', ficheiro);
    fd.append('id_requisito', requisitoSelecionado);
    try {
      await api.post(`/api/candidaturas/${id}/evidencias`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Evidência carregada.');
      inputFicheiro.current.value = '';
      setRequisitoSelecionado('');
      refetch();
    } catch (err) {
      toast.error(extrairErro(err));
    }
  }

  if (isLoading) return <Carregando />;
  if (!data?.candidatura) return <div>Candidatura não encontrada.</div>;

  const { candidatura, requisitos = [], evidencias = [], avaliacoes = [], historico = [] } = data;
  const info = estadoCandidatura(candidatura.estado_atual);

  const podeEditarEvidencias = ['OPEN', 'SENT_BACK'].includes(candidatura.estado_atual);
  const podeSubmeter = ['OPEN', 'SENT_BACK'].includes(candidatura.estado_atual);
  const podeCancelar = !['APPROVED', 'REJECTED', 'CLOSED'].includes(candidatura.estado_atual);
  const podeAvaliarTalent = temPerfil('Talent Manager', 'Administrador') && ['SUBMITTED', 'IN_TALENT_REVIEW'].includes(candidatura.estado_atual);
  const podeAvaliarSL = temPerfil('Service Line', 'Administrador') && candidatura.estado_atual === 'IN_SERVICE_LINE_REVIEW';

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-900">← Voltar</button>

      <header className="card">
        <div className="card-body">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{candidatura.titulo_badge}</h1>
              <div className="text-sm text-slate-500 mt-1">
                Candidatura #{candidatura.id_candidatura} · {candidatura.nome_consultor}
              </div>
            </div>
            <span className={`badge-pill text-sm ${info.cor}`}>{info.label}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {podeSubmeter && (
              <button className="btn-primary" disabled={submeter.isPending} onClick={() => submeter.mutate()}>
                {submeter.isPending ? 'A submeter…' : 'Submeter para análise'}
              </button>
            )}
            {podeCancelar && (
              <button className="btn-danger" disabled={cancelar.isPending} onClick={() => {
                if (confirm('Tens a certeza que queres cancelar esta candidatura?')) cancelar.mutate();
              }}>
                Cancelar candidatura
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="card">
        <div className="card-body">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Evidências</h2>

          {podeEditarEvidencias && (
            <form onSubmit={enviarEvidencia} className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <div className="sm:col-span-1">
                <label className="label">Requisito</label>
                <select className="input" value={requisitoSelecionado} onChange={(e) => setRequisitoSelecionado(e.target.value)}>
                  <option value="">—</option>
                  {requisitos.map((r) => (
                    <option key={r.id_requisito} value={r.id_requisito}>{r.titulo}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="label">Ficheiro</label>
                <input ref={inputFicheiro} type="file" className="input" />
              </div>
              <button className="btn-primary">Carregar</button>
            </form>
          )}

          <ul className="mt-4 divide-y">
            {evidencias.map((ev) => (
              <li key={ev.id_evidencia} className="py-3 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{ev.nome_original || ev.ficheiro_url}</div>
                  <div className="text-xs text-slate-500">
                    Requisito: {ev.titulo_requisito || '—'} · {formatarDataHora(ev.data_upload)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {ev.ficheiro_url && (
                    <a href={ev.ficheiro_url} target="_blank" rel="noreferrer" className="text-softinsa-600 hover:underline">
                      Abrir
                    </a>
                  )}
                  {podeEditarEvidencias && (
                    <button className="text-rose-600 hover:underline" onClick={() => removerEvidencia.mutate(ev.id_evidencia)}>
                      Remover
                    </button>
                  )}
                </div>
              </li>
            ))}
            {evidencias.length === 0 && (
              <li className="py-6 text-center text-slate-500">Ainda não foram carregadas evidências.</li>
            )}
          </ul>
        </div>
      </section>

      {(podeAvaliarTalent || podeAvaliarSL) && (
        <section className="card">
          <div className="card-body space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Avaliação</h2>
            <textarea
              className="input"
              rows={3}
              placeholder="Comentário (opcional)"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
            {podeAvaliarTalent && (
              <div className="flex gap-2">
                <button className="btn-primary" disabled={avaliarTalent.isPending} onClick={() => avaliarTalent.mutate('CORRETO')}>
                  Encaminhar para Service Line
                </button>
                <button className="btn-danger" disabled={avaliarTalent.isPending} onClick={() => avaliarTalent.mutate('INCORRETO')}>
                  Devolver ao consultor
                </button>
              </div>
            )}
            {podeAvaliarSL && (
              <div className="flex gap-2 flex-wrap">
                <button className="btn-primary" disabled={avaliarSL.isPending} onClick={() => avaliarSL.mutate('APROVAR')}>
                  Aprovar e emitir badge
                </button>
                <button className="btn-secondary" disabled={avaliarSL.isPending} onClick={() => avaliarSL.mutate('SEND_BACK')}>
                  Devolver ao consultor
                </button>
                <button className="btn-danger" disabled={avaliarSL.isPending} onClick={() => avaliarSL.mutate('REJEITAR')}>
                  Rejeitar
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {avaliacoes.length > 0 && (
        <section className="card">
          <div className="card-body">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Avaliações</h2>
            <ul className="mt-3 divide-y">
              {avaliacoes.map((a) => (
                <li key={a.id_avaliacao} className="py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{a.nome_avaliador || 'Avaliador'}</span>
                    <span className="text-xs text-slate-500">{formatarDataHora(a.data_avaliacao)}</span>
                  </div>
                  <div className="text-slate-600">
                    <span className="badge-pill bg-slate-100 text-slate-700 mr-2">{a.etapa}</span>
                    <span className="badge-pill bg-softinsa-100 text-softinsa-800">{a.decisao}</span>
                  </div>
                  {a.comentario && <p className="mt-2 text-slate-700">{a.comentario}</p>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {historico.length > 0 && (
        <section className="card">
          <div className="card-body">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Histórico</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {historico.map((h) => (
                <li key={h.id_historico} className="flex items-center justify-between">
                  <span>
                    <span className="text-slate-500">{h.estado_anterior || '—'}</span>
                    <span className="mx-2">→</span>
                    <span className="font-semibold">{h.estado_novo}</span>
                  </span>
                  <span className="text-xs text-slate-500">{formatarDataHora(h.data_alteracao)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
