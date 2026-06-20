import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Eye,
  FileText,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { descarregarCsv, imprimirTabela } from '../../lib/exportar';
import { formatarDataHora } from '../../lib/formatar';
import { useLanguage } from '../../context/LanguageContext';

const ESTADO_INICIAL = {
  tipo_politica: 'GERAL',
  versao: '',
  titulo: '',
  conteudo: '',
  ativo: false,
};

const TIPO_CORES = {
  GERAL: 'bg-blue-100 text-blue-800',
  PUBLICACAO_BADGE: 'bg-emerald-100 text-emerald-800',
  PARTILHA_LINKEDIN: 'bg-violet-100 text-violet-800',
};

const TIPOS_POLITICA = ['GERAL', 'PUBLICACAO_BADGE', 'PARTILHA_LINKEDIN'];

function tipoPolitica(tipo, t) {
  const labels = {
    GERAL: t('admin_rgpd_tipo_geral'),
    PUBLICACAO_BADGE: t('admin_rgpd_tipo_publicacao'),
    PARTILHA_LINKEDIN: t('admin_rgpd_tipo_linkedin'),
  };
  return { label: labels[tipo] || tipo || '—', cor: TIPO_CORES[tipo] || 'bg-slate-100 text-slate-700' };
}

function prepararPayload(form) {
  return {
    tipo_politica: form.tipo_politica,
    versao: form.versao.trim(),
    titulo: form.titulo.trim(),
    conteudo: form.conteudo.trim(),
    ativo: Boolean(form.ativo),
  };
}

function dadosExportacao(items, t) {
  const headers = [
    t('admin_rel_col_tipo'),
    t('admin_rgpd_versao'),
    t('admin_rel_col_titulo'),
    t('admin_dash_col_state'),
    t('admin_rgpd_publicada_em'),
    t('admin_rgpd_criada_por'),
    t('admin_rgpd_atualizada_por'),
  ];
  const linhas = items.map((p) => [
    tipoPolitica(p.tipo_politica, t).label,
    p.versao,
    p.titulo,
    p.ativo ? t('admin_rgpd_ativa') : t('admin_rgpd_inativa'),
    formatarDataHora(p.data_publicacao),
    p.nome_criador || '—',
    p.nome_atualizador || '—',
  ]);
  return { headers, linhas };
}

function Modal({ titulo, children, onFechar, size = 'max-w-3xl' }) {
  return (
    <div className="fixed inset-x-0 -top-8 bottom-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 pt-8">
      <div className={`max-h-[90vh] w-full ${size} overflow-hidden rounded-2xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-softinsa-100 text-softinsa-700">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
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

function FormPolitica({ form, setForm, onSubmit, onCancelar, loading, modo, t }) {
  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="max-h-[calc(90vh-140px)] space-y-5 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_150px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              {t('admin_rgpd_tipo_politica')}<span className="text-red-600">*</span>
            </label>
            <select
              className="input"
              value={form.tipo_politica}
              onChange={(e) => atualizar('tipo_politica', e.target.value)}
            >
              {TIPOS_POLITICA.map((valor) => (
                <option key={valor} value={valor}>{tipoPolitica(valor, t).label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              {t('admin_rgpd_versao')}<span className="text-red-600">*</span>
            </label>
            <input
              className="input"
              required
              maxLength={20}
              placeholder="v1.0"
              value={form.versao}
              onChange={(e) => atualizar('versao', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            {t('admin_rel_col_titulo')}<span className="text-red-600">*</span>
          </label>
          <input
            className="input"
            required
            maxLength={200}
            placeholder={t('admin_rgpd_placeholder_titulo')}
            value={form.titulo}
            onChange={(e) => atualizar('titulo', e.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            {t('admin_rgpd_texto_politica')}<span className="text-red-600">*</span>
          </label>
          <textarea
            className="input min-h-[260px] resize-y leading-6"
            required
            placeholder={t('admin_rgpd_placeholder_conteudo')}
            value={form.conteudo}
            onChange={(e) => atualizar('conteudo', e.target.value)}
          />
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300 text-softinsa-600 focus:ring-softinsa-500"
            checked={Boolean(form.ativo)}
            onChange={(e) => atualizar('ativo', e.target.checked)}
          />
          <span>
            <span className="block font-semibold text-slate-900">{t('admin_rgpd_publicar_versao')}</span>
            <span className="mt-1 block text-xs text-slate-500">
              {t('admin_rgpd_publicar_desc')}
            </span>
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button type="button" className="btn-secondary px-5" onClick={onCancelar}>{t('admin_cancel')}</button>
        <button type="submit" className="btn-primary min-w-44" disabled={loading}>
          {loading ? t('admin_lp_a_guardar') : modo === 'criar' ? t('admin_rgpd_criar_politica') : t('admin_sla_guardar')}
        </button>
      </div>
    </form>
  );
}

export default function AdminRGPD() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState({ pesquisa: '', tipo: '', ativo: '' });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(ESTADO_INICIAL);

  const politicas = useQuery({
    queryKey: ['admin', 'rgpd', 'politicas'],
    queryFn: async () => (await api.get('/api/rgpd/politicas')).data,
  });

  const items = politicas.data?.dados || [];
  const filtrados = useMemo(() => {
    const termo = filtros.pesquisa.trim().toLowerCase();
    return items.filter((p) => {
      const correspondeTexto = !termo
        || [p.titulo, p.versao, p.conteudo, p.nome_criador].some((v) => String(v || '').toLowerCase().includes(termo));
      const correspondeTipo = !filtros.tipo || p.tipo_politica === filtros.tipo;
      const correspondeAtivo = filtros.ativo === '' || Number(p.ativo) === Number(filtros.ativo);
      return correspondeTexto && correspondeTipo && correspondeAtivo;
    });
  }, [items, filtros]);

  const ativaPorTipo = useMemo(() => {
    return TIPOS_POLITICA.reduce((acc, tipo) => {
      acc[tipo] = items.find((p) => p.tipo_politica === tipo && p.ativo);
      return acc;
    }, {});
  }, [items]);

  function invalidar() {
    qc.invalidateQueries({ queryKey: ['admin', 'rgpd', 'politicas'] });
    qc.invalidateQueries({ queryKey: ['rgpd', 'politica-ativa'] });
  }

  const criar = useMutation({
    mutationFn: async () => (await api.post('/api/rgpd/politicas', prepararPayload(form))).data,
    onSuccess: () => {
      toast.success(t('admin_rgpd_toast_criada'));
      setModal(null);
      invalidar();
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const atualizar = useMutation({
    mutationFn: async () => (await api.put(`/api/rgpd/politicas/${modal.politica.id_politica}`, prepararPayload(form))).data,
    onSuccess: () => {
      toast.success(t('admin_rgpd_toast_atualizada'));
      setModal(null);
      invalidar();
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const alternar = useMutation({
    mutationFn: async (politica) => (await api.put(`/api/rgpd/politicas/${politica.id_politica}`, {
      tipo_politica: politica.tipo_politica,
      versao: politica.versao,
      titulo: politica.titulo,
      conteudo: politica.conteudo,
      ativo: !politica.ativo,
    })).data,
    onSuccess: () => {
      toast.success(t('admin_rgpd_toast_estado'));
      invalidar();
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const eliminar = useMutation({
    mutationFn: async (politica) => (await api.delete(`/api/rgpd/politicas/${politica.id_politica}`)).data,
    onSuccess: () => {
      toast.success(t('admin_rgpd_toast_eliminada'));
      setModal(null);
      invalidar();
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  function abrirCriar() {
    setForm(ESTADO_INICIAL);
    setModal({ tipo: 'criar' });
  }

  function abrirEditar(politica) {
    setForm({
      tipo_politica: politica.tipo_politica,
      versao: politica.versao,
      titulo: politica.titulo,
      conteudo: politica.conteudo,
      ativo: Boolean(politica.ativo),
    });
    setModal({ tipo: 'editar', politica });
  }

  function exportarCsv() {
    const { headers, linhas } = dadosExportacao(filtrados, t);
    descarregarCsv('politicas-rgpd.csv', headers, linhas);
  }

  function exportarPdf() {
    const { headers, linhas } = dadosExportacao(filtrados, t);
    imprimirTabela(t('admin_rgpd_politicas'), headers, linhas);
  }

  function submeter(e) {
    e.preventDefault();
    if (!form.versao.trim() || !form.titulo.trim() || !form.conteudo.trim()) {
      toast.error(t('admin_rgpd_erro_obrigatorios'));
      return;
    }
    if (modal?.tipo === 'editar') atualizar.mutate();
    else criar.mutate();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin_menu_rgpd')}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('admin_rgpd_subtitulo')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={exportarCsv} disabled={filtrados.length === 0}>
            <FileText className="h-4 w-4" /> CSV
          </button>
          <button type="button" className="btn-secondary" onClick={exportarPdf} disabled={filtrados.length === 0}>
            <FileText className="h-4 w-4" /> PDF
          </button>
          <button type="button" className="btn-primary" onClick={abrirCriar}>
            <Plus className="h-4 w-4" /> {t('admin_rgpd_nova_politica')}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {TIPOS_POLITICA.map((tipo) => {
          const ativa = ativaPorTipo[tipo];
          const cfg = tipoPolitica(tipo, t);
          return (
            <div key={tipo} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">{cfg.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{ativa?.versao || '—'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {ativa ? t('admin_rgpd_publicada_em_data').replace('{data}', formatarDataHora(ativa.data_publicacao)) : t('admin_rgpd_sem_versao_ativa')}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ativa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {ativa ? t('admin_rgpd_ativa') : t('admin_rgpd_pendente')}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_230px_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder={t('admin_rgpd_pesquisar')}
              value={filtros.pesquisa}
              onChange={(e) => setFiltros((f) => ({ ...f, pesquisa: e.target.value }))}
            />
          </label>
          <select className="input" value={filtros.tipo} onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}>
            <option value="">{t('admin_rgpd_todos_tipos')}</option>
            {TIPOS_POLITICA.map((valor) => (
              <option key={valor} value={valor}>{tipoPolitica(valor, t).label}</option>
            ))}
          </select>
          <select className="input" value={filtros.ativo} onChange={(e) => setFiltros((f) => ({ ...f, ativo: e.target.value }))}>
            <option value="">{t('todos_estados')}</option>
            <option value="1">{t('admin_rgpd_ativas')}</option>
            <option value="0">{t('admin_rgpd_inativas')}</option>
          </select>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">{t('admin_rgpd_politica')}</th>
                <th className="px-4 py-3 font-semibold">{t('admin_rel_col_tipo')}</th>
                <th className="px-4 py-3 font-semibold">{t('admin_dash_col_state')}</th>
                <th className="px-4 py-3 font-semibold">{t('admin_rgpd_publicacao')}</th>
                <th className="px-4 py-3 font-semibold">{t('admin_rgpd_atualizacao')}</th>
                <th className="px-4 py-3 text-right font-semibold">{t('admin_sla_col_acoes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {politicas.isLoading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">{t('admin_rgpd_a_carregar')}</td></tr>
              ) : politicas.isError ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-rose-600">{t('admin_rgpd_erro_carregar')}</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">{t('admin_rgpd_vazio')}</td></tr>
              ) : filtrados.map((politica) => {
                const tipo = tipoPolitica(politica.tipo_politica, t);
                return (
                  <tr key={politica.id_politica} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{politica.titulo}</div>
                      <div className="mt-1 text-xs text-slate-500">{t('admin_rgpd_versao_valor').replace('{versao}', politica.versao)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tipo.cor}`}>{tipo.label}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${politica.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {politica.ativo && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {politica.ativo ? t('admin_rgpd_ativa') : t('admin_rgpd_inativa')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatarDataHora(politica.data_publicacao)}</td>
                    <td className="px-4 py-4 text-slate-600">{formatarDataHora(politica.updated_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-softinsa-700" title={t('admin_rgpd_ver_detalhe')} onClick={() => setModal({ tipo: 'detalhe', politica })}>
                          <Eye className="h-4 w-4" />
                        </button>
                        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-softinsa-700" title={t('admin_lp_editar')} onClick={() => abrirEditar(politica)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-700" title={politica.ativo ? t('admin_lp_desativar') : t('admin_rgpd_publicar')} onClick={() => alternar.mutate(politica)} disabled={alternar.isPending}>
                          <Power className="h-4 w-4" />
                        </button>
                        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40" title={t('admin_notif_eliminar')} onClick={() => setModal({ tipo: 'eliminar', politica })} disabled={Boolean(politica.ativo)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {(modal?.tipo === 'criar' || modal?.tipo === 'editar') && (
        <Modal titulo={modal.tipo === 'criar' ? t('admin_rgpd_nova_politica_rgpd') : t('admin_rgpd_editar_politica_rgpd')} onFechar={() => setModal(null)}>
          <FormPolitica
            form={form}
            setForm={setForm}
            modo={modal.tipo}
            onSubmit={submeter}
            onCancelar={() => setModal(null)}
            loading={criar.isPending || atualizar.isPending}
            t={t}
          />
        </Modal>
      )}

      {modal?.tipo === 'detalhe' && (
        <Modal titulo={t('admin_rgpd_detalhe_politica_rgpd')} onFechar={() => setModal(null)}>
          <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tipoPolitica(modal.politica.tipo_politica, t).cor}`}>
                {tipoPolitica(modal.politica.tipo_politica, t).label}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {t('admin_rgpd_versao_valor').replace('{versao}', modal.politica.versao)}
              </span>
              {modal.politica.ativo && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">{t('admin_rgpd_ativa')}</span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900">{modal.politica.titulo}</h3>
            <div className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {modal.politica.conteudo}
            </div>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'eliminar' && (
        <Modal titulo={t('admin_rgpd_eliminar_politica_rgpd')} onFechar={() => setModal(null)} size="max-w-xl">
          <div className="px-6 py-5">
            <p className="text-sm text-slate-600">
              {t('admin_rgpd_eliminar_confirm_prefix')} <strong>{modal.politica.titulo}</strong>, {t('admin_rgpd_eliminar_confirm_suffix').replace('{versao}', modal.politica.versao)}
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button type="button" className="btn-secondary px-5" onClick={() => setModal(null)}>{t('admin_cancel')}</button>
            <button type="button" className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60" disabled={eliminar.isPending} onClick={() => eliminar.mutate(modal.politica)}>
              {eliminar.isPending ? t('admin_notif_a_eliminar') : t('admin_notif_eliminar')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
