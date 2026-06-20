import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
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
import Paginacao from '../../components/admin/Paginacao';
import { useLanguage } from '../../context/LanguageContext';

const ESTADO_INICIAL = {
  nome: '',
  descricao: '',
  id_learning_path: '',
  id_service_line: '',
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
};

function Icon({ nome, className = 'h-5 w-5' }) {
  const Componente = ICONES[nome] || FileText;
  return <Componente className={className} aria-hidden="true" strokeWidth={1.8} />;
}

function prepararPayload(form) {
  return {
    nome: form.nome.trim(),
    descricao: form.descricao?.trim() || null,
    id_service_line: Number(form.id_service_line),
    ativo: form.ativo,
  };
}

function dadosAreas(items, t) {
  const headers = [t('admin_areas_col_nome'), t('admin_rel_col_lp'), 'Service Line', t('admin_lp_col_data_criacao'), t('admin_dash_col_state')];
  const linhas = items.map((area) => [
    area.nome,
    area.nome_learning_path || '',
    area.nome_service_line || '',
    formatarData(area.created_at),
    area.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive'),
  ]);
  return { headers, linhas };
}

function dependenciasArea(area) {
  return {
    niveis: Number(area?.total_niveis) || 0,
    badges: Number(area?.total_badges) || 0,
    consultores: Number(area?.total_consultores) || 0,
  };
}

function areaTemDependencias(area) {
  const deps = dependenciasArea(area);
  return deps.niveis > 0 || deps.badges > 0 || deps.consultores > 0;
}

function textoDependenciasArea(area, t) {
  const deps = dependenciasArea(area);
  const partes = [];
  if (deps.niveis) partes.push(t('admin_areas_dep_niveis').replace('{total}', deps.niveis));
  if (deps.badges) partes.push(t('admin_areas_dep_badges').replace('{total}', deps.badges));
  if (deps.consultores) partes.push(t('admin_areas_dep_consultores').replace('{total}', deps.consultores));
  return partes.join(', ');
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

async function obterTodasServiceLines() {
  const primeira = (await api.get('/api/service-lines', { params: { pagina: 1, por_pagina: 100 } })).data;
  const todas = [...(primeira.dados || [])];
  const totalPaginas = Math.ceil((primeira.total || 0) / (primeira.por_pagina || 100));

  for (let p = 2; p <= totalPaginas; p += 1) {
    const resposta = (await api.get('/api/service-lines', { params: { pagina: p, por_pagina: 100 } })).data;
    todas.push(...(resposta.dados || []));
  }

  return { dados: todas };
}

function FormArea({ form, setForm, learningPaths, serviceLines, serviceLinesLoading, modo, onSubmit, onCancelar, loading, t }) {
  const serviceLinesDisponiveis = useMemo(() => {
    if (!form.id_learning_path) return serviceLines;
    return serviceLines.filter((sl) => String(sl.id_learning_path) === String(form.id_learning_path));
  }, [form.id_learning_path, serviceLines]);

  function atualizar(campo, valor) {
    setForm((atual) => {
      const proximo = { ...atual, [campo]: valor };
      if (campo === 'id_learning_path') {
        const serviceLineAtual = serviceLines.find((sl) => String(sl.id_service_line) === String(atual.id_service_line));
        if (!serviceLineAtual || String(serviceLineAtual.id_learning_path) !== String(valor)) {
          proximo.id_service_line = '';
        }
      }
      if (campo === 'id_service_line' && valor) {
        const serviceLineSelecionada = serviceLines.find((sl) => String(sl.id_service_line) === String(valor));
        if (serviceLineSelecionada?.id_learning_path) {
          proximo.id_learning_path = String(serviceLineSelecionada.id_learning_path);
        }
      }
      return proximo;
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-5 px-7 py-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            {t('admin_areas_col_nome')}<span className="text-red-600">*</span>
          </label>
          <input
            className="input"
            required
            placeholder={t('admin_rel_col_area')}
            value={form.nome}
            onChange={(e) => atualizar('nome', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            {t('admin_rel_col_lp')}<span className="text-red-600">*</span>
          </label>
          <select
            className="input"
            required
            value={form.id_learning_path}
            onChange={(e) => atualizar('id_learning_path', e.target.value)}
          >
            <option value="">{t('admin_sl_select_lp')}</option>
            {learningPaths.map((lp) => (
              <option key={lp.id_learning_path} value={lp.id_learning_path}>{lp.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            Service Line<span className="text-red-600">*</span>
          </label>
          <select
            className="input"
            required
            value={form.id_service_line}
            onChange={(e) => atualizar('id_service_line', e.target.value)}
          >
            <option value="">
              {serviceLinesLoading ? t('admin_areas_a_carregar_sls') : t('admin_areas_select_sl')}
            </option>
            {serviceLinesDisponiveis.map((sl) => (
              <option key={sl.id_service_line} value={sl.id_service_line}>{sl.nome}</option>
            ))}
            {!serviceLinesLoading && serviceLinesDisponiveis.length === 0 && (
              <option value="" disabled>{t('admin_areas_sem_sls_lp')}</option>
            )}
          </select>
        </div>
        {modo === 'editar' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_lp_descricao')}</label>
            <textarea
              className="input min-h-24 resize-y"
              placeholder={t('admin_areas_placeholder_descricao')}
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
        <button type="submit" className="btn-primary min-w-40" disabled={loading}>
          {loading ? t('admin_lp_a_guardar') : modo === 'criar' ? t('admin_areas_criar') : t('admin_areas_btn_atualizar')}
        </button>
      </div>
    </form>
  );
}

export default function AdminAreas() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState({ pesquisa: '', id_learning_path: '', id_service_line: '', ativo: '' });
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(ESTADO_INICIAL);

  const areas = useQuery({
    queryKey: ['admin', 'areas', filtros, pagina],
    queryFn: async () => (await api.get('/api/areas', {
      params: {
        pagina,
        por_pagina: 5,
        pesquisa: filtros.pesquisa || undefined,
        id_learning_path: filtros.id_learning_path || undefined,
        id_service_line: filtros.id_service_line || undefined,
        ativo: filtros.ativo || undefined,
      },
    })).data,
  });

  const learningPaths = useQuery({
    queryKey: ['admin', 'learning-paths', 'select'],
    queryFn: async () => (await api.get('/api/learning-paths', { params: { por_pagina: 100, pagina: 1 } })).data,
  });

  const serviceLines = useQuery({
    queryKey: ['admin', 'areas', 'service-lines-select'],
    queryFn: obterTodasServiceLines,
  });

  const criar = useMutation({
    mutationFn: async () => (await api.post('/api/areas', prepararPayload(form))).data,
    onSuccess: () => {
      toast.success(t('admin_areas_toast_criada'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'areas'] });
      qc.invalidateQueries({ queryKey: ['admin', 'service-lines'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const atualizar = useMutation({
    mutationFn: async () => (await api.put(`/api/areas/${modal.area.id_area}`, prepararPayload(form))).data,
    onSuccess: () => {
      toast.success(t('admin_areas_toast_atualizada'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'areas'] });
      qc.invalidateQueries({ queryKey: ['admin', 'service-lines'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const alternarEstado = useMutation({
    mutationFn: async (area) => (await api.put(`/api/areas/${area.id_area}`, { ativo: !area.ativo })).data,
    onSuccess: () => {
      toast.success(t('admin_lp_toast_estado_atualizado'));
      qc.invalidateQueries({ queryKey: ['admin', 'areas'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const eliminar = useMutation({
    mutationFn: async () => (await api.delete(`/api/areas/${modal.area.id_area}`)).data,
    onSuccess: () => {
      toast.success(t('admin_areas_toast_eliminada'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'areas'] });
      qc.invalidateQueries({ queryKey: ['admin', 'service-lines'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const lista = areas.data?.dados || [];
  const total = areas.data?.total || 0;
  const porPagina = areas.data?.por_pagina || 5;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const lps = learningPaths.data?.dados || [];
  const sls = serviceLines.data?.dados || [];

  const serviceLinesFiltro = useMemo(() => {
    if (!filtros.id_learning_path) return sls;
    return sls.filter((sl) => String(sl.id_learning_path) === String(filtros.id_learning_path));
  }, [filtros.id_learning_path, sls]);

  async function obterTodosFiltrados() {
    const paramsBase = {
      pesquisa: filtros.pesquisa || undefined,
      id_learning_path: filtros.id_learning_path || undefined,
      id_service_line: filtros.id_service_line || undefined,
      ativo: filtros.ativo || undefined,
      por_pagina: 100,
    };
    const primeira = (await api.get('/api/areas', { params: { ...paramsBase, pagina: 1 } })).data;
    const todos = [...(primeira.dados || [])];
    const totalPaginasExport = Math.ceil((primeira.total || 0) / (primeira.por_pagina || 100));

    for (let p = 2; p <= totalPaginasExport; p += 1) {
      const resposta = (await api.get('/api/areas', { params: { ...paramsBase, pagina: p } })).data;
      todos.push(...(resposta.dados || []));
    }

    return todos;
  }

  async function exportarExcel() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosAreas(todos, t);
      descarregarCsv('areas.csv', headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_areas_erro_exportar_excel')));
    }
  }

  async function exportarPdf() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosAreas(todos, t);
      imprimirTabela(t('admin_menu_areas'), headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_lp_erro_exportar_pdf')));
    }
  }

  function abrirCriacao() {
    if (learningPaths.isLoading || serviceLines.isLoading) {
      toast(t('admin_areas_a_carregar_hierarquia'));
      return;
    }
    if (lps.length === 0) {
      toast.error(t('admin_areas_erro_sem_lp'));
      return;
    }
    if (sls.length === 0) {
      toast.error(t('admin_areas_erro_sem_sl'));
      return;
    }

    setForm({ ...ESTADO_INICIAL });
    setModal({ tipo: 'criar' });
  }

  function abrirEdicao(area) {
    setForm({
      nome: area.nome || '',
      descricao: area.descricao || '',
      id_learning_path: area.id_learning_path ? String(area.id_learning_path) : '',
      id_service_line: area.id_service_line ? String(area.id_service_line) : '',
      ativo: area.ativo !== 0,
    });
    setModal({ tipo: 'editar', area });
  }

  function limparFiltros() {
    setFiltros({ pesquisa: '', id_learning_path: '', id_service_line: '', ativo: '' });
    setPagina(1);
  }

  function atualizarFiltro(campo, valor) {
    setFiltros((atual) => {
      const proximo = { ...atual, [campo]: valor };
      if (campo === 'id_learning_path') proximo.id_service_line = '';
      return proximo;
    });
    setPagina(1);
  }

  return (
    <div className="mx-auto max-w-[1420px] space-y-7">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin_menu_areas')}</h1>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={exportarExcel}>
            <Icon nome="file" className="h-4 w-4" /> {t('admin_sla_export_excel')}
          </button>
          <button type="button" className="btn-secondary" onClick={exportarPdf}>
            <Icon nome="download" className="h-4 w-4" /> {t('admin_sla_export_pdf')}
          </button>
          <button type="button" className="btn-primary" onClick={abrirCriacao}>
            <Icon nome="plus" className="h-4 w-4" /> {t('admin_areas_criar')}
          </button>
        </div>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_230px_230px_200px_200px]">
          <label className="relative block">
            <Icon nome="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder={t('admin_areas_pesquisar')}
              value={filtros.pesquisa}
              onChange={(e) => atualizarFiltro('pesquisa', e.target.value)}
            />
          </label>
          <select className="input" value={filtros.id_learning_path} onChange={(e) => atualizarFiltro('id_learning_path', e.target.value)}>
            <option value="">{t('admin_sl_lps_todos')}</option>
            {lps.map((lp) => <option key={lp.id_learning_path} value={lp.id_learning_path}>{lp.nome}</option>)}
          </select>
          <select className="input" value={filtros.id_service_line} onChange={(e) => atualizarFiltro('id_service_line', e.target.value)}>
            <option value="">{t('admin_areas_sls_todas')}</option>
            {serviceLinesFiltro.map((sl) => <option key={sl.id_service_line} value={sl.id_service_line}>{sl.nome}</option>)}
          </select>
          <select className="input" value={filtros.ativo} onChange={(e) => atualizarFiltro('ativo', e.target.value)}>
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
          <table className="min-w-[1120px] w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4 text-center">{t('admin_areas_col_nome')}</th>
                <th className="px-6 py-4 text-center">{t('admin_rel_col_lp')}</th>
                <th className="px-6 py-4 text-center">Service Line</th>
                <th className="px-6 py-4 text-center">{t('admin_lp_col_data_criacao')}</th>
                <th className="px-6 py-4 text-center">{t('admin_dash_col_state')}</th>
                <th className="px-6 py-4 text-center">{t('admin_sla_col_acoes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {areas.isLoading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">{t('admin_areas_a_carregar')}</td></tr>
              ) : lista.map((area) => (
                <tr key={area.id_area} className="text-slate-700">
                  <td className="px-6 py-5 text-center font-medium text-slate-800">{area.nome}</td>
                  <td className="px-6 py-5 text-center text-slate-500">{area.nome_learning_path}</td>
                  <td className="px-6 py-5 text-center text-slate-500">{area.nome_service_line}</td>
                  <td className="px-6 py-5 text-center text-slate-600">{formatarData(area.created_at)}</td>
                  <td className="px-6 py-5 text-center">
                    <span className={`badge-pill ${area.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {area.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-4 text-softinsa-700">
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_ver')} onClick={() => setModal({ tipo: 'ver', area })}><Icon nome="eye" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_editar')} onClick={() => abrirEdicao(area)}><Icon nome="edit" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={area.ativo ? t('admin_lp_desativar') : t('admin_lp_ativar')} onClick={() => area.ativo ? setModal({ tipo: 'desativar', area }) : alternarEstado.mutate(area)}><Icon nome="power" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 text-red-600 hover:bg-red-50" title={t('admin_notif_eliminar')} onClick={() => setModal({ tipo: 'eliminar', area })}><Icon nome="trash" className="h-5 w-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!areas.isLoading && lista.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">{t('admin_areas_vazio')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Paginacao
          pagina={pagina}
          totalPaginas={totalPaginas}
          total={total}
          porPagina={porPagina}
          itensNaPagina={lista.length}
          onMudarPagina={setPagina}
        />
      </section>

      {modal?.tipo === 'criar' && (
        <Modal titulo={t('admin_areas_modal_criar_titulo')} onFechar={() => setModal(null)}>
          <FormArea
            form={form}
            setForm={setForm}
            learningPaths={lps}
            serviceLines={sls}
            serviceLinesLoading={serviceLines.isLoading}
            modo="criar"
            onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={criar.isPending}
            t={t}
          />
        </Modal>
      )}

      {modal?.tipo === 'editar' && (
        <Modal titulo={t('admin_areas_modal_editar_titulo')} onFechar={() => setModal(null)}>
          <FormArea
            form={form}
            setForm={setForm}
            learningPaths={lps}
            serviceLines={sls}
            serviceLinesLoading={serviceLines.isLoading}
            modo="editar"
            onSubmit={(e) => { e.preventDefault(); atualizar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={atualizar.isPending}
            t={t}
          />
        </Modal>
      )}

      {modal?.tipo === 'ver' && (
        <Modal titulo={t('admin_areas_modal_detalhe_titulo')} onFechar={() => setModal(null)}>
          <div className="grid grid-cols-1 gap-4 px-7 py-5 text-sm md:grid-cols-2">
            <div><div className="text-slate-500">{t('admin_lp_lbl_nome')}</div><div className="font-semibold">{modal.area.nome}</div></div>
            <div><div className="text-slate-500">{t('admin_rel_col_lp')}</div><div className="font-semibold">{modal.area.nome_learning_path}</div></div>
            <div><div className="text-slate-500">Service Line</div><div className="font-semibold">{modal.area.nome_service_line}</div></div>
            <div><div className="text-slate-500">{t('admin_rel_col_nr_niveis')}</div><div className="font-semibold">{modal.area.total_niveis || 0}</div></div>
            <div><div className="text-slate-500">{t('admin_lp_lbl_badges')}</div><div className="font-semibold">{modal.area.total_badges || 0}</div></div>
            <div><div className="text-slate-500">{t('admin_areas_consultores_associados')}</div><div className="font-semibold">{modal.area.total_consultores || 0}</div></div>
            <div><div className="text-slate-500">{t('admin_lp_col_data_criacao')}</div><div className="font-semibold">{formatarData(modal.area.created_at)}</div></div>
            <div><div className="text-slate-500">{t('admin_dash_col_state')}</div><div className="font-semibold">{modal.area.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive')}</div></div>
            <div className="md:col-span-2"><div className="text-slate-500">{t('admin_lp_descricao')}</div><div className="font-semibold">{modal.area.descricao || '—'}</div></div>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'desativar' && (
        <Modal titulo={t('admin_areas_modal_desativar_titulo')} icon="warning" iconTone="amber" size="sm" onFechar={() => setModal(null)}>
          <div className="px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              {t('admin_areas_desativar_confirm').replace('{nome}', modal.area.nome)}
            </p>
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>{t('admin_cancel')}</button>
            <button
              type="button"
              className="btn bg-orange-500 px-7 text-white hover:bg-orange-600"
              disabled={alternarEstado.isPending}
              onClick={() => {
                alternarEstado.mutate(modal.area, { onSuccess: () => setModal(null) });
              }}
            >
              {alternarEstado.isPending ? t('admin_lp_a_confirmar') : t('admin_lp_confirmar')}
            </button>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'eliminar' && (
        <Modal titulo={t('admin_areas_modal_eliminar_titulo')} icon="warning" iconTone="rose" size="sm" onFechar={() => setModal(null)}>
          <div className="space-y-4 px-7 py-6">
            {areaTemDependencias(modal.area) ? (
              <>
                <p className="text-base leading-7 text-slate-600">
                  {t('admin_areas_eliminar_bloqueado').replace('{nome}', modal.area.nome).replace('{deps}', textoDependenciasArea(modal.area, t))}
                </p>
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  {t('admin_areas_eliminar_bloqueado_desc')}
                </p>
              </>
            ) : (
              <>
                <p className="text-base leading-7 text-slate-600">
                  {t('admin_areas_eliminar_confirm').replace('{nome}', modal.area.nome)}
                </p>
                <p className="font-medium text-red-500">{t('admin_notif_irreversivel')}</p>
              </>
            )}
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>{t('admin_cancel')}</button>
            {areaTemDependencias(modal.area) && modal.area.ativo ? (
              <button
                type="button"
                className="btn bg-orange-500 px-7 text-white hover:bg-orange-600"
                disabled={alternarEstado.isPending}
                onClick={() => {
                  alternarEstado.mutate(modal.area, { onSuccess: () => setModal(null) });
                }}
              >
                {alternarEstado.isPending ? t('admin_areas_a_desativar') : t('admin_areas_desativar')}
              </button>
            ) : (
              <button type="button" className="btn bg-red-600 px-7 text-white hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400" disabled={eliminar.isPending || areaTemDependencias(modal.area)} onClick={() => eliminar.mutate()}>
              {eliminar.isPending ? t('admin_notif_a_eliminar') : t('admin_notif_eliminar')}
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
