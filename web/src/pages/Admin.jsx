import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import Carregando from '../components/Carregando';
import { formatarData } from '../lib/formatar';

export default function Admin() {
  const [pesquisa, setPesquisa] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'utilizadores', pesquisa],
    queryFn: async () => (await api.get('/api/utilizadores', { params: { pesquisa: pesquisa || undefined } })).data,
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Administração · Utilizadores</h1>
          <p className="text-sm text-slate-500">Gere contas e perfis.</p>
        </div>
        <input className="input max-w-xs" placeholder="Pesquisar…" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} />
      </header>

      {isLoading ? (
        <Carregando />
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Nome</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Perfis</th>
                <th className="text-left px-4 py-3 font-semibold">Último login</th>
                <th className="text-left px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.dados || []).map((u) => (
                <tr key={u.id_utilizador}>
                  <td className="px-4 py-3 font-semibold">{u.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(u.perfis || '').split(',').filter(Boolean).map((p) => (
                        <span key={p} className="badge-pill bg-softinsa-100 text-softinsa-800">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatarData(u.ultimo_login)}</td>
                  <td className="px-4 py-3">
                    {u.ativo ? (
                      <span className="badge-pill bg-emerald-100 text-emerald-800">Ativo</span>
                    ) : (
                      <span className="badge-pill bg-rose-100 text-rose-800">Inativo</span>
                    )}
                  </td>
                </tr>
              ))}
              {data?.dados?.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Sem utilizadores.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
