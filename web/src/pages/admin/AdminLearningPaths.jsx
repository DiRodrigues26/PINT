import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
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
import { formatarData } from '../../lib/formatar';
import { descarregarCsv, imprimirTabela } from '../../lib/exportar';
import { useLanguage } from '../../context/LanguageContext';
import Paginacao from '../../components/admin/Paginacao';

const ESTADO_INICIAL = {
  nome: '',
  descricao: '',
  ativo: true,
};

const ICONES = {
  search: Search,
  file: FileText,
  x: X,
  eye: Eye,
  edit: Pencil,
  power: Power,
  trash: Trash2,
  warning: TriangleAlert,
  plus: Plus,
};

function Icon({ nome, className = 'h-5 w-5' }) {
  const Componente = ICONES[nome] || FileText;
  return <Componente className={className} aria-hidden="true" strokeWidth={1.8} />;
}

function prepararPayload(form) {
  return {
    nome: form.nome.trim(),
    descricao: form.descricao?.trim() || null,
    ativo: form.ativo,
  };
}

function dadosLearningPaths(items, t) {
  const headers = [t('admin_lp_col_nome'), t('admin_rel_col_nr_sl'), t('admin_rel_col_nr_badges'), t('admin_lp_col_data_criacao'), t('admin_dash_col_state')];
  const linhas = items.map((lp) => [
    lp.nome,
    lp.total_service_lines || 0,
    lp.total_badges || 0,
    formatarData(lp.created_at),
    lp.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive'),
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
    <div className="fixed inset-x-0 -top-8 bottom-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 pt-8">
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

function FormLearningPath({ form, setForm, modo, onSubmit, onCancelar, loading, t }) {
  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-5 px-7 py-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            {t('admin_lp_col_nome')}<span className="text-red-600">*</span>
          </label>
          <input
            className="input"
            required
            placeholder={t('admin_lp_placeholder_nome')}
            value={form.nome}
            onChange={(e) => atualizar('nome', e.target.value)}
          />
        </div>
        {modo === 'editar' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_lp_descricao')}</label>
            <textarea
              className="input min-h-24 resize-y"
              placeholder={t('admin_lp_placeholder_descricao')}
              value={form.descricao || ''}
              onChange={(e) => atualizar('descricao', e.target.value)}
            />
          </div>
        )}
        <div>
          <div className="mb-3 text-sm font-medium text-slate-900">{t('admin_dash_col_state')}</div>
          <div className="flex gap-4 text-base text-slate-700">
            <label className="flex items-center gap-2">
              <input type="radio" className="h-4 w-4 text-softinsa-600" checked={form.ativo} onChange={() => atualizar('ativo', true)} />
              {t('admin_dash_notice_active')}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" className="h-4 w-4 text-softinsa-600" checked={!form.ativo} onChange={() => atualizar('ativo', false)} />
              {t('admin_dash_notice_inactive')}
            </label>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t-4 border-slate-200 px-7 py-5">
        <button type="button" className="btn-secondary px-6" onClick={onCancelar}>{t('admin_cancel')}</button>
        <button type="submit" className="btn-primary min-w-44" disabled={loading}>
          {loading ? t('admin_lp_a_guardar') : modo === 'criar' ? t('admin_lp_criar') : t('admin_lp_btn_atualizar')}
        </button>
      </div>
    </form>
  );
}

export default function AdminLearningPaths() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState({ pesquisa: '', ativo: '' });
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(ESTADO_INICIAL);

  const learningPaths = useQuery({
    queryKey: ['admin', 'learning-paths', filtros, pagina],
    queryFn: async () => (await api.get('/api/learning-paths', {
      params: {
        pagina,
        por_pagina: 5,
        pesquisa: filtros.pesquisa || undefined,
        ativo: filtros.ativo || undefined,
      },
    })).data,
  });

  const criar = useMutation({
    mutationFn: async () => (await api.post('/api/learning-paths', prepararPayload(form))).data,
    onSuccess: () => {
      toast.success(t('admin_lp_toast_criado'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'learning-paths'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const atualizar = useMutation({
    mutationFn: async () => (await api.put(`/api/learning-paths/${modal.learningPath.id_learning_path}`, prepararPayload(form))).data,
    onSuccess: () => {
      toast.success(t('admin_lp_toast_atualizado'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'learning-paths'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const alternarEstado = useMutation({
    mutationFn: async (lp) => (await api.put(`/api/learning-paths/${lp.id_learning_path}`, { ativo: !lp.ativo })).data,
    onSuccess: () => {
      toast.success(t('admin_lp_toast_estado_atualizado'));
      qc.invalidateQueries({ queryKey: ['admin', 'learning-paths'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const eliminar = useMutation({
    mutationFn: async () => (await api.delete(`/api/learning-paths/${modal.learningPath.id_learning_path}`)).data,
    onSuccess: () => {
      toast.success(t('admin_lp_toast_eliminado'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'learning-paths'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const lista = learningPaths.data?.dados || [];
  const total = learningPaths.data?.total || 0;
  const porPagina = learningPaths.data?.por_pagina || 5;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const linhasMostradas = lista.length;

  async function obterTodosFiltrados() {
    const paramsBase = {
      pesquisa: filtros.pesquisa || undefined,
      ativo: filtros.ativo || undefined,
      por_pagina: 100,
    };
    const primeira = (await api.get('/api/learning-paths', { params: { ...paramsBase, pagina: 1 } })).data;
    const todos = [...(primeira.dados || [])];
    const totalPaginasExport = Math.ceil((primeira.total || 0) / (primeira.por_pagina || 100));

    for (let p = 2; p <= totalPaginasExport; p += 1) {
      const resposta = (await api.get('/api/learning-paths', { params: { ...paramsBase, pagina: p } })).data;
      todos.push(...(resposta.dados || []));
    }

    return todos;
  }

  async function exportarExcel() {
    try {
      const { headers, linhas } = dadosLearningPaths(await obterTodosFiltrados(), t);
      descarregarCsv('learning-paths.csv', headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_lp_erro_exportar_excel')));
    }
  }

  async function exportarPdf() {
    try {
      const { headers, linhas } = dadosLearningPaths(await obterTodosFiltrados(), t);
      imprimirTabela(t('admin_menu_learning_paths'), headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_lp_erro_exportar_pdf')));
    }
  }

  function abrirCriacao() {
    setForm(ESTADO_INICIAL);
    setModal({ tipo: 'criar' });
  }

  function abrirEdicao(learningPath) {
    setForm({
      nome: learningPath.nome || '',
      descricao: learningPath.descricao || '',
      ativo: learningPath.ativo !== 0,
    });
    setModal({ tipo: 'editar', learningPath });
  }

  function limparFiltros() {
    setFiltros({ pesquisa: '', ativo: '' });
    setPagina(1);
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin_menu_learning_paths')}</h1>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={exportarExcel}>
            <Icon nome="file" className="h-4 w-4" /> {t('admin_sla_export_excel')}
          </button>
          <button type="button" className="btn-secondary" onClick={exportarPdf}>
            <Icon nome="file" className="h-4 w-4" /> {t('admin_sla_export_pdf')}
          </button>
          <button type="button" className="btn-primary" onClick={abrirCriacao}>
            <Icon nome="plus" className="h-4 w-4" /> {t('admin_lp_criar')}
          </button>
        </div>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_200px_200px]">
          <label className="relative block">
            <Icon nome="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder={t('admin_lp_pesquisar')}
              value={filtros.pesquisa}
              onChange={(e) => { setFiltros((f) => ({ ...f, pesquisa: e.target.value })); setPagina(1); }}
            />
          </label>
          <select className="input" value={filtros.ativo} onChange={(e) => { setFiltros((f) => ({ ...f, ativo: e.target.value })); setPagina(1); }}>
            <option value="">{t('admin_notif_estado_todos')}</option>
            <option value="1">{t('admin_dash_notice_active')}</option>
            <option value="0">{t('admin_dash_notice_inactive')}</option>
          </select>
          <button type="button" className="btn-secondary border-softinsa-600 text-softinsa-700" onClick={limparFiltros}>
            <Icon nome="x" className="h-4 w-4" /> {t('admin_notif_limpar_filtros')}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left">{t('admin_lp_col_nome')}</th>
                <th className="px-5 py-4 text-center">{t('admin_rel_col_nr_sl')}</th>
                <th className="px-5 py-4 text-center">{t('admin_rel_col_nr_badges')}</th>
                <th className="px-5 py-4 text-center">{t('admin_lp_col_data_criacao')}</th>
                <th className="px-5 py-4 text-center">{t('admin_dash_col_state')}</th>
                <th className="px-5 py-4 text-center">{t('admin_sla_col_acoes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {learningPaths.isLoading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">{t('admin_lp_a_carregar')}</td></tr>
              ) : lista.map((lp) => (
                <tr key={lp.id_learning_path} className="text-slate-700">
                  <td className="px-12 py-6 font-semibold text-slate-800">{lp.nome}</td>
                  <td className="px-5 py-6 text-center">{lp.total_service_lines || 0}</td>
                  <td className="px-5 py-6 text-center">{lp.total_badges || 0}</td>
                  <td className="px-5 py-6 text-center text-slate-600">{formatarData(lp.created_at)}</td>
                  <td className="px-5 py-6 text-center">
                    <span className={`badge-pill ${lp.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {lp.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive')}
                    </span>
                  </td>
                  <td className="px-5 py-6">
                    <div className="flex items-center justify-center gap-4 text-softinsa-700">
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_ver')} onClick={() => setModal({ tipo: 'ver', learningPath: lp })}><Icon nome="eye" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_editar')} onClick={() => abrirEdicao(lp)}><Icon nome="edit" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={lp.ativo ? t('admin_lp_desativar') : t('admin_lp_ativar')} onClick={() => lp.ativo ? setModal({ tipo: 'desativar', learningPath: lp }) : alternarEstado.mutate(lp)}><Icon nome="power" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 text-red-600 hover:bg-red-50" title={t('admin_notif_eliminar')} onClick={() => setModal({ tipo: 'eliminar', learningPath: lp })}><Icon nome="trash" className="h-5 w-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!learningPaths.isLoading && lista.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">{t('admin_lp_vazio')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Paginacao
          pagina={pagina}
          totalPaginas={totalPaginas}
          total={total}
          porPagina={porPagina}
          itensNaPagina={linhasMostradas}
          onMudarPagina={setPagina}
          className="px-10 py-5"
        />
      </section>

      {modal?.tipo === 'criar' && (
        <Modal titulo={t('admin_lp_criar')} onFechar={() => setModal(null)}>
          <FormLearningPath
            form={form}
            setForm={setForm}
            modo="criar"
            onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={criar.isPending}
            t={t}
          />
        </Modal>
      )}

      {modal?.tipo === 'editar' && (
        <Modal titulo={t('admin_lp_modal_editar_titulo')} onFechar={() => setModal(null)}>
          <FormLearningPath
            form={form}
            setForm={setForm}
            modo="editar"
            onSubmit={(e) => { e.preventDefault(); atualizar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={atualizar.isPending}
            t={t}
          />
        </Modal>
      )}

      {modal?.tipo === 'ver' && (
        <Modal titulo={t('admin_lp_modal_detalhe_titulo')} onFechar={() => setModal(null)}>
          <div className="grid grid-cols-1 gap-4 px-7 py-5 text-sm md:grid-cols-2">
            <div><div className="text-slate-500">{t('admin_lp_lbl_nome')}</div><div className="font-semibold">{modal.learningPath.nome}</div></div>
            <div><div className="text-slate-500">{t('admin_dash_col_state')}</div><div className="font-semibold">{modal.learningPath.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive')}</div></div>
            <div><div className="text-slate-500">{t('admin_lp_lbl_service_lines')}</div><div className="font-semibold">{modal.learningPath.total_service_lines || 0}</div></div>
            <div><div className="text-slate-500">{t('admin_lp_lbl_badges')}</div><div className="font-semibold">{modal.learningPath.total_badges || 0}</div></div>
            <div><div className="text-slate-500">{t('admin_lp_col_data_criacao')}</div><div className="font-semibold">{formatarData(modal.learningPath.created_at)}</div></div>
            <div><div className="text-slate-500">{t('admin_lp_lbl_ultima_atualizacao')}</div><div className="font-semibold">{formatarData(modal.learningPath.updated_at)}</div></div>
            <div className="md:col-span-2"><div className="text-slate-500">{t('admin_lp_descricao')}</div><div className="font-semibold">{modal.learningPath.descricao || '—'}</div></div>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'desativar' && (
        <Modal titulo={t('admin_lp_modal_desativar_titulo')} icon="warning" iconTone="amber" size="sm" onFechar={() => setModal(null)}>
          <div className="px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              {t('admin_lp_desativar_confirm').replace('{nome}', modal.learningPath.nome)}
            </p>
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>{t('admin_cancel')}</button>
            <button
              type="button"
              className="btn bg-orange-500 px-7 text-white hover:bg-orange-600"
              disabled={alternarEstado.isPending}
              onClick={() => {
                alternarEstado.mutate(modal.learningPath, { onSuccess: () => setModal(null) });
              }}
            >
              {alternarEstado.isPending ? t('admin_lp_a_confirmar') : t('admin_lp_confirmar')}
            </button>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'eliminar' && (
        <Modal titulo={t('admin_lp_modal_eliminar_titulo')} icon="warning" iconTone="rose" size="sm" onFechar={() => setModal(null)}>
          <div className="space-y-4 px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              {t('admin_lp_eliminar_confirm').replace('{nome}', modal.learningPath.nome)}
            </p>
            <p className="font-medium text-red-500">{t('admin_notif_irreversivel')}</p>
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>{t('admin_cancel')}</button>
            <button type="button" className="btn bg-red-600 px-7 text-white hover:bg-red-700" disabled={eliminar.isPending} onClick={() => eliminar.mutate()}>
              {eliminar.isPending ? t('admin_notif_a_eliminar') : t('admin_notif_eliminar')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
