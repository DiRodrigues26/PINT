import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../lib/api';
import Carregando from '../components/Carregando';

export default function BadgeDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['badge', id],
    queryFn: async () => (await api.get(`/api/badges/${id}`)).data,
  });

  const candidatar = useMutation({
    mutationFn: async () => (await api.post('/api/candidaturas', { id_badge: Number(id) })).data,
    onSuccess: (resp) => {
      toast.success('Candidatura criada! Submete evidências no detalhe.');
      qc.invalidateQueries({ queryKey: ['candidaturas'] });
      navigate(`/candidaturas/${resp.id_candidatura}`);
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  if (isLoading) return <Carregando />;
  if (!data?.badge) return <div>Badge não encontrado.</div>;

  const { badge, requisitos } = data;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-900">← Voltar</button>

      <div className="card">
        <div className="card-body flex items-start gap-6">
          {badge.imagem_url ? (
            <img src={badge.imagem_url} alt="" className="w-28 h-28 object-cover rounded-xl" />
          ) : (
            <div className="w-28 h-28 rounded-xl bg-softinsa-100 flex items-center justify-center text-5xl">🏅</div>
          )}

          <div className="flex-1">
            <h1 className="text-2xl font-bold">{badge.titulo}</h1>
            <div className="text-sm text-slate-500 mt-1">
              {badge.nome_learning_path} › {badge.nome_service_line} › {badge.nome_area} · {badge.codigo_nivel}
            </div>
            {badge.descricao && <p className="mt-3 text-slate-700">{badge.descricao}</p>}
            <div className="mt-4 flex items-center gap-3">
              <span className="badge-pill bg-softinsa-100 text-softinsa-800">{badge.pontos ?? 0} pts</span>
              {badge.tem_expiracao ? (
                <span className="badge-pill bg-amber-100 text-amber-800">Expira em {badge.validade_dias} dias</span>
              ) : (
                <span className="badge-pill bg-slate-100 text-slate-700">Sem expiração</span>
              )}
              <button
                className="btn-primary ml-auto"
                disabled={candidatar.isPending}
                onClick={() => candidatar.mutate()}
              >
                {candidatar.isPending ? 'A submeter…' : 'Candidatar-me'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Requisitos</h2>
          <ol className="mt-3 space-y-3 list-decimal list-inside text-sm">
            {(requisitos || []).map((r) => (
              <li key={r.id_requisito}>
                <span className="font-semibold">{r.titulo}</span>
                {r.descricao && <p className="text-slate-600 ml-6">{r.descricao}</p>}
                {r.tipo_evidencia && (
                  <span className="ml-2 badge-pill bg-slate-100 text-slate-700 text-xs">
                    {r.tipo_evidencia}
                  </span>
                )}
              </li>
            ))}
            {!requisitos?.length && <p className="text-slate-500">Sem requisitos definidos.</p>}
          </ol>
        </div>
      </div>
    </div>
  );
}
