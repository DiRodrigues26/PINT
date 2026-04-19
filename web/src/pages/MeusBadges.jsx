import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../lib/api';
import Carregando from '../components/Carregando';
import { formatarData } from '../lib/formatar';

export default function MeusBadges() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['meus-badges'],
    queryFn: async () => (await api.get('/api/badges-atribuidos/meus')).data,
  });

  const publicar = useMutation({
    mutationFn: async (id) => (await api.post(`/api/badges-atribuidos/${id}/publicar`)).data,
    onSuccess: () => { toast.success('Badge publicado.'); qc.invalidateQueries({ queryKey: ['meus-badges'] }); },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const despublicar = useMutation({
    mutationFn: async (id) => (await api.post(`/api/badges-atribuidos/${id}/despublicar`)).data,
    onSuccess: () => { toast.success('Badge despublicado.'); qc.invalidateQueries({ queryKey: ['meus-badges'] }); },
    onError: (err) => toast.error(extrairErro(err)),
  });

  if (isLoading) return <Carregando />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Os meus badges</h1>
        <p className="text-sm text-slate-500">Partilha os badges que conquistaste.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data?.dados || []).map((b) => (
          <div key={b.id_badge_atribuido} className="card">
            <div className="card-body">
              <div className="flex items-start gap-3">
                {b.imagem_url ? (
                  <img src={b.imagem_url} alt="" className="w-16 h-16 object-cover rounded-lg" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-softinsa-100 flex items-center justify-center text-3xl">🏅</div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold truncate">{b.titulo}</div>
                  <div className="text-xs text-slate-500">Obtido a {formatarData(b.data_atribuicao)}</div>
                  {b.data_expiracao && (
                    <div className="text-xs text-amber-600 mt-1">Expira em {formatarData(b.data_expiracao)}</div>
                  )}
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-500 break-all">
                Código: <span className="font-mono">{b.codigo_publico}</span>
              </div>

              <div className="mt-4 flex gap-2">
                {b.publicado ? (
                  <>
                    <a href={b.url_publica} target="_blank" rel="noreferrer" className="btn-secondary flex-1">
                      Ver público
                    </a>
                    <button onClick={() => despublicar.mutate(b.id_badge_atribuido)} className="btn-danger">
                      Despublicar
                    </button>
                  </>
                ) : (
                  <button className="btn-primary flex-1" onClick={() => publicar.mutate(b.id_badge_atribuido)}>
                    Publicar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {data?.dados?.length === 0 && (
          <div className="col-span-full text-center text-sm text-slate-500 py-12">
            Ainda não tens badges. Consulta o catálogo e candidata-te.
          </div>
        )}
      </div>
    </div>
  );
}
