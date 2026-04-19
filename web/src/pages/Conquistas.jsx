import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import Carregando from '../components/Carregando';

export default function Conquistas() {
  const { data, isLoading } = useQuery({
    queryKey: ['conquistas', 'progresso'],
    queryFn: async () => (await api.get('/api/conquistas/progresso')).data,
  });

  if (isLoading) return <Carregando />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Conquistas</h1>
        <p className="text-sm text-slate-500">Objetivos extra que desbloqueias ao longo do percurso.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(data?.dados || []).map((c) => {
          const pct = Math.min(100, Number(c.percentagem) || 0);
          return (
            <div key={c.id_conquista} className={`card ${c.obtida ? 'border-emerald-300' : ''}`}>
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{c.titulo}</h3>
                    <p className="text-sm text-slate-600 mt-1">{c.descricao}</p>
                  </div>
                  {c.obtida && <span className="badge-pill bg-emerald-100 text-emerald-800">Conquistada</span>}
                </div>
                <div className="mt-3">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-2 ${c.obtida ? 'bg-emerald-500' : 'bg-softinsa-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {c.progresso_atual ?? 0} / {c.progresso_objetivo ?? 0} ({pct.toFixed(0)}%)
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {data?.dados?.length === 0 && (
          <div className="col-span-full text-center text-sm text-slate-500 py-12">Sem conquistas configuradas.</div>
        )}
      </div>
    </div>
  );
}
