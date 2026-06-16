import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { formatarData } from '../../lib/formatar';

const POR_PAGINA = 8;

const CATEGORIAS = {
  CANDIDATURA: { label: 'Candidatura', cor: 'bg-blue-100 text-blue-700' },
  BADGE: { label: 'Badge', cor: 'bg-emerald-100 text-emerald-700' },
  SISTEMA: { label: 'Sistema', cor: 'bg-violet-100 text-violet-700' },
};

function categoria(cat) {
  return CATEGORIAS[cat] || { label: cat || '—', cor: 'bg-slate-100 text-slate-700' };
}

function relacionadoCom(notif) {
  if (notif.entidade_relacionada) return notif.entidade_relacionada;
  return categoria(notif.categoria).label;
}

export default function AdminNotificacoes() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState({ pesquisa: '', categoria: '', estado: '' });
  const [pagina, setPagina] = useState(1);
  const [confirmar, setConfirmar] = useState(null);

  const notificacoes = useQuery({
    queryKey: ['admin', 'notificacoes'],
    queryFn: async () => (await api.get('/api/notificacoes', { params: { por_pagina: 100, arquivadas: 0 } })).data,
  });

  function aposAcao(mensagem) {
    return () => {
      toast.success(mensagem);
      qc.invalidateQueries({ queryKey: ['admin', 'notificacoes'] });
    };
  }

  const marcarLida = useMutation({
    mutationFn: (id) => api.post(`/api/notificacoes/${id}/ler`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'notificacoes'] }),
    onError: (err) => toast.error(extrairErro(err)),
  });

  const marcarTodas = useMutation({
    mutationFn: () => api.post('/api/notificacoes/ler-todas'),
    onSuccess: aposAcao('Todas as notificações marcadas como lidas.'),
    onError: (err) => toast.error(extrairErro(err)),
  });

  const arquivarLidas = useMutation({
    mutationFn: () => api.post('/api/notificacoes/arquivar-lidas'),
    onSuccess: aposAcao('Notificações lidas arquivadas.'),
    onError: (err) => toast.error(extrairErro(err)),
  });

  const apagarLidas = useMutation({
    mutationFn: () => api.post('/api/notificacoes/apagar-lidas'),
    onSuccess: () => { aposAcao('Notificações lidas eliminadas.')(); setConfirmar(null); },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const eliminar = useMutation({
    mutationFn: (id) => api.delete(`/api/notificacoes/${id}`),
    onSuccess: () => { aposAcao('Notificação eliminada.')(); setConfirmar(null); },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const listaFiltrada = useMemo(() => {
    const lista = notificacoes.data?.dados || [];
    const pesquisa = filtros.pesquisa.trim().toLowerCase();
    return lista.filter((n) => {
      if (pesquisa && !`${n.titulo} ${n.mensagem || ''}`.toLowerCase().includes(pesquisa)) return false;
      if (filtros.categoria && n.categoria !== filtros.categoria) return false;
      if (filtros.estado === 'nao_lidas' && n.lida) return false;
      if (filtros.estado === 'lidas' && !n.lida) return false;
      return true;
    });
  }, [notificacoes.data, filtros]);

  const total = listaFiltrada.length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const lista = listaFiltrada.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const naoLidas = notificacoes.data?.nao_lidas || 0;
  const haLidas = (notificacoes.data?.dados || []).some((n) => n.lida);

  function limparFiltros() {
    setFiltros({ pesquisa: '', categoria: '', estado: '' });
    setPagina(1);
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/notificacoes/definicoes')}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-softinsa-700"
            title="Definições de Notificações"
            aria-label="Definições de Notificações"
          >
            <Settings className="h-7 w-7" strokeWidth={1.8} />
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Notificações</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-secondary"
            disabled={naoLidas === 0 || marcarTodas.isPending}
            onClick={() => marcarTodas.mutate()}
          >
            <Eye className="h-4 w-4" /> Marcar todas como lidas
          </button>
          <button
            type="button"
            className="btn bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
            disabled={!haLidas || arquivarLidas.isPending}
            onClick={() => arquivarLidas.mutate()}
          >
            <Archive className="h-4 w-4" /> Arquivar notificações lidas
          </button>
          <button
            type="button"
            className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            disabled={!haLidas || apagarLidas.isPending}
            onClick={() => setConfirmar({ tipo: 'apagar-lidas' })}
          >
            <Trash2 className="h-4 w-4" /> Apagar Notificações Lidas
          </button>
        </div>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_200px_200px_200px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Pesquisar notificação..."
              value={filtros.pesquisa}
              onChange={(e) => { setFiltros((f) => ({ ...f, pesquisa: e.target.value })); setPagina(1); }}
            />
          </label>
          <select className="input" value={filtros.categoria} onChange={(e) => { setFiltros((f) => ({ ...f, categoria: e.target.value })); setPagina(1); }}>
            <option value="">Categoria (Todas)</option>
            <option value="CANDIDATURA">Candidatura</option>
            <option value="BADGE">Badge</option>
            <option value="SISTEMA">Sistema</option>
          </select>
          <select className="input" value={filtros.estado} onChange={(e) => { setFiltros((f) => ({ ...f, estado: e.target.value })); setPagina(1); }}>
            <option value="">Estado (Todos)</option>
            <option value="nao_lidas">Não lidas</option>
            <option value="lidas">Lidas</option>
          </select>
          <button type="button" className="btn-secondary border-softinsa-600 text-softinsa-700" onClick={limparFiltros}>
            <X className="h-4 w-4" /> Limpar Filtros
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[840px] w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left">Assunto</th>
                <th className="px-5 py-4 text-center">Relacionado com</th>
                <th className="px-5 py-4 text-center">Data</th>
                <th className="px-5 py-4 text-center">Estado</th>
                <th className="px-5 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {notificacoes.isLoading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">A carregar notificações...</td></tr>
              ) : lista.map((n) => (
                <tr key={n.id_notificacao} className={`text-slate-700 ${n.lida ? '' : 'bg-softinsa-50/40'}`}>
                  <td className="px-5 py-5">
                    <div className="font-semibold text-slate-800">{n.titulo}</div>
                    {n.mensagem && <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">{n.mensagem}</div>}
                  </td>
                  <td className="px-5 py-5 text-center text-slate-600">
                    <span className={`badge-pill ${categoria(n.categoria).cor}`}>{relacionadoCom(n)}</span>
                  </td>
                  <td className="px-5 py-5 text-center text-slate-600">{formatarData(n.data_criacao)}</td>
                  <td className="px-5 py-5 text-center">
                    <span className={`badge-pill ${n.lida ? 'bg-slate-100 text-slate-500' : 'bg-rose-100 text-rose-700'}`}>
                      {n.lida ? 'Lido' : 'Não Lido'}
                    </span>
                  </td>
                  <td className="px-5 py-5">
                    <div className="flex items-center justify-center gap-4">
                      <button
                        type="button"
                        className="rounded-md p-1 text-softinsa-700 hover:bg-blue-50 disabled:opacity-30"
                        title="Marcar como lida"
                        disabled={n.lida || marcarLida.isPending}
                        onClick={() => marcarLida.mutate(n.id_notificacao)}
                      >
                        <Eye className="h-5 w-5" strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1 text-red-600 hover:bg-red-50"
                        title="Eliminar"
                        onClick={() => setConfirmar({ tipo: 'eliminar', notif: n })}
                      >
                        <Trash2 className="h-5 w-5" strokeWidth={1.8} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!notificacoes.isLoading && lista.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Bell className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.5} />
                    <p className="mt-3 text-sm font-medium text-slate-500">Nenhuma notificação encontrada.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-10 py-5 text-sm text-slate-500 md:flex-row">
          <span>A mostrar {lista.length ? ((paginaAtual - 1) * POR_PAGINA) + 1 : 0} de {total} resultados</span>
          <div className="flex items-center gap-3">
            <button className="btn-secondary h-10 w-10 px-0 disabled:opacity-40" disabled={paginaAtual <= 1} onClick={() => setPagina((p) => p - 1)} aria-label="Página anterior">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="font-semibold text-slate-800">Página {paginaAtual} de {totalPaginas}</span>
            <button className="btn-secondary h-10 w-10 px-0 disabled:opacity-40" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina((p) => p + 1)} aria-label="Página seguinte">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </footer>
      </section>

      {confirmar && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-xl">
            <div className="flex items-center gap-4 border-b-4 border-slate-200 px-7 py-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-red-600">
                <Trash2 className="h-7 w-7" strokeWidth={1.8} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                {confirmar.tipo === 'apagar-lidas' ? 'Apagar notificações lidas' : 'Eliminar notificação'}
              </h2>
            </div>
            <div className="space-y-3 px-7 py-6">
              <p className="text-base leading-7 text-slate-600">
                {confirmar.tipo === 'apagar-lidas'
                  ? 'Tem a certeza que pretende eliminar todas as notificações já lidas?'
                  : <>Tem a certeza que pretende eliminar a notificação “{confirmar.notif.titulo}”?</>}
              </p>
              <p className="font-medium text-red-500">Esta ação não pode ser revertida!</p>
            </div>
            <div className="flex justify-end gap-3 px-7 pb-6">
              <button type="button" className="btn-secondary px-6" onClick={() => setConfirmar(null)}>Cancelar</button>
              <button
                type="button"
                className="btn bg-red-600 px-7 text-white hover:bg-red-700"
                disabled={apagarLidas.isPending || eliminar.isPending}
                onClick={() => confirmar.tipo === 'apagar-lidas' ? apagarLidas.mutate() : eliminar.mutate(confirmar.notif.id_notificacao)}
              >
                {(apagarLidas.isPending || eliminar.isPending) ? 'A eliminar...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
