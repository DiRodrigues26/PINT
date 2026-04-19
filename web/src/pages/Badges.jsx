import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Carregando from '../components/Carregando';

export default function Badges() {
  const [pesquisa, setPesquisa] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['badges', pesquisa],
    queryFn: async () => (await api.get('/api/badges', { params: { pesquisa: pesquisa || undefined, ativo: 1 } })).data,
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de badges</h1>
          <p className="text-sm text-slate-500">Descobre os badges disponíveis e candidata-te aos que dominas.</p>
        </div>
        <input
          type="search"
          placeholder="Pesquisar badges…"
          className="input max-w-xs"
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
        />
      </header>

      {isLoading ? (
        <Carregando />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.dados || []).map((b) => (
            <Link key={b.id_badge} to={`/badges/${b.id_badge}`} className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  {b.imagem_url ? (
                    <img src={b.imagem_url} alt="" className="w-14 h-14 object-cover rounded-lg" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-softinsa-100 flex items-center justify-center text-2xl">🏅</div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{b.titulo}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {b.codigo_nivel} · {b.nome_area || '—'}
                    </div>
                  </div>
                </div>
                {b.descricao && <p className="mt-3 text-sm text-slate-600 line-clamp-3">{b.descricao}</p>}
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="badge-pill bg-softinsa-100 text-softinsa-800">{b.pontos ?? 0} pts</span>
                  {b.is_conquista_especial ? (
                    <span className="badge-pill bg-amber-100 text-amber-800">Especial</span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
          {data?.dados?.length === 0 && (
            <div className="col-span-full text-center text-sm text-slate-500 py-12">
              Nenhum badge encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
