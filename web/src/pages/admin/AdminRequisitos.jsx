import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Pencil,
  Power,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { descarregarCsv, imprimirTabela } from '../../lib/exportar';
import UploadImagemAdmin from '../../components/UploadImagemAdmin';

const TIPOS_EVIDENCIA = ['Certificado', 'Curso', 'Documento', 'Badge', 'Outro'];

const NIVEIS = {
  A: 'Júnior',
  B: 'Intermédio',
  C: 'Sénior',
  D: 'Especialista',
  E: 'Líder',
  Especial: 'Especial',
};

const FORM_INICIAL = {
  titulo: '',
  descricao: '',
  imagem_url: '',
  tipo_evidencia: 'Certificado',
  codigo_nivel: 'A',
  id_nivel: '',
  ativo: true,
};

const ICONES = {
  download: Download,
  edit: Pencil,
  eye: Eye,
  file: FileText,
  left: ChevronLeft,
  power: Power,
  right: ChevronRight,
  search: Search,
  trash: Trash2,
  warning: TriangleAlert,
  x: X,
};

function Icon({ nome, className = 'h-5 w-5' }) {
  const Componente = ICONES[nome] || FileText;
  return <Componente className={className} aria-hidden="true" strokeWidth={1.8} />;
}

function Modal({ titulo, children, onFechar, icon, iconTone = 'blue', size = 'md' }) {
  const sizeClass = size === 'sm' ? 'max-w-xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-2xl';
  const iconClass = {
    amber: 'bg-amber-100 text-orange-500',
    rose: 'bg-rose-100 text-red-600',
    blue: 'bg-softinsa-100 text-softinsa-700',
  }[iconTone];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className={`max-h-[96vh] w-full ${sizeClass} overflow-hidden rounded-[28px] bg-white shadow-xl`}>
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

async function obterTodasDaRota(rota, params = {}) {
  const primeira = (await api.get(rota, { params: { ...params, pagina: 1, por_pagina: 100 } })).data;
  const todas = [...(primeira.dados || [])];
  const totalPaginas = Math.ceil((primeira.total || 0) / (primeira.por_pagina || 100));

  for (let p = 2; p <= totalPaginas; p += 1) {
    const resposta = (await api.get(rota, { params: { ...params, pagina: p, por_pagina: 100 } })).data;
    todas.push(...(resposta.dados || []));
  }

  return { dados: todas };
}

function dificuldade(item) {
  const codigo = item.codigo_nivel || '';
  if (!codigo) return '—';
  return `(${codigo}) ${item.nome_nivel || NIVEIS[codigo] || ''}`.trim();
}

function descricaoCurta(texto) {
  if (!texto) return '—';
  return texto.length > 28 ? `${texto.slice(0, 28)}...` : texto;
}

function prepararPayloadEdicao(form) {
  return {
    titulo: form.titulo.trim(),
    descricao: form.descricao.trim(),
    tipo_evidencia: form.tipo_evidencia,
    imagem_url: form.imagem_url || null,
    ativo: form.ativo,
  };
}

function dadosRequisitos(items) {
  const headers = ['Título', 'Descrição', 'Nível', 'Tipo Evidência', 'Nº Badges', 'Estado'];
  const linhas = items.map((req) => [
    req.titulo,
    req.descricao || '',
    dificuldade(req),
    req.tipo_evidencia || '',
    req.total_badges || 0,
    req.ativo !== 0 ? 'Ativo' : 'Inativo',
  ]);
  return { headers, linhas };
}

function FormRequisito({ form, setForm, requisito, onSubmit, onCancelar, loading }) {
  return (
    <form onSubmit={onSubmit}>
      <div className="max-h-[72vh] space-y-6 overflow-y-auto px-7 py-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            Título<span className="text-red-600">*</span>
          </label>
          <input
            className="input"
            required
            placeholder="Título do requisito"
            value={form.titulo}
            onChange={(e) => setForm((atual) => ({ ...atual, titulo: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            Descrição<span className="text-red-600">*</span>
          </label>
          <textarea
            className="input min-h-[92px] resize-y py-3"
            required
            placeholder="Descreve o requisito e as evidências aceites."
            value={form.descricao}
            onChange={(e) => setForm((atual) => ({ ...atual, descricao: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-slate-900">
            Imagem<span className="text-red-600">*</span>
          </label>
          <UploadImagemAdmin
            contexto="requisitos"
            valor={form.imagem_url}
            onUpload={(url) => setForm((atual) => ({ ...atual, imagem_url: url }))}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            Tipo de requisito<span className="text-red-600">*</span>
          </label>
          <select
            className="input"
            required
            value={form.tipo_evidencia}
            onChange={(e) => setForm((atual) => ({ ...atual, tipo_evidencia: e.target.value }))}
          >
            {TIPOS_EVIDENCIA.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
          </select>
        </div>

        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <div className="text-sm font-medium text-slate-900">Contexto</div>
          <div className="mt-1 text-sm text-slate-500">
            {dificuldade(requisito)} · associado a {requisito?.total_badges || 0} badge(s)
          </div>
        </div>

        <div>
          <div className="mb-3 text-sm font-medium text-slate-900">Estado</div>
          <div className="flex gap-5 text-base text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                className="h-4 w-4 text-softinsa-600"
                checked={form.ativo}
                onChange={() => setForm((atual) => ({ ...atual, ativo: true }))}
              />
              Ativo
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                className="h-4 w-4 text-softinsa-600"
                checked={!form.ativo}
                onChange={() => setForm((atual) => ({ ...atual, ativo: false }))}
              />
              Inativo
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t-4 border-slate-200 px-7 py-5">
        <button type="button" className="btn-secondary px-6" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primary min-w-36" disabled={loading}>
          {loading ? 'A guardar...' : 'Editar Requisito'}
        </button>
      </div>
    </form>
  );
}

export default function AdminRequisitos() {
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState({ pesquisa: '', codigo_nivel: '', tipo_evidencia: '', ativo: '' });
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);

  const requisitos = useQuery({
    queryKey: ['admin', 'requisitos', filtros, pagina],
    queryFn: async () => (await api.get('/api/requisitos', {
      params: {
        pagina,
        por_pagina: 5,
        pesquisa: filtros.pesquisa || undefined,
        codigo_nivel: filtros.codigo_nivel || undefined,
        tipo_evidencia: filtros.tipo_evidencia || undefined,
        ativo: filtros.ativo || undefined,
      },
    })).data,
  });

  const niveis = useQuery({
    queryKey: ['admin', 'requisitos', 'niveis-select'],
    queryFn: async () => obterTodasDaRota('/api/niveis'),
  });

  const atualizar = useMutation({
    mutationFn: async () => {
      const payload = prepararPayloadEdicao(form);
      return (await api.put(`/api/requisitos/${modal.requisito.id_requisito}`, payload)).data;
    },
    onSuccess: () => {
      toast.success('Requisito atualizado.');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'requisitos'] });
      qc.invalidateQueries({ queryKey: ['admin', 'niveis'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const alternarEstado = useMutation({
    mutationFn: async (requisito) => (await api.put(`/api/requisitos/${requisito.id_requisito}`, { ativo: !(requisito.ativo !== 0) })).data,
    onSuccess: () => {
      toast.success('Estado atualizado.');
      qc.invalidateQueries({ queryKey: ['admin', 'requisitos'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const eliminar = useMutation({
    mutationFn: async () => (await api.delete(`/api/requisitos/${modal.requisito.id_requisito}`)).data,
    onSuccess: () => {
      toast.success('Requisito eliminado.');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'requisitos'] });
      qc.invalidateQueries({ queryKey: ['admin', 'niveis'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const lista = requisitos.data?.dados || [];
  const total = requisitos.data?.total || 0;
  const porPagina = requisitos.data?.por_pagina || 5;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const listaNiveis = niveis.data?.dados || [];

  const niveisFiltro = useMemo(() => {
    const porCodigo = new Map();
    listaNiveis.forEach((nivel) => {
      if (nivel.codigo_nivel && !porCodigo.has(nivel.codigo_nivel)) porCodigo.set(nivel.codigo_nivel, nivel);
    });
    return Array.from(porCodigo.values()).sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
  }, [listaNiveis]);

  function atualizarFiltro(campo, valor) {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
    setPagina(1);
  }

  function limparFiltros() {
    setFiltros({ pesquisa: '', codigo_nivel: '', tipo_evidencia: '', ativo: '' });
    setPagina(1);
  }

  function abrirEdicao(requisito) {
    setForm({
      titulo: requisito.titulo || '',
      descricao: requisito.descricao || '',
      imagem_url: requisito.imagem_url || '',
      tipo_evidencia: requisito.tipo_evidencia || 'Certificado',
      codigo_nivel: requisito.codigo_nivel || 'A',
      id_nivel: requisito.id_nivel ? String(requisito.id_nivel) : '',
      ativo: requisito.ativo !== 0,
    });
    setModal({ tipo: 'editar', requisito });
  }

  async function obterTodosFiltrados() {
    return (await obterTodasDaRota('/api/requisitos', {
      pesquisa: filtros.pesquisa || undefined,
      codigo_nivel: filtros.codigo_nivel || undefined,
      tipo_evidencia: filtros.tipo_evidencia || undefined,
      ativo: filtros.ativo || undefined,
    })).dados;
  }

  async function exportarExcel() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosRequisitos(todos);
      descarregarCsv('requisitos.csv', headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, 'Não foi possível exportar os requisitos.'));
    }
  }

  async function exportarPdf() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosRequisitos(todos);
      imprimirTabela('Gestão de Requisitos', headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, 'Não foi possível preparar o PDF.'));
    }
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-7">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestão de Requisitos</h1>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={exportarExcel}>
            <Icon nome="download" className="h-4 w-4" /> Exportar Excel
          </button>
          <button type="button" className="btn-secondary" onClick={exportarPdf}>
            <Icon nome="download" className="h-4 w-4" /> Exportar PDF
          </button>
        </div>
      </header>

      <section className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900">
        Os requisitos são criados dentro de um badge. Esta página serve para consultar, editar, ativar/desativar e auditar requisitos já associados.
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_220px_240px_200px_200px]">
          <label className="relative block">
            <Icon nome="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Pesquisar requisito..."
              value={filtros.pesquisa}
              onChange={(e) => atualizarFiltro('pesquisa', e.target.value)}
            />
          </label>
          <select className="input" value={filtros.codigo_nivel} onChange={(e) => atualizarFiltro('codigo_nivel', e.target.value)}>
            <option value="">Nível (Todos)</option>
            {niveisFiltro.map((nivel) => (
              <option key={nivel.codigo_nivel} value={nivel.codigo_nivel}>
                {nivel.codigo_nivel} - {nivel.nome_nivel || NIVEIS[nivel.codigo_nivel]}
              </option>
            ))}
            <option value="Especial">Especial</option>
          </select>
          <select className="input" value={filtros.tipo_evidencia} onChange={(e) => atualizarFiltro('tipo_evidencia', e.target.value)}>
            <option value="">Tipo Evidência (Todos)</option>
            {TIPOS_EVIDENCIA.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
          </select>
          <select className="input" value={filtros.ativo} onChange={(e) => atualizarFiltro('ativo', e.target.value)}>
            <option value="">Estado (Todos)</option>
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
          <button type="button" className="btn-secondary border-softinsa-600 text-softinsa-700" onClick={limparFiltros}>
            <Icon nome="x" className="h-4 w-4" /> Limpar Filtros
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 text-center">Título</th>
                <th className="px-5 py-4 text-center">Descrição</th>
                <th className="px-5 py-4 text-center">Nível</th>
                <th className="px-5 py-4 text-center">Tipo Evidência</th>
                <th className="px-5 py-4 text-center">Nº Badges</th>
                <th className="px-5 py-4 text-center">Estado</th>
                <th className="px-5 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {requisitos.isLoading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">A carregar requisitos...</td></tr>
              ) : lista.map((requisito) => (
                <tr key={requisito.id_requisito} className="text-slate-700">
                  <td className="px-5 py-5 text-center font-semibold text-slate-800">{requisito.titulo}</td>
                  <td className="px-5 py-5 text-center text-slate-500" title={requisito.descricao || ''}>{descricaoCurta(requisito.descricao)}</td>
                  <td className="px-5 py-5 text-center text-slate-500">{dificuldade(requisito)}</td>
                  <td className="px-5 py-5 text-center text-slate-500">{requisito.tipo_evidencia || '—'}</td>
                  <td className="px-5 py-5 text-center font-semibold text-slate-800">{requisito.total_badges || 0}</td>
                  <td className="px-5 py-5 text-center">
                    <span className={`badge-pill ${requisito.ativo !== 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {requisito.ativo !== 0 ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-5">
                    <div className="flex items-center justify-center gap-4 text-softinsa-700">
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title="Ver" onClick={() => setModal({ tipo: 'ver', requisito })}><Icon nome="eye" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title="Editar" onClick={() => abrirEdicao(requisito)}><Icon nome="edit" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={requisito.ativo !== 0 ? 'Desativar' : 'Ativar'} onClick={() => requisito.ativo !== 0 ? setModal({ tipo: 'desativar', requisito }) : alternarEstado.mutate(requisito)}><Icon nome="power" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 text-red-600 hover:bg-red-50" title="Eliminar" onClick={() => setModal({ tipo: 'eliminar', requisito })}><Icon nome="trash" className="h-5 w-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!requisitos.isLoading && lista.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">Nenhum requisito encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-6 py-4 text-sm text-slate-500 md:flex-row">
          <span>A mostrar {lista.length} de {total} resultados</span>
          <div className="flex items-center gap-3">
            <button className="btn-secondary h-10 w-10 px-0 disabled:opacity-40" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} aria-label="Página anterior">
              <Icon nome="left" className="h-5 w-5" />
            </button>
            <span className="font-semibold text-slate-700">Página {pagina} de {totalPaginas}</span>
            <button className="btn-secondary h-10 w-10 px-0 disabled:opacity-40" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)} aria-label="Página seguinte">
              <Icon nome="right" className="h-5 w-5" />
            </button>
          </div>
        </footer>
      </section>

      {modal?.tipo === 'editar' && (
        <Modal titulo="Editar Requisito" onFechar={() => setModal(null)} size="lg">
          <FormRequisito
            form={form}
            setForm={setForm}
            requisito={modal.requisito}
            onSubmit={(e) => { e.preventDefault(); atualizar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={atualizar.isPending}
          />
        </Modal>
      )}

      {modal?.tipo === 'ver' && (
        <Modal titulo="Detalhe do Requisito" onFechar={() => setModal(null)}>
          <div className="grid grid-cols-1 gap-4 px-7 py-5 text-sm md:grid-cols-2">
            <div><div className="text-slate-500">Título</div><div className="font-semibold">{modal.requisito.titulo}</div></div>
            <div><div className="text-slate-500">Nível</div><div className="font-semibold">{dificuldade(modal.requisito)}</div></div>
            <div><div className="text-slate-500">Tipo Evidência</div><div className="font-semibold">{modal.requisito.tipo_evidencia || '—'}</div></div>
            <div><div className="text-slate-500">N.º Badges</div><div className="font-semibold">{modal.requisito.total_badges || 0}</div></div>
            <div><div className="text-slate-500">Estado</div><div className="font-semibold">{modal.requisito.ativo !== 0 ? 'Ativo' : 'Inativo'}</div></div>
            <div className="md:col-span-2"><div className="text-slate-500">Descrição</div><div className="font-semibold whitespace-pre-wrap">{modal.requisito.descricao || '—'}</div></div>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'desativar' && (
        <Modal titulo="Desativar Requisito" icon="warning" iconTone="amber" size="sm" onFechar={() => setModal(null)}>
          <div className="px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              Tem a certeza que pretende desativar o requisito “{modal.requisito.titulo}”?
            </p>
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>Cancelar</button>
            <button
              type="button"
              className="btn bg-orange-500 px-7 text-white hover:bg-orange-600"
              disabled={alternarEstado.isPending}
              onClick={() => alternarEstado.mutate(modal.requisito, { onSuccess: () => setModal(null) })}
            >
              {alternarEstado.isPending ? 'A confirmar...' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'eliminar' && (
        <Modal titulo="Eliminar Requisito" icon="warning" iconTone="rose" size="sm" onFechar={() => setModal(null)}>
          <div className="space-y-4 px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              Tem a certeza que pretende eliminar o requisito “{modal.requisito.titulo}”?
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
