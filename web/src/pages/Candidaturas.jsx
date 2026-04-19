import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Carregando from '../components/Carregando';
import { estadoCandidatura, formatarData } from '../lib/formatar';

const ESTADOS = ['', 'OPEN', 'SUBMITTED', 'IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW', 'SENT_BACK', 'APPROVED', 'REJECTED'];

export default function Candidaturas() {
  const [filtro, setFiltro] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['candidaturas', filtro],
    queryFn: async () => (await api.get('/api/candidaturas', { params: { estado: filtro || undefined } })).data,
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Candidaturas</h1>
          <p className="text-sm text-slate-500">Acompanha o estado das tuas candidaturas a badges.</p>
        </div>
        <select className="input max-w-xs" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          {ESTADOS.map((est) => (
            <option key={est} value={est}>{est ? estadoCandidatura(est).label : 'Todos os estados'}</option>
          ))}
        </select>
      </header>

      {isLoading ? (
        <Carregando />
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Badge</th>
                <th className="text-left px-4 py-3 font-semibold">Consultor</th>
                <th className="text-left px-4 py-3 font-semibold">Estado</th>
                <th className="text-left px-4 py-3 font-semibold">Atualizada</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(data?.dados || []).map((c) => {
                const info = estadoCandidatura(c.estado_atual);
                return (
                  <tr key={c.id_candidatura}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{c.titulo_badge}</div>
                      <div className="text-xs text-slate-500">{c.codigo_nivel}</div>
                    </td>
                    <td className="px-4 py-3">{c.nome_consultor || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge-pill ${info.cor}`}>{info.label}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatarData(c.data_atualizacao || c.data_submissao || c.data_criacao)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/candidaturas/${c.id_candidatura}`} className="text-softinsa-600 hover:underline">
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {data?.dados?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">Nenhuma candidatura encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
