import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Eye,
  FileText,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Paginacao from '../../components/admin/Paginacao';
import { useLanguage } from '../../context/LanguageContext';
import { api, extrairErro } from '../../lib/api';
import { descarregarCsv, imprimirTabela } from '../../lib/exportar';
import { formatarDataHora } from '../../lib/formatar';

const FORM_INICIAL = {
  id_utilizador: '',
  nome_template: '',
  html_template: '',
  ativo: true,
};

const POR_PAGINA = 5;

function estadoTemplate(item, t) {
  return item.ativo
    ? { label: t('admin_dash_notice_active'), cls: 'bg-emerald-100 text-emerald-700' }
    : { label: t('admin_dash_notice_inactive'), cls: 'bg-slate-100 text-slate-500' };
}

function prepararPayload(form) {
  return {
    id_utilizador: Number(form.id_utilizador),
    nome_template: form.nome_template.trim(),
    html_template: form.html_template.trim(),
    ativo: Boolean(form.ativo),
  };
}

function dadosTemplates(items, t) {
  const headers = [
    t('admin_templates_nome'),
    t('admin_templates_utilizador'),
    'Email',
    t('admin_dash_col_state'),
    t('admin_rgpd_atualizacao'),
  ];
  const linhas = items.map((item) => [
    item.nome_template,
    item.nome_utilizador || '—',
    item.email_utilizador || '—',
    estadoTemplate(item, t).label,
    formatarDataHora(item.updated_at),
  ]);
  return { headers, linhas };
}

async function obterTodosUtilizadores() {
  const todos = [];
  let pagina = 1;
  let total = 0;
  do {
    const { data } = await api.get('/api/utilizadores', { params: { pagina, por_pagina: 100 } });
    todos.push(...(data.dados || []));
    total = Number(data.total) || todos.length;
    pagina += 1;
  } while (todos.length < total);
  return { dados: todos };
}

function Modal({ titulo, children, onFechar, size = 'max-w-3xl' }) {
  return (
    <div className="fixed inset-x-0 -top-8 bottom-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 pt-8">
      <div className={`max-h-[90vh] w-full ${size} overflow-hidden rounded-2xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-softinsa-100 text-softinsa-700">
              <Mail className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{titulo}</h2>
          </div>
          <button type="button" onClick={onFechar} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormTemplate({ form, setForm, utilizadores, onSubmit, onCancelar, loading, modo, t }) {
  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="max-h-[calc(90vh-140px)] space-y-5 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_260px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              {t('admin_templates_nome')}<span className="text-red-600">*</span>
            </label>
            <input
              className="input"
              required
              maxLength={150}
              value={form.nome_template}
              onChange={(e) => atualizar('nome_template', e.target.value)}
              placeholder={t('admin_templates_nome_placeholder')}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              {t('admin_templates_utilizador')}<span className="text-red-600">*</span>
            </label>
            <select
              className="input"
              required
              value={form.id_utilizador}
              onChange={(e) => atualizar('id_utilizador', e.target.value)}
            >
              <option value="">{t('admin_templates_selecionar_utilizador')}</option>
              {utilizadores.map((u) => (
                <option key={u.id_utilizador} value={u.id_utilizador}>
                  {u.nome} - {u.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            {t('admin_templates_html')}<span className="text-red-600">*</span>
          </label>
          <textarea
            className="input min-h-[260px] resize-y font-mono text-xs leading-5"
            required
            value={form.html_template}
            onChange={(e) => atualizar('html_template', e.target.value)}
            placeholder={t('admin_templates_html_placeholder')}
          />
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-softinsa-600 focus:ring-softinsa-500"
            checked={Boolean(form.ativo)}
            onChange={(e) => atualizar('ativo', e.target.checked)}
          />
          <span className="font-semibold text-slate-900">{t('admin_templates_ativo')}</span>
        </label>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button type="button" className="btn-secondary px-5" onClick={onCancelar}>{t('admin_cancel')}</button>
        <button type="submit" className="btn-primary min-w-44" disabled={loading}>
          {loading ? t('admin_lp_a_guardar') : modo === 'criar' ? t('admin_templates_criar') : t('admin_templates_guardar')}
        </button>
      </div>
    </form>
  );
}

function PreviewTemplate({ html }) {
  return (
    <iframe
      title="preview"
      sandbox=""
      srcDoc={html || '<p style="font-family: Arial, sans-serif; color: #64748b;">Sem conteúdo</p>'}
      className="h-[420px] w-full rounded-xl border border-slate-200 bg-white"
    />
  );
}

export default function AdminTemplatesEmail() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState({ pesquisa: '', id_utilizador: '', ativo: '' });
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);

  const templates = useQuery({
    queryKey: ['admin', 'templates-email'],
    queryFn: async () => (await api.get('/api/templates-email')).data,
  });

  const utilizadores = useQuery({
    queryKey: ['admin', 'templates-email', 'utilizadores'],
    queryFn: obterTodosUtilizadores,
  });

  const listaUtilizadores = utilizadores.data?.dados || [];
  const items = templates.data?.dados || [];

  const filtrados = useMemo(() => {
    const termo = filtros.pesquisa.trim().toLowerCase();
    return items.filter((item) => {
      const texto = `${item.nome_template} ${item.nome_utilizador || ''} ${item.email_utilizador || ''} ${item.html_template || ''}`.toLowerCase();
      if (termo && !texto.includes(termo)) return false;
      if (filtros.id_utilizador && String(item.id_utilizador) !== String(filtros.id_utilizador)) return false;
      if (filtros.ativo !== '' && Number(Boolean(item.ativo)) !== Number(filtros.ativo)) return false;
      return true;
    });
  }, [filtros, items]);

  const total = filtrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const lista = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  function invalidar() {
    qc.invalidateQueries({ queryKey: ['admin', 'templates-email'] });
  }

  const criar = useMutation({
    mutationFn: async () => (await api.post('/api/templates-email', prepararPayload(form))).data,
    onSuccess: () => {
      toast.success(t('admin_templates_toast_criado'));
      setModal(null);
      invalidar();
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const atualizar = useMutation({
    mutationFn: async () => (await api.put(`/api/templates-email/${modal.template.id_template}`, prepararPayload(form))).data,
    onSuccess: () => {
      toast.success(t('admin_templates_toast_atualizado'));
      setModal(null);
      invalidar();
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const eliminar = useMutation({
    mutationFn: async () => (await api.delete(`/api/templates-email/${modal.template.id_template}`)).data,
    onSuccess: () => {
      toast.success(t('admin_templates_toast_eliminado'));
      setModal(null);
      invalidar();
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  function abrirCriacao() {
    setForm(FORM_INICIAL);
    setModal({ tipo: 'criar' });
  }

  function abrirEdicao(template) {
    setForm({
      id_utilizador: String(template.id_utilizador || ''),
      nome_template: template.nome_template || '',
      html_template: template.html_template || '',
      ativo: template.ativo !== 0,
    });
    setModal({ tipo: 'editar', template });
  }

  function exportarExcel() {
    const { headers, linhas } = dadosTemplates(filtrados, t);
    descarregarCsv('templates_email.csv', headers, linhas);
  }

  function exportarPdf() {
    const { headers, linhas } = dadosTemplates(filtrados, t);
    imprimirTabela(t('admin_templates_titulo'), headers, linhas);
  }

  function limparFiltros() {
    setFiltros({ pesquisa: '', id_utilizador: '', ativo: '' });
    setPagina(1);
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin_templates_titulo')}</h1>
          <p className="mt-2 text-sm text-slate-500">{t('admin_templates_subtitulo')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={exportarExcel}>
            <FileText className="h-4 w-4" strokeWidth={1.8} /> {t('admin_sla_export_excel')}
          </button>
          <button type="button" className="btn-secondary" onClick={exportarPdf}>
            <FileText className="h-4 w-4" strokeWidth={1.8} /> {t('admin_sla_export_pdf')}
          </button>
          <button type="button" className="btn-primary" onClick={abrirCriacao}>
            <Plus className="h-4 w-4" strokeWidth={1.8} /> {t('admin_templates_novo')}
          </button>
        </div>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
            <input
              className="input pl-10"
              placeholder={t('admin_templates_pesquisar')}
              value={filtros.pesquisa}
              onChange={(e) => { setFiltros((f) => ({ ...f, pesquisa: e.target.value })); setPagina(1); }}
            />
          </label>
          <select className="input" value={filtros.id_utilizador} onChange={(e) => { setFiltros((f) => ({ ...f, id_utilizador: e.target.value })); setPagina(1); }}>
            <option value="">{t('admin_templates_todos_utilizadores')}</option>
            {listaUtilizadores.map((u) => (
              <option key={u.id_utilizador} value={u.id_utilizador}>{u.nome}</option>
            ))}
          </select>
          <select className="input" value={filtros.ativo} onChange={(e) => { setFiltros((f) => ({ ...f, ativo: e.target.value })); setPagina(1); }}>
            <option value="">{t('admin_notif_estado_todos')}</option>
            <option value="1">{t('admin_dash_notice_active')}</option>
            <option value="0">{t('admin_dash_notice_inactive')}</option>
          </select>
          <button type="button" className="btn-secondary border-softinsa-600 text-softinsa-700" onClick={limparFiltros}>
            <X className="h-4 w-4" strokeWidth={1.8} /> {t('admin_notif_limpar_filtros')}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left">{t('admin_templates_nome')}</th>
                <th className="px-5 py-4 text-left">{t('admin_templates_utilizador')}</th>
                <th className="px-5 py-4 text-center">{t('admin_dash_col_state')}</th>
                <th className="px-5 py-4 text-center">{t('admin_rgpd_atualizacao')}</th>
                <th className="px-5 py-4 text-center">{t('admin_sla_col_acoes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {templates.isLoading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">{t('admin_templates_a_carregar')}</td></tr>
              ) : lista.map((item) => {
                const estado = estadoTemplate(item, t);
                return (
                  <tr key={item.id_template} className="text-slate-700">
                    <td className="px-5 py-6 font-semibold text-slate-800">{item.nome_template}</td>
                    <td className="px-5 py-6">
                      <div className="font-medium text-slate-800">{item.nome_utilizador || '—'}</div>
                      <div className="text-xs text-slate-500">{item.email_utilizador || '—'}</div>
                    </td>
                    <td className="px-5 py-6 text-center">
                      <span className={`badge-pill ${estado.cls}`}>{estado.label}</span>
                    </td>
                    <td className="px-5 py-6 text-center text-slate-600">{formatarDataHora(item.updated_at)}</td>
                    <td className="px-5 py-6">
                      <div className="flex items-center justify-center gap-4 text-softinsa-700">
                        <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_rgpd_ver_detalhe')} onClick={() => setModal({ tipo: 'ver', template: item })}>
                          <Eye className="h-5 w-5" strokeWidth={1.8} />
                        </button>
                        <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_editar')} onClick={() => abrirEdicao(item)}>
                          <Pencil className="h-5 w-5" strokeWidth={1.8} />
                        </button>
                        <button type="button" className="rounded-md p-1 text-red-600 hover:bg-red-50" title={t('admin_notif_eliminar')} onClick={() => setModal({ tipo: 'eliminar', template: item })}>
                          <Trash2 className="h-5 w-5" strokeWidth={1.8} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!templates.isLoading && lista.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">{t('admin_templates_vazio')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Paginacao
          pagina={paginaAtual}
          totalPaginas={totalPaginas}
          total={total}
          porPagina={POR_PAGINA}
          itensNaPagina={lista.length}
          onMudarPagina={setPagina}
          className="px-10 py-5"
        />
      </section>

      {(modal?.tipo === 'criar' || modal?.tipo === 'editar') && (
        <Modal titulo={modal.tipo === 'criar' ? t('admin_templates_novo') : t('admin_templates_editar')} onFechar={() => setModal(null)}>
          <FormTemplate
            form={form}
            setForm={setForm}
            utilizadores={listaUtilizadores}
            modo={modal.tipo}
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.id_utilizador || !form.nome_template.trim() || !form.html_template.trim()) {
                toast.error(t('admin_templates_erro_obrigatorios'));
                return;
              }
              modal.tipo === 'criar' ? criar.mutate() : atualizar.mutate();
            }}
            onCancelar={() => setModal(null)}
            loading={criar.isPending || atualizar.isPending}
            t={t}
          />
        </Modal>
      )}

      {modal?.tipo === 'ver' && (
        <Modal titulo={t('admin_templates_detalhe')} onFechar={() => setModal(null)} size="max-w-4xl">
          <div className="max-h-[calc(90vh-92px)] overflow-y-auto px-6 py-5">
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div><div className="text-slate-500">{t('admin_templates_nome')}</div><div className="font-semibold">{modal.template.nome_template}</div></div>
              <div><div className="text-slate-500">{t('admin_templates_utilizador')}</div><div className="font-semibold">{modal.template.nome_utilizador || '—'}</div></div>
              <div><div className="text-slate-500">Email</div><div className="font-semibold">{modal.template.email_utilizador || '—'}</div></div>
              <div><div className="text-slate-500">{t('admin_dash_col_state')}</div><div className="font-semibold">{estadoTemplate(modal.template, t).label}</div></div>
            </div>
            <h3 className="mt-6 text-sm font-bold text-slate-900">{t('admin_templates_preview')}</h3>
            <div className="mt-3">
              <PreviewTemplate html={modal.template.html_template} />
            </div>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'eliminar' && (
        <Modal titulo={t('admin_templates_eliminar')} onFechar={() => setModal(null)} size="max-w-xl">
          <div className="space-y-4 px-6 py-6">
            <p className="text-sm leading-6 text-slate-600">
              {t('admin_templates_eliminar_confirm').replace('{nome}', modal.template.nome_template)}
            </p>
            <p className="font-medium text-red-500">{t('admin_notif_irreversivel')}</p>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button type="button" className="btn-secondary px-5" onClick={() => setModal(null)}>{t('admin_cancel')}</button>
            <button type="button" className="btn bg-red-600 px-7 text-white hover:bg-red-700" disabled={eliminar.isPending} onClick={() => eliminar.mutate()}>
              {eliminar.isPending ? t('admin_notif_a_eliminar') : t('admin_notif_eliminar')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
