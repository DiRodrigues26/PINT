import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Eye,
  FileText,
  KeyRound,
  Pencil,
  Power,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { descarregarCsv, imprimirTabela } from '../../lib/exportar';
import { formatarData, formatarDataHora } from '../../lib/formatar';
import Paginacao from '../../components/admin/Paginacao';
import { useLanguage } from '../../context/LanguageContext';

const PERFIS = ['Consultor', 'Talent Manager', 'Service Line', 'Administrador'];
const ESTADO_INICIAL = {
  nome: '',
  email: '',
  password: 'Temp12345',
  perfil: '',
  id_service_line: '',
  id_area: '',
  ativo: true,
  forcar_alteracao_password: true,
  enviar_email_confirmacao: true,
};

const ICONES = {
  search: Search,
  file: FileText,
  x: X,
  eye: Eye,
  edit: Pencil,
  power: Power,
  key: KeyRound,
  warning: TriangleAlert,
};

function Icon({ nome, className = 'h-5 w-5' }) {
  const Componente = ICONES[nome] || FileText;
  return <Componente className={className} aria-hidden="true" strokeWidth={1.8} />;
}

function perfilLabel(perfil, t) {
  const labels = {
    Consultor: t('admin_util_perfil_consultor'),
    'Talent Manager': t('admin_util_perfil_talent'),
    'Service Line': t('admin_util_perfil_sl'),
    Administrador: t('admin_role_long'),
  };
  return labels[perfil] || perfil || '—';
}

function perfisComoTexto(perfis, t) {
  if (Array.isArray(perfis)) return perfis.map((perfil) => perfilLabel(perfil, t)).join(', ');
  return perfilLabel(perfis, t);
}

function perfilPrincipal(perfis) {
  return Array.isArray(perfis) && perfis.length > 0 ? perfis[0] : '';
}

function normalizarForm(utilizador) {
  const perfil = perfilPrincipal(utilizador?.perfis) || 'Consultor';
  return {
    nome: utilizador?.nome || '',
    email: utilizador?.email || '',
    password: '',
    perfil,
    id_service_line: utilizador?.id_service_line ? String(utilizador.id_service_line) : '',
    id_area: utilizador?.id_area ? String(utilizador.id_area) : '',
    ativo: utilizador?.ativo !== 0,
    forcar_alteracao_password: true,
    enviar_email_confirmacao: true,
  };
}

function prepararPayload(form, incluirPassword = false) {
  const payload = {
    nome: form.nome.trim(),
    email: form.email.trim(),
    perfis: [form.perfil],
    ativo: form.ativo,
    id_area: form.perfil === 'Consultor' && form.id_area ? Number(form.id_area) : null,
    id_service_line: form.perfil === 'Service Line' && form.id_service_line ? Number(form.id_service_line) : null,
    primeiro_login_pendente: form.forcar_alteracao_password,
    enviar_email_confirmacao: form.enviar_email_confirmacao,
  };

  if (incluirPassword) payload.password = form.password;
  return payload;
}

function dadosUtilizadores(utilizadores, t) {
  const headers = [t('admin_lp_lbl_nome'), t('admin_rel_col_email'), t('admin_util_perfil'), 'Service Line', t('admin_rel_col_area'), t('admin_util_data_registo'), t('admin_dash_col_state'), t('admin_util_ultimo_login')];
  const linhas = utilizadores.map((u) => [
    u.nome,
    u.email,
    perfisComoTexto(u.perfis, t),
    u.nome_service_line || '',
    u.nome_area || '',
    formatarData(u.created_at),
    u.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive'),
    formatarDataHora(u.ultimo_login),
  ]);
  return { headers, linhas };
}

function Modal({ titulo, children, onFechar, icon, iconTone = 'blue', size = 'md' }) {
  const sizeClass = size === 'sm' ? 'max-w-xl' : 'max-w-2xl';
  const iconClass = {
    amber: 'bg-amber-100 text-amber-600',
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

function FormUtilizador({ form, setForm, serviceLines, areas, modo, onSubmit, onCancelar, loading, t }) {
  const areasFiltradas = useMemo(() => {
    if (!form.id_service_line) return areas;
    return areas.filter((a) => String(a.id_service_line) === String(form.id_service_line));
  }, [areas, form.id_service_line]);

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-5 px-7 py-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_util_nome_completo')}<span className="text-red-600">*</span></label>
          <input className="input" required placeholder={t('admin_util_placeholder_nome')} value={form.nome} onChange={(e) => atualizar('nome', e.target.value)} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">Email<span className="text-red-600">*</span></label>
          <input className="input" type="email" required placeholder="email@softinsa.pt" value={form.email} onChange={(e) => atualizar('email', e.target.value)} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_util_perfil')}<span className="text-red-600">*</span></label>
          <select className="input" required value={form.perfil} onChange={(e) => setForm((atual) => ({ ...atual, perfil: e.target.value, id_area: '', id_service_line: '' }))}>
            <option value="">{t('admin_util_select_perfil')}</option>
            {PERFIS.map((p) => <option key={p} value={p}>{perfilLabel(p, t)}</option>)}
          </select>
        </div>
        {(form.perfil === 'Consultor' || form.perfil === 'Service Line') && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">Service Line<span className="text-red-600">*</span></label>
            <select className="input" value={form.id_service_line} onChange={(e) => setForm((atual) => ({ ...atual, id_service_line: e.target.value, id_area: '' }))}>
              <option value="">{t('admin_util_selecionar')}</option>
              {serviceLines.map((sl) => <option key={sl.id_service_line} value={sl.id_service_line}>{sl.nome}</option>)}
            </select>
          </div>
        )}
        {form.perfil === 'Consultor' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_rel_col_area')}<span className="text-red-600">*</span></label>
            <select className="input" value={form.id_area} onChange={(e) => atualizar('id_area', e.target.value)}>
              <option value="">{t('admin_util_selecionar')}</option>
              {areasFiltradas.map((area) => <option key={area.id_area} value={area.id_area}>{area.nome}</option>)}
            </select>
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
      {modo === 'criar' && (
        <div className="space-y-2 border-t-4 border-slate-200 px-7 py-4">
          <label className="flex items-start gap-2 text-sm font-semibold text-slate-900">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-softinsa-600" checked={form.forcar_alteracao_password} onChange={(e) => atualizar('forcar_alteracao_password', e.target.checked)} />
            <span>
              {t('admin_util_forcar_password')}
              <span className="block text-xs font-normal text-slate-500">{t('admin_util_forcar_password_desc')}</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm font-semibold text-slate-900">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-softinsa-600" checked={form.enviar_email_confirmacao} onChange={(e) => atualizar('enviar_email_confirmacao', e.target.checked)} />
            <span>
              {t('admin_util_enviar_email')}
              <span className="block text-xs font-normal text-slate-500">{t('admin_util_enviar_email_desc')}</span>
            </span>
          </label>
        </div>
      )}
      <div className="flex justify-end gap-3 border-t-4 border-slate-200 px-7 py-5">
        <button type="button" className="btn-secondary" onClick={onCancelar}>{t('admin_cancel')}</button>
        <button type="submit" className="btn-primary min-w-44" disabled={loading}>
          {loading ? t('admin_lp_a_guardar') : modo === 'criar' ? t('admin_util_criar') : t('admin_util_atualizar')}
        </button>
      </div>
    </form>
  );
}

export default function AdminUtilizadores() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState({ pesquisa: '', perfil: '', id_service_line: '', ativo: '' });
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(ESTADO_INICIAL);

  const utilizadores = useQuery({
    queryKey: ['admin', 'utilizadores', filtros, pagina],
    queryFn: async () => (await api.get('/api/utilizadores', {
      params: {
        pagina,
        por_pagina: 5,
        pesquisa: filtros.pesquisa || undefined,
        perfil: filtros.perfil || undefined,
        id_service_line: filtros.id_service_line || undefined,
        ativo: filtros.ativo || undefined,
      },
    })).data,
  });

  const serviceLines = useQuery({
    queryKey: ['admin', 'service-lines'],
    queryFn: async () => (await api.get('/api/service-lines')).data,
  });

  const areas = useQuery({
    queryKey: ['admin', 'areas'],
    queryFn: async () => (await api.get('/api/areas')).data,
  });

  const criar = useMutation({
    mutationFn: async () => (await api.post('/api/utilizadores', prepararPayload(form, true))).data,
    onSuccess: () => {
      toast.success(t('admin_util_toast_criado'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'utilizadores'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const atualizar = useMutation({
    mutationFn: async () => (await api.put(`/api/utilizadores/${modal.utilizador.id_utilizador}`, prepararPayload(form))).data,
    onSuccess: () => {
      toast.success(t('admin_util_toast_atualizado'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'utilizadores'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const alternarEstado = useMutation({
    mutationFn: async (u) => (await api.put(`/api/utilizadores/${u.id_utilizador}`, { ativo: !u.ativo })).data,
    onSuccess: () => {
      toast.success(t('admin_lp_toast_estado_atualizado'));
      qc.invalidateQueries({ queryKey: ['admin', 'utilizadores'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const reporPassword = useMutation({
    mutationFn: async () => (await api.post(`/api/utilizadores/${modal.utilizador.id_utilizador}/repor-password`)).data,
    onSuccess: () => {
      toast.success(t('admin_util_toast_password'));
      setModal(null);
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const lista = utilizadores.data?.dados || [];
  const total = utilizadores.data?.total || 0;
  const porPagina = utilizadores.data?.por_pagina || 5;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const linhasMostradas = lista.length;

  function abrirCriacao() {
    setForm(ESTADO_INICIAL);
    setModal({ tipo: 'criar' });
  }

  function abrirEdicao(utilizador) {
    setForm(normalizarForm(utilizador));
    setModal({ tipo: 'editar', utilizador });
  }

  function limparFiltros() {
    setFiltros({ pesquisa: '', perfil: '', id_service_line: '', ativo: '' });
    setPagina(1);
  }

  const carregando = utilizadores.isLoading || serviceLines.isLoading || areas.isLoading;
  const sls = serviceLines.data?.dados || [];
  const listaAreas = areas.data?.dados || [];

  async function obterTodosFiltrados() {
    const paramsBase = {
      pesquisa: filtros.pesquisa || undefined,
      perfil: filtros.perfil || undefined,
      id_service_line: filtros.id_service_line || undefined,
      ativo: filtros.ativo || undefined,
      por_pagina: 100,
    };
    const primeira = (await api.get('/api/utilizadores', { params: { ...paramsBase, pagina: 1 } })).data;
    const todos = [...(primeira.dados || [])];
    const totalPaginasExport = Math.ceil((primeira.total || 0) / (primeira.por_pagina || 100));

    for (let p = 2; p <= totalPaginasExport; p += 1) {
      const resposta = (await api.get('/api/utilizadores', { params: { ...paramsBase, pagina: p } })).data;
      todos.push(...(resposta.dados || []));
    }

    return todos;
  }

  async function exportarExcel() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosUtilizadores(todos, t);
      descarregarCsv('utilizadores.csv', headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_util_erro_exportar_excel')));
    }
  }

  async function exportarPdf() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosUtilizadores(todos, t);
      imprimirTabela(t('admin_menu_utilizadores'), headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_lp_erro_exportar_pdf')));
    }
  }

  return (
    <div className="mx-auto max-w-[1560px] space-y-7">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin_menu_utilizadores')}</h1>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={exportarExcel}>
            <Icon nome="file" className="h-4 w-4" /> {t('admin_sla_export_excel')}
          </button>
          <button type="button" className="btn-secondary" onClick={exportarPdf}>
            <Icon nome="file" className="h-4 w-4" /> {t('admin_sla_export_pdf')}
          </button>
          <button type="button" className="btn-primary" onClick={abrirCriacao}>{t('admin_util_criar')}</button>
        </div>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_200px_220px_200px_200px]">
          <label className="relative block">
            <Icon nome="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder={t('admin_util_pesquisar')}
              value={filtros.pesquisa}
              onChange={(e) => { setFiltros((f) => ({ ...f, pesquisa: e.target.value })); setPagina(1); }}
            />
          </label>
          <select className="input" value={filtros.perfil} onChange={(e) => { setFiltros((f) => ({ ...f, perfil: e.target.value })); setPagina(1); }}>
            <option value="">{t('admin_util_perfil_todos')}</option>
            {PERFIS.map((p) => <option key={p} value={p}>{perfilLabel(p, t)}</option>)}
          </select>
          <select className="input" value={filtros.id_service_line} onChange={(e) => { setFiltros((f) => ({ ...f, id_service_line: e.target.value })); setPagina(1); }}>
            <option value="">{t('admin_areas_sls_todas')}</option>
            {sls.map((sl) => <option key={sl.id_service_line} value={sl.id_service_line}>{sl.nome}</option>)}
          </select>
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
          <table className="min-w-[1320px] w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-4 text-left">{t('admin_lp_lbl_nome')}</th>
                <th className="px-4 py-4 text-left">{t('admin_rel_col_email')}</th>
                <th className="px-4 py-4 text-left">{t('admin_util_perfil')}</th>
                <th className="px-4 py-4 text-left">Service Line</th>
                <th className="px-4 py-4 text-left">{t('admin_rel_col_area')}</th>
                <th className="px-4 py-4 text-center">{t('admin_util_data_registo')}</th>
                <th className="px-4 py-4 text-center">{t('admin_dash_col_state')}</th>
                <th className="px-4 py-4 text-center">{t('admin_util_ultimo_login')}</th>
                <th className="px-4 py-4 text-center">{t('admin_sla_col_acoes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {carregando ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">{t('admin_util_a_carregar')}</td></tr>
              ) : lista.map((u) => (
                <tr key={u.id_utilizador} className="text-slate-700">
                  <td className="px-4 py-5 font-medium text-slate-800">{u.nome}</td>
                  <td className="px-4 py-5 text-slate-500">{u.email}</td>
                  <td className="px-4 py-5">{perfisComoTexto(u.perfis, t)}</td>
                  <td className="px-4 py-5 text-slate-500">{u.nome_service_line || '—'}</td>
                  <td className="px-4 py-5 text-slate-500">{u.nome_area || '—'}</td>
                  <td className="px-4 py-5 text-center text-slate-600">{formatarData(u.created_at)}</td>
                  <td className="px-4 py-5 text-center">
                    <span className={`badge-pill ${u.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {u.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-center text-slate-600">{formatarDataHora(u.ultimo_login)}</td>
                  <td className="px-4 py-5 text-center">
                    <div className="flex items-center justify-center gap-4 text-softinsa-700">
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_ver')} onClick={() => setModal({ tipo: 'ver', utilizador: u })}><Icon nome="eye" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_editar')} onClick={() => abrirEdicao(u)}><Icon nome="edit" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={u.ativo ? t('admin_lp_desativar') : t('admin_lp_ativar')} onClick={() => u.ativo ? setModal({ tipo: 'desativar', utilizador: u }) : alternarEstado.mutate(u)}><Icon nome="power" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_util_repor_password')} onClick={() => setModal({ tipo: 'password', utilizador: u })}><Icon nome="key" className="h-5 w-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!carregando && lista.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">{t('admin_util_vazio')}</td></tr>
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
          rotulo={t('admin_short_utilizadores').toLowerCase()}
        />
      </section>

      {modal?.tipo === 'criar' && (
        <Modal titulo={t('admin_util_criar')} onFechar={() => setModal(null)}>
          <FormUtilizador
            form={form}
            setForm={setForm}
            serviceLines={sls}
            areas={listaAreas}
            modo="criar"
            onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={criar.isPending}
            t={t}
          />
        </Modal>
      )}

      {modal?.tipo === 'editar' && (
        <Modal titulo={t('admin_util_editar')} onFechar={() => setModal(null)}>
          <FormUtilizador
            form={form}
            setForm={setForm}
            serviceLines={sls}
            areas={listaAreas}
            modo="editar"
            onSubmit={(e) => { e.preventDefault(); atualizar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={atualizar.isPending}
            t={t}
          />
        </Modal>
      )}

      {modal?.tipo === 'ver' && (
        <Modal titulo={t('admin_util_detalhe')} onFechar={() => setModal(null)}>
          <div className="grid grid-cols-1 gap-4 px-6 py-5 text-sm md:grid-cols-2">
            <div><div className="text-slate-500">{t('admin_lp_lbl_nome')}</div><div className="font-semibold">{modal.utilizador.nome}</div></div>
            <div><div className="text-slate-500">{t('admin_rel_col_email')}</div><div className="font-semibold">{modal.utilizador.email}</div></div>
            <div><div className="text-slate-500">{t('admin_util_perfil')}</div><div className="font-semibold">{perfisComoTexto(modal.utilizador.perfis, t)}</div></div>
            <div><div className="text-slate-500">Service Line</div><div className="font-semibold">{modal.utilizador.nome_service_line || '—'}</div></div>
            <div><div className="text-slate-500">{t('admin_rel_col_area')}</div><div className="font-semibold">{modal.utilizador.nome_area || '—'}</div></div>
            <div><div className="text-slate-500">{t('admin_util_data_registo')}</div><div className="font-semibold">{formatarData(modal.utilizador.created_at)}</div></div>
            <div><div className="text-slate-500">{t('admin_util_ultimo_login')}</div><div className="font-semibold">{formatarDataHora(modal.utilizador.ultimo_login)}</div></div>
            <div><div className="text-slate-500">{t('admin_dash_col_state')}</div><div className="font-semibold">{modal.utilizador.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive')}</div></div>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'password' && (
        <Modal titulo={t('admin_util_reset_password')} icon="warning" iconTone="amber" size="sm" onFechar={() => setModal(null)}>
          <div className="px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              {t('admin_util_reset_confirm').replace('{nome}', modal.utilizador.nome)}
            </p>
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>{t('admin_cancel')}</button>
            <button type="button" className="btn bg-orange-500 px-7 text-white hover:bg-orange-600" disabled={reporPassword.isPending} onClick={() => reporPassword.mutate()}>
              {reporPassword.isPending ? t('admin_lp_a_confirmar') : t('admin_lp_confirmar')}
            </button>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'desativar' && (
        <Modal titulo={t('admin_util_desativar')} icon="warning" iconTone="amber" size="sm" onFechar={() => setModal(null)}>
          <div className="px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              {t('admin_util_desativar_confirm').replace('{nome}', modal.utilizador.nome)}
            </p>
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>{t('admin_cancel')}</button>
            <button
              type="button"
              className="btn bg-orange-500 px-7 text-white hover:bg-orange-600"
              disabled={alternarEstado.isPending}
              onClick={() => {
                alternarEstado.mutate(modal.utilizador, { onSuccess: () => setModal(null) });
              }}
            >
              {alternarEstado.isPending ? t('admin_areas_a_desativar') : t('admin_lp_desativar')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
