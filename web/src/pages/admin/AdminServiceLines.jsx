import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { descarregarCsv, imprimirTabela } from '../../lib/exportar';
import { formatarData } from '../../lib/formatar';

const ESTADO_INICIAL = {
  nome: '',
  descricao: '',
  id_learning_path: '',
  ativo: true,
};

const ICONES = {
  search: Search,
  file: FileText,
  download: Download,
  x: X,
  eye: Eye,
  edit: Pencil,
  power: Power,
  trash: Trash2,
  warning: TriangleAlert,
  plus: Plus,
  left: ChevronLeft,
  right: ChevronRight,
};

function Icon({ nome, className = 'h-5 w-5' }) {
  const Componente = ICONES[nome] || FileText;
  return <Componente className={className} aria-hidden="true" strokeWidth={1.8} />;
}

function prepararPayload(form) {
  return {
    nome: form.nome.trim(),
    descricao: form.descricao?.trim() || null,
    id_learning_path: Number(form.id_learning_path),
    ativo: form.ativo,
  };
}

function dadosServiceLines(items) {
  const headers = ['Nome da Service Line', 'Learning Path', 'Nº de Áreas', 'Nº de Badges', 'Data de Criação', 'Estado'];
  const linhas = items.map((sl) => [
    sl.nome,
    sl.nome_learning_path || '',
    sl.total_areas || 0,
    sl.total_badges || 0,
    formatarData(sl.created_at),
    sl.ativo ? 'Ativo' : 'Inativo',
  ]);
  return { headers, linhas };
}

function Modal({ titulo, children, onFechar, icon, iconTone = 'blue', size = 'md' }) {
  const sizeClass = size === 'sm' ? 'max-w-xl' : 'max-w-2xl';
  const iconClass = {
    amber: 'bg-amber-100 text-orange-500',
    rose: 'bg-rose-100 text-red-600',
    blue: 'bg-softinsa-100 text-softinsa-700',
  }[iconTone];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className={`w-full ${sizeClass} overflow-hidden rounded-[28px] bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b-4 border-slate-200 px-7 py-5">
          <div className="flex items-center gap-4">
            {icon && (
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${iconClass}`}>
                <Icon nome={icon} className="h-8 w-8" />
              </div>
            )}
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">{titulo}</h2>
          </div>
          <button type="button" onClick={onFechar} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
            <Icon nome="x" className="h-9 w-9" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormServiceLine({ form, setForm, learningPaths, modo, onSubmit, onCancelar, loading }) {
  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-5 px-7 py-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            Nome da Service Line<span className="text-red-600">*</span>
          </label>
          <input
            className="input"
            required
            placeholder="Service Line"
            value={form.nome}
            onChange={(e) => atualizar('nome', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            Learning Path<span className="text-red-600">*</span>
          </label>
          <select
            className="input"
            required
            value={form.id_learning_path}
            onChange={(e) => atualizar('id_learning_path', e.target.value)}
          >
            <option value="">Selecione um Learning Path</option>
            {learningPaths.map((lp) => (
              <option key={lp.id_learning_path} value={lp.id_learning_path}>{lp.nome}</option>
            ))}
          </select>
        </div>
        {modo === 'editar' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">Descrição</label>
            <textarea
              className="input min-h-24 resize-y"
              placeholder="Descrição interna da service line"
              value={form.descricao || ''}
              onChange={(e) => atualizar('descricao', e.target.value)}
            />
          </div>
        )}
        <div>
          <div className="mb-3 text-sm font-medium text-slate-900">Estado</div>
          <div className="flex gap-4 text-base text-slate-700">
            <label className="flex items-center gap-2">
              <input type="radio" className="h-4 w-4 text-softinsa-600" checked={form.ativo} onChange={() => atualizar('ativo', true)} />
              Ativo
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" className="h-4 w-4 text-softinsa-600" checked={!form.ativo} onChange={() => atualizar('ativo', false)} />
              Inativo
            </label>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t-4 border-slate-200 px-7 py-5">
        <button type="button" className="btn-secondary px-6" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primary min-w-44" disabled={loading}>
          {loading ? 'A guardar...' : modo === 'criar' ? 'Criar Service Line' : 'Atualizar Service Line'}
        </button>
      </div>
    </form>
  );
}

export default function AdminServiceLines() {
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState({ pesquisa: '', id_learning_path: '', ativo: '' });
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(ESTADO_INICIAL);

  const serviceLines = useQuery({
    queryKey: ['admin', 'service-lines', filtros, pagina],
    queryFn: async () => (await api.get('/api/service-lines', {
      params: {
        pagina,
        por_pagina: 5,
        pesquisa: filtros.pesquisa || undefined,
        id_learning_path: filtros.id_learning_path || undefined,
        ativo: filtros.ativo || undefined,
      },
    })).data,
  });

  const learningPaths = useQuery({
    queryKey: ['admin', 'learning-paths', 'select'],
    queryFn: async () => (await api.get('/api/learning-paths', { params: { por_pagina: 100, pagina: 1 } })).data,
  });

  const criar = useMutation({
    mutationFn: async () => (await api.post('/api/service-lines', prepararPayload(form))).data,
    onSuccess: () => {
      toast.success('Service Line criada.');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'service-lines'] });
      qc.invalidateQueries({ queryKey: ['admin', 'learning-paths'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const atualizar = useMutation({
    mutationFn: async () => (await api.put(`/api/service-lines/${modal.serviceLine.id_service_line}`, prepararPayload(form))).data,
    onSuccess: () => {
      toast.success('Service Line atualizada.');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'service-lines'] });
      qc.invalidateQueries({ queryKey: ['admin', 'learning-paths'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const alternarEstado = useMutation({
    mutationFn: async (sl) => (await api.put(`/api/service-lines/${sl.id_service_line}`, { ativo: !sl.ativo })).data,
    onSuccess: () => {
      toast.success('Estado atualizado.');
      qc.invalidateQueries({ queryKey: ['admin', 'service-lines'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const eliminar = useMutation({
    mutationFn: async () => (await api.delete(`/api/service-lines/${modal.serviceLine.id_service_line}`)).data,
    onSuccess: () => {
      toast.success('Service Line eliminada.');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'service-lines'] });
      qc.invalidateQueries({ queryKey: ['admin', 'learning-paths'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const lista = serviceLines.data?.dados || [];
  const total = serviceLines.data?.total || 0;
  const porPagina = serviceLines.data?.por_pagina || 5;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const lps = learningPaths.data?.dados || [];

  async function obterTodosFiltrados() {
    const paramsBase = {
      pesquisa: filtros.pesquisa || undefined,
      id_learning_path: filtros.id_learning_path || undefined,
      ativo: filtros.ativo || undefined,
      por_pagina: 100,
    };
    const primeira = (await api.get('/api/service-lines', { params: { ...paramsBase, pagina: 1 } })).data;
    const todos = [...(primeira.dados || [])];
    const totalPaginasExport = Math.ceil((primeira.total || 0) / (primeira.por_pagina || 100));

    for (let p = 2; p <= totalPaginasExport; p += 1) {
      const resposta = (await api.get('/api/service-lines', { params: { ...paramsBase, pagina: p } })).data;
      todos.push(...(resposta.dados || []));
    }

    return todos;
  }

  async function exportarExcel() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosServiceLines(todos);
      descarregarCsv('service-lines.csv', headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, 'Não foi possível exportar as service lines.'));
    }
  }

  async function exportarPdf() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosServiceLines(todos);
      imprimirTabela('Gestão de Service Lines', headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, 'Não foi possível preparar o PDF.'));
    }
  }

  function abrirCriacao() {
    if (learningPaths.isLoading) {
      toast('A carregar Learning Paths. Tenta novamente dentro de instantes.');
      return;
    }
    if (lps.length === 0) {
      toast.error('Antes de criar uma Service Line, cria primeiro um Learning Path.');
      return;
    }

    setForm({ ...ESTADO_INICIAL });
    setModal({ tipo: 'criar' });
  }

  function abrirEdicao(serviceLine) {
    setForm({
      nome: serviceLine.nome || '',
      descricao: serviceLine.descricao || '',
      id_learning_path: serviceLine.id_learning_path ? String(serviceLine.id_learning_path) : '',
      ativo: serviceLine.ativo !== 0,
    });
    setModal({ tipo: 'editar', serviceLine });
  }

  function limparFiltros() {
    setFiltros({ pesquisa: '', id_learning_path: '', ativo: '' });
    setPagina(1);
  }

  return (
    <div className="mx-auto max-w-[1420px] space-y-7">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestão de Service Lines</h1>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={exportarExcel}>
            <Icon nome="file" className="h-4 w-4" /> Exportar Excel
          </button>
          <button type="button" className="btn-secondary" onClick={exportarPdf}>
            <Icon nome="download" className="h-4 w-4" /> Exportar PDF
          </button>
          <button type="button" className="btn-primary" onClick={abrirCriacao}>
            <Icon nome="plus" className="h-4 w-4" /> Criar Service Line
          </button>
        </div>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_220px_200px_200px]">
          <label className="relative block">
            <Icon nome="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Pesquisar service line..."
              value={filtros.pesquisa}
              onChange={(e) => { setFiltros((f) => ({ ...f, pesquisa: e.target.value })); setPagina(1); }}
            />
          </label>
          <select className="input" value={filtros.id_learning_path} onChange={(e) => { setFiltros((f) => ({ ...f, id_learning_path: e.target.value })); setPagina(1); }}>
            <option value="">Learning paths (Todos)</option>
            {lps.map((lp) => <option key={lp.id_learning_path} value={lp.id_learning_path}>{lp.nome}</option>)}
          </select>
          <select className="input" value={filtros.ativo} onChange={(e) => { setFiltros((f) => ({ ...f, ativo: e.target.value })); setPagina(1); }}>
            <option value="">Estado (Todos)</option>
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
          <button type="button" className="btn-secondary border-softinsa-600 text-softinsa-700" onClick={limparFiltros}>
            <Icon nome="x" className="h-4 w-4" /> Limpar Filtros
          </button>
        </div>
      </section>

      <div className="text-sm text-slate-500">{total} resultados encontrados</div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-sm">
            <thead className="bg-slate-50 text-sm font-bold text-slate-700">
              <tr>
                <th className="px-6 py-4 text-left">Nome da Service Line</th>
                <th className="px-6 py-4 text-left">Learning Path</th>
                <th className="px-6 py-4 text-center">Nº de Áreas</th>
                <th className="px-6 py-4 text-center">Nº de Badges</th>
                <th className="px-6 py-4 text-center">Data de Criação</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {serviceLines.isLoading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">A carregar service lines...</td></tr>
              ) : lista.map((sl) => (
                <tr key={sl.id_service_line} className="text-slate-700">
                  <td className="px-6 py-5 font-medium text-slate-800">{sl.nome}</td>
                  <td className="px-6 py-5 text-slate-500">{sl.nome_learning_path}</td>
                  <td className="px-6 py-5 text-center text-slate-600">{sl.total_areas || 0}</td>
                  <td className="px-6 py-5 text-center text-slate-600">{sl.total_badges || 0}</td>
                  <td className="px-6 py-5 text-center text-slate-600">{formatarData(sl.created_at)}</td>
                  <td className="px-6 py-5 text-center">
                    <span className={`badge-pill ${sl.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {sl.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-4 text-softinsa-700">
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title="Ver" onClick={() => setModal({ tipo: 'ver', serviceLine: sl })}><Icon nome="eye" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title="Editar" onClick={() => abrirEdicao(sl)}><Icon nome="edit" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={sl.ativo ? 'Desativar' : 'Ativar'} onClick={() => sl.ativo ? setModal({ tipo: 'desativar', serviceLine: sl }) : alternarEstado.mutate(sl)}><Icon nome="power" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 text-red-600 hover:bg-red-50" title="Eliminar" onClick={() => setModal({ tipo: 'eliminar', serviceLine: sl })}><Icon nome="trash" className="h-5 w-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!serviceLines.isLoading && lista.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">Nenhuma service line encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-4 text-sm text-slate-500 md:flex-row">
        <span>Página {pagina} de {totalPaginas}</span>
        <div className="flex items-center gap-3">
          <button className="btn-secondary h-10 w-10 px-0 disabled:opacity-40" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} aria-label="Página anterior">
            <Icon nome="left" className="h-5 w-5" />
          </button>
          <span className="rounded-md bg-softinsa-600 px-4 py-2 font-semibold text-white">{pagina}</span>
          <button className="btn-secondary h-10 w-10 px-0 disabled:opacity-40" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)} aria-label="Página seguinte">
            <Icon nome="right" className="h-5 w-5" />
          </button>
        </div>
      </footer>

      {modal?.tipo === 'criar' && (
        <Modal titulo="Criar Service Line" onFechar={() => setModal(null)}>
          <FormServiceLine
            form={form}
            setForm={setForm}
            learningPaths={lps}
            modo="criar"
            onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={criar.isPending}
          />
        </Modal>
      )}

      {modal?.tipo === 'editar' && (
        <Modal titulo="Editar Service Line" onFechar={() => setModal(null)}>
          <FormServiceLine
            form={form}
            setForm={setForm}
            learningPaths={lps}
            modo="editar"
            onSubmit={(e) => { e.preventDefault(); atualizar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={atualizar.isPending}
          />
        </Modal>
      )}

      {modal?.tipo === 'ver' && (
        <Modal titulo="Detalhe da Service Line" onFechar={() => setModal(null)}>
          <div className="grid grid-cols-1 gap-4 px-7 py-5 text-sm md:grid-cols-2">
            <div><div className="text-slate-500">Nome</div><div className="font-semibold">{modal.serviceLine.nome}</div></div>
            <div><div className="text-slate-500">Learning Path</div><div className="font-semibold">{modal.serviceLine.nome_learning_path}</div></div>
            <div><div className="text-slate-500">Áreas</div><div className="font-semibold">{modal.serviceLine.total_areas || 0}</div></div>
            <div><div className="text-slate-500">Badges</div><div className="font-semibold">{modal.serviceLine.total_badges || 0}</div></div>
            <div><div className="text-slate-500">Data de Criação</div><div className="font-semibold">{formatarData(modal.serviceLine.created_at)}</div></div>
            <div><div className="text-slate-500">Estado</div><div className="font-semibold">{modal.serviceLine.ativo ? 'Ativo' : 'Inativo'}</div></div>
            <div className="md:col-span-2"><div className="text-slate-500">Descrição</div><div className="font-semibold">{modal.serviceLine.descricao || '—'}</div></div>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'desativar' && (
        <Modal titulo="Desativar Service Line" icon="warning" iconTone="amber" size="sm" onFechar={() => setModal(null)}>
          <div className="px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              Tem a certeza que pretende desativar a Service Line “{modal.serviceLine.nome}”?
            </p>
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>Cancelar</button>
            <button
              type="button"
              className="btn bg-orange-500 px-7 text-white hover:bg-orange-600"
              disabled={alternarEstado.isPending}
              onClick={() => {
                alternarEstado.mutate(modal.serviceLine, { onSuccess: () => setModal(null) });
              }}
            >
              {alternarEstado.isPending ? 'A confirmar...' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'eliminar' && (
        <Modal titulo="Eliminar Service Line" icon="warning" iconTone="rose" size="sm" onFechar={() => setModal(null)}>
          <div className="space-y-4 px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              Tem a certeza que pretende eliminar a Service Line “{modal.serviceLine.nome}”?
            </p>
            <p className="font-medium text-red-500">Esta ação não pode ser revertida!</p>
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>Cancelar</button>
            <button type="button" className="btn bg-red-600 px-7 text-white hover:bg-red-700" disabled={eliminar.isPending} onClick={() => eliminar.mutate()}>
              {eliminar.isPending ? 'A eliminar...' : 'Eliminar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
