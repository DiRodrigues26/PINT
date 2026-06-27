import { useMemo, useState } from 'react';
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
import { descarregarCsv, imprimirTabela } from '../../lib/exportar';
import { formatarData, formatarDataHora } from '../../lib/formatar';
import Paginacao from '../../components/admin/Paginacao';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import { useLanguage } from '../../context/LanguageContext';

const ESTADO_INICIAL = {
  titulo: '',
  conteudo: '',
  tipo: 'INFORMACAO',
  data_inicio: '',
  data_fim: '',
  ativo: true,
};

const TIPO_CORES = {
  INFORMACAO: 'bg-blue-100 text-blue-700',
  AVISO: 'bg-amber-100 text-amber-800',
  PEDIDO: 'bg-violet-100 text-violet-700',
};

const POR_PAGINA = 5;

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

function tipoAviso(tipo, t) {
  const labels = {
    INFORMACAO: t('admin_avisos_tipo_informacao'),
    AVISO: t('admin_avisos_tipo_aviso'),
    PEDIDO: t('admin_avisos_tipo_pedido'),
  };
  return { label: labels[tipo] || tipo || '—', cor: TIPO_CORES[tipo] || 'bg-slate-100 text-slate-700' };
}

function paraInputDataHora(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function paraMysqlDataHora(valor) {
  if (!valor) return null;
  return `${valor.replace('T', ' ')}:00`;
}

function vigenciaAviso(aviso, t) {
  if (aviso.data_inicio && aviso.data_fim) {
    return `${formatarData(aviso.data_inicio)} — ${formatarData(aviso.data_fim)}`;
  }
  if (aviso.data_inicio) return t('admin_avisos_desde').replace('{data}', formatarData(aviso.data_inicio));
  if (aviso.data_fim) return t('admin_avisos_ate').replace('{data}', formatarData(aviso.data_fim));
  return t('admin_avisos_permanente');
}

function prepararPayload(form) {
  return {
    titulo: form.titulo.trim(),
    conteudo: form.conteudo?.trim() || null,
    tipo: form.tipo,
    data_inicio: paraMysqlDataHora(form.data_inicio),
    data_fim: paraMysqlDataHora(form.data_fim),
    ativo: form.ativo,
  };
}

function dadosAvisos(items, t) {
  const headers = [
    t('admin_rel_col_titulo'),
    t('admin_rel_col_tipo'),
    t('admin_rel_col_criador'),
    t('admin_avisos_col_vigencia'),
    t('admin_lp_col_data_criacao'),
    t('admin_dash_col_state'),
  ];
  const linhas = items.map((aviso) => [
    aviso.titulo,
    tipoAviso(aviso.tipo, t).label,
    aviso.nome_criador || '—',
    vigenciaAviso(aviso, t),
    formatarData(aviso.created_at),
    aviso.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive'),
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

function FormAviso({ form, setForm, modo, onSubmit, onCancelar, loading, t }) {
  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-5 px-7 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              {t('admin_rel_col_titulo')}<span className="text-red-600">*</span>
            </label>
            <input
              className="input"
              required
              placeholder={t('admin_avisos_placeholder_titulo')}
              value={form.titulo}
              onChange={(e) => atualizar('titulo', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_rel_col_tipo')}</label>
            <select className="input" value={form.tipo} onChange={(e) => atualizar('tipo', e.target.value)}>
              <option value="INFORMACAO">{t('admin_avisos_tipo_informacao')}</option>
              <option value="AVISO">{t('admin_avisos_tipo_aviso')}</option>
              <option value="PEDIDO">{t('admin_avisos_tipo_pedido')}</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_avisos_conteudo')}</label>
          <textarea
            className="input min-h-28 resize-y"
            placeholder={t('admin_avisos_placeholder_conteudo')}
            value={form.conteudo || ''}
            onChange={(e) => atualizar('conteudo', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_avisos_inicio_publicacao')}</label>
            <input
              type="datetime-local"
              className="input"
              value={form.data_inicio}
              onChange={(e) => atualizar('data_inicio', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_avisos_fim_publicacao')}</label>
            <input
              type="datetime-local"
              className="input"
              value={form.data_fim}
              onChange={(e) => atualizar('data_fim', e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          {t('admin_avisos_sem_datas')}
        </p>
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
          {loading ? t('admin_lp_a_guardar') : modo === 'criar' ? t('admin_avisos_criar') : t('admin_avisos_btn_atualizar')}
        </button>
      </div>
    </form>
  );
}

export default function ServiceLineAvisos() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState({ pesquisa: '', tipo: '', ativo: '' });
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(ESTADO_INICIAL);

  const avisos = useQuery({
    queryKey: ['sl', 'avisos'],
    queryFn: async () => (await api.get('/api/avisos/todos')).data,
  });

  function validarDatas() {
    if (form.data_inicio && form.data_fim && form.data_fim < form.data_inicio) {
      toast.error(t('admin_avisos_erro_datas'));
      return false;
    }
    return true;
  }

  function aposGravar(mensagem) {
    return () => {
      toast.success(mensagem);
      setModal(null);
      qc.invalidateQueries({ queryKey: ['sl', 'avisos'] });
    };
  }

  const criar = useMutation({
    mutationFn: async () => (await api.post('/api/avisos', prepararPayload(form))).data,
    onSuccess: aposGravar(t('admin_avisos_toast_criado')),
    onError: (err) => toast.error(extrairErro(err)),
  });

  const atualizar = useMutation({
    mutationFn: async () => (await api.put(`/api/avisos/${modal.aviso.id_aviso}`, prepararPayload(form))).data,
    onSuccess: aposGravar(t('admin_avisos_toast_atualizado')),
    onError: (err) => toast.error(extrairErro(err)),
  });

  const alternarEstado = useMutation({
    mutationFn: async (aviso) => (await api.put(`/api/avisos/${aviso.id_aviso}`, { ativo: !aviso.ativo })).data,
    onSuccess: () => {
      toast.success(t('admin_lp_toast_estado_atualizado'));
      qc.invalidateQueries({ queryKey: ['sl', 'avisos'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const eliminar = useMutation({
    mutationFn: async () => (await api.delete(`/api/avisos/${modal.aviso.id_aviso}`)).data,
    onSuccess: aposGravar(t('admin_avisos_toast_eliminado')),
    onError: (err) => toast.error(extrairErro(err)),
  });

  const todosFiltrados = useMemo(() => {
    const lista = avisos.data?.dados || [];
    const pesquisa = filtros.pesquisa.trim().toLowerCase();
    return lista.filter((aviso) => {
      if (pesquisa && !`${aviso.titulo} ${aviso.conteudo || ''}`.toLowerCase().includes(pesquisa)) return false;
      if (filtros.tipo && aviso.tipo !== filtros.tipo) return false;
      if (filtros.ativo !== '' && Number(Boolean(aviso.ativo)) !== Number(filtros.ativo)) return false;
      return true;
    });
  }, [avisos.data, filtros]);

  const total = todosFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const lista = todosFiltrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  function exportarExcel() {
    const { headers, linhas } = dadosAvisos(todosFiltrados, t);
    descarregarCsv('avisos.csv', headers, linhas);
  }

  function exportarPdf() {
    const { headers, linhas } = dadosAvisos(todosFiltrados, t);
    imprimirTabela(t('admin_avisos_titulo'), headers, linhas);
  }

  function abrirCriacao() {
    setForm(ESTADO_INICIAL);
    setModal({ tipo: 'criar' });
  }

  function abrirEdicao(aviso) {
    setForm({
      titulo: aviso.titulo || '',
      conteudo: aviso.conteudo || '',
      tipo: aviso.tipo || 'INFORMACAO',
      data_inicio: paraInputDataHora(aviso.data_inicio),
      data_fim: paraInputDataHora(aviso.data_fim),
      ativo: aviso.ativo !== 0,
    });
    setModal({ tipo: 'editar', aviso });
  }

  function limparFiltros() {
    setFiltros({ pesquisa: '', tipo: '', ativo: '' });
    setPagina(1);
  }

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo={t('sl_avisos_subtitulo')} />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8">
          <div className="mx-auto max-w-[1100px] space-y-8">
            <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin_avisos_titulo')}</h1>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn-secondary" onClick={exportarExcel}>
                  <Icon nome="file" className="h-4 w-4" /> {t('admin_sla_export_excel')}
                </button>
                <button type="button" className="btn-secondary" onClick={exportarPdf}>
                  <Icon nome="file" className="h-4 w-4" /> {t('admin_sla_export_pdf')}
                </button>
                <button type="button" className="btn-primary" onClick={abrirCriacao}>
                  <Icon nome="plus" className="h-4 w-4" /> {t('admin_avisos_criar')}
                </button>
              </div>
            </header>

            <section className="rounded-lg bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_200px_200px_200px]">
                <label className="relative block">
                  <Icon nome="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-10"
                    placeholder={t('admin_avisos_pesquisar')}
                    value={filtros.pesquisa}
                    onChange={(e) => { setFiltros((f) => ({ ...f, pesquisa: e.target.value })); setPagina(1); }}
                  />
                </label>
                <select className="input" value={filtros.tipo} onChange={(e) => { setFiltros((f) => ({ ...f, tipo: e.target.value })); setPagina(1); }}>
                  <option value="">{t('admin_avisos_tipo_todos')}</option>
                  <option value="INFORMACAO">{t('admin_avisos_tipo_informacao')}</option>
                  <option value="AVISO">{t('admin_avisos_tipo_aviso')}</option>
                  <option value="PEDIDO">{t('admin_avisos_tipo_pedido')}</option>
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
                <table className="min-w-[980px] w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="px-5 py-4 text-left">{t('admin_rel_col_titulo')}</th>
                      <th className="px-5 py-4 text-center">{t('admin_rel_col_tipo')}</th>
                      <th className="px-5 py-4 text-center">{t('admin_rel_col_criador')}</th>
                      <th className="px-5 py-4 text-center">{t('admin_avisos_col_vigencia')}</th>
                      <th className="px-5 py-4 text-center">{t('admin_lp_col_data_criacao')}</th>
                      <th className="px-5 py-4 text-center">{t('admin_dash_col_state')}</th>
                      <th className="px-5 py-4 text-center">{t('admin_sla_col_acoes')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {avisos.isLoading ? (
                      <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">{t('admin_avisos_a_carregar')}</td></tr>
                    ) : lista.map((aviso) => {
                      const tipo = tipoAviso(aviso.tipo, t);
                      return (
                        <tr key={aviso.id_aviso} className="text-slate-700">
                          <td className="px-5 py-6 font-semibold text-slate-800">{aviso.titulo}</td>
                          <td className="px-5 py-6 text-center">
                            <span className={`badge-pill ${tipo.cor}`}>{tipo.label}</span>
                          </td>
                          <td className="px-5 py-6 text-center text-slate-600">{aviso.nome_criador || '—'}</td>
                          <td className="px-5 py-6 text-center text-slate-600">{vigenciaAviso(aviso, t)}</td>
                          <td className="px-5 py-6 text-center text-slate-600">{formatarData(aviso.created_at)}</td>
                          <td className="px-5 py-6 text-center">
                            <span className={`badge-pill ${aviso.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {aviso.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive')}
                            </span>
                          </td>
                          <td className="px-5 py-6">
                            <div className="flex items-center justify-center gap-4 text-softinsa-700">
                              <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_ver')} onClick={() => setModal({ tipo: 'ver', aviso })}><Icon nome="eye" className="h-5 w-5" /></button>
                              <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_editar')} onClick={() => abrirEdicao(aviso)}><Icon nome="edit" className="h-5 w-5" /></button>
                              <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={aviso.ativo ? t('admin_lp_desativar') : t('admin_lp_ativar')} onClick={() => aviso.ativo ? setModal({ tipo: 'desativar', aviso }) : alternarEstado.mutate(aviso)}><Icon nome="power" className="h-5 w-5" /></button>
                              <button type="button" className="rounded-md p-1 text-red-600 hover:bg-red-50" title={t('admin_notif_eliminar')} onClick={() => setModal({ tipo: 'eliminar', aviso })}><Icon nome="trash" className="h-5 w-5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!avisos.isLoading && lista.length === 0 && (
                      <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">{t('admin_avisos_vazio')}</td></tr>
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
          </div>
        </main>
      </div>

      {modal?.tipo === 'criar' && (
        <Modal titulo={t('admin_avisos_criar')} onFechar={() => setModal(null)}>
          <FormAviso
            form={form}
            setForm={setForm}
            modo="criar"
            onSubmit={(e) => { e.preventDefault(); if (validarDatas()) criar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={criar.isPending}
            t={t}
          />
        </Modal>
      )}

      {modal?.tipo === 'editar' && (
        <Modal titulo={t('admin_avisos_modal_editar_titulo')} onFechar={() => setModal(null)}>
          <FormAviso
            form={form}
            setForm={setForm}
            modo="editar"
            onSubmit={(e) => { e.preventDefault(); if (validarDatas()) atualizar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={atualizar.isPending}
            t={t}
          />
        </Modal>
      )}

      {modal?.tipo === 'ver' && (
        <Modal titulo={t('admin_avisos_modal_detalhe_titulo')} onFechar={() => setModal(null)}>
          <div className="grid grid-cols-1 gap-4 px-7 py-5 text-sm md:grid-cols-2">
            <div><div className="text-slate-500">{t('admin_rel_col_titulo')}</div><div className="font-semibold">{modal.aviso.titulo}</div></div>
            <div>
              <div className="text-slate-500">{t('admin_rel_col_tipo')}</div>
              <span className={`badge-pill mt-1 inline-block ${tipoAviso(modal.aviso.tipo, t).cor}`}>{tipoAviso(modal.aviso.tipo, t).label}</span>
            </div>
            <div><div className="text-slate-500">{t('admin_rel_col_criador')}</div><div className="font-semibold">{modal.aviso.nome_criador || '—'}</div></div>
            <div><div className="text-slate-500">{t('admin_dash_col_state')}</div><div className="font-semibold">{modal.aviso.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive')}</div></div>
            <div><div className="text-slate-500">{t('admin_avisos_inicio_publicacao')}</div><div className="font-semibold">{formatarDataHora(modal.aviso.data_inicio)}</div></div>
            <div><div className="text-slate-500">{t('admin_avisos_fim_publicacao')}</div><div className="font-semibold">{formatarDataHora(modal.aviso.data_fim)}</div></div>
            <div><div className="text-slate-500">{t('admin_lp_col_data_criacao')}</div><div className="font-semibold">{formatarDataHora(modal.aviso.created_at)}</div></div>
            <div className="md:col-span-2">
              <div className="text-slate-500">{t('admin_avisos_conteudo')}</div>
              <div className="whitespace-pre-wrap font-medium text-slate-700">{modal.aviso.conteudo || '—'}</div>
            </div>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'desativar' && (
        <Modal titulo={t('admin_avisos_modal_desativar_titulo')} icon="warning" iconTone="amber" size="sm" onFechar={() => setModal(null)}>
          <div className="px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              {t('admin_avisos_desativar_confirm').replace('{titulo}', modal.aviso.titulo)}
            </p>
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>{t('admin_cancel')}</button>
            <button
              type="button"
              className="btn bg-orange-500 px-7 text-white hover:bg-orange-600"
              disabled={alternarEstado.isPending}
              onClick={() => {
                alternarEstado.mutate(modal.aviso, { onSuccess: () => setModal(null) });
              }}
            >
              {alternarEstado.isPending ? t('admin_lp_a_confirmar') : t('admin_lp_confirmar')}
            </button>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'eliminar' && (
        <Modal titulo={t('admin_avisos_modal_eliminar_titulo')} icon="warning" iconTone="rose" size="sm" onFechar={() => setModal(null)}>
          <div className="space-y-4 px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              {t('admin_avisos_eliminar_confirm').replace('{titulo}', modal.aviso.titulo)}
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
