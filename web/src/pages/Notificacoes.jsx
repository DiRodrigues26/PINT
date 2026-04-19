import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../lib/api';
import Carregando from '../components/Carregando';
import { formatarDataHora } from '../lib/formatar';

export default function Notificacoes() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: async () => (await api.get('/api/notificacoes')).data,
  });

  const marcar = useMutation({
    mutationFn: async (id) => (await api.post(`/api/notificacoes/${id}/marcar-lida`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
    onError: (err) => toast.error(extrairErro(err)),
  });

  const marcarTodas = useMutation({
    mutationFn: async () => (await api.post('/api/notificacoes/marcar-todas-lidas')).data,
    onSuccess: () => { toast.success('Todas marcadas como lidas.'); qc.invalidateQueries({ queryKey: ['notificacoes'] }); },
  });

  if (isLoading) return <Carregando />;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificações</h1>
          <p className="text-sm text-slate-500">{data?.nao_lidas ?? 0} por ler</p>
        </div>
        <button className="btn-secondary" onClick={() => marcarTodas.mutate()} disabled={!data?.nao_lidas}>
          Marcar todas como lidas
        </button>
      </header>

      <div className="card overflow-hidden">
        <ul className="divide-y">
          {(data?.dados || []).map((n) => (
            <li key={n.id_notificacao} className={`p-4 flex items-start justify-between gap-4 ${!n.lida ? 'bg-softinsa-50' : ''}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{n.titulo}</span>
                  {n.categoria && <span className="badge-pill bg-slate-100 text-slate-700 text-xs">{n.categoria}</span>}
                </div>
                <p className="text-sm text-slate-700 mt-1">{n.mensagem}</p>
                <p className="text-xs text-slate-500 mt-1">{formatarDataHora(n.data_criacao)}</p>
              </div>
              {!n.lida && (
                <button className="text-xs text-softinsa-600 hover:underline" onClick={() => marcar.mutate(n.id_notificacao)}>
                  Marcar lida
                </button>
              )}
            </li>
          ))}
          {data?.dados?.length === 0 && (
            <li className="p-12 text-center text-slate-500">Sem notificações.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
