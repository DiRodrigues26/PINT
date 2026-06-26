import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Filter,
  Pencil,
  Plus,
  Save,
  Search,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';
import { useLanguage } from '../../context/LanguageContext';
import { api, extrairErro } from '../../lib/api';
import { formatarData } from '../../lib/formatar';

const ESTADOS = {
  PENDENTE: {
    labelKey: 'obj_pendente',
    icon: Clock3,
    chip: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-400 ring-amber-100',
    border: 'border-amber-200',
  },
  EM_CURSO: {
    labelKey: 'obj_em_curso',
    icon: Target,
    chip: 'bg-softinsa-100 text-softinsa-800',
    dot: 'bg-softinsa-500 ring-softinsa-100',
    border: 'border-softinsa-200',
  },
  CONCLUIDO: {
    labelKey: 'obj_concluido',
    icon: CheckCircle2,
    chip: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-500 ring-emerald-100',
    border: 'border-emerald-200',
  },
  CANCELADO: {
    labelKey: 'obj_cancelado',
    icon: Circle,
    chip: 'bg-slate-200 text-slate-700',
    dot: 'bg-slate-400 ring-slate-100',
    border: 'border-slate-200',
  },
};

const FORM_INICIAL = {
  titulo: '',
  descricao: '',
  data_inicio: '',
  data_fim: '',
  estado: 'PENDENTE',
};

function dataInput(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toISOString().slice(0, 10);
}

function ordenarObjetivos(lista) {
  return [...lista].sort((a, b) => {
    const aData = new Date(a.data_inicio || a.created_at || 0).getTime();
    const bData = new Date(b.data_inicio || b.created_at || 0).getTime();
    return bData - aData;
  });
}

function ModalObjetivo({ objetivo, onFechar, onGuardar, loading, t }) {
  const [form, setForm] = useState(() => {
    if (!objetivo) return FORM_INICIAL;
    return {
      titulo: objetivo.titulo || '',
      descricao: objetivo.descricao || '',
      data_inicio: dataInput(objetivo.data_inicio),
      data_fim: dataInput(objetivo.data_fim),
      estado: objetivo.estado || 'PENDENTE',
    };
  });

  const edicao = Boolean(objetivo);

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function submeter(e) {
    e.preventDefault();
    const titulo = form.titulo.trim();
    if (!titulo) {
      toast.error(t('objetivos_titulo_obrigatorio'));
      return;
    }

    onGuardar({
      titulo,
      descricao: form.descricao.trim() || null,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      estado: form.estado,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4" onMouseDown={onFechar}>
      <form
        onSubmit={submeter}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{edicao ? t('objetivos_editar') : t('objetivos_novo')}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{t('objetivos_modal_desc')}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={t('fechar')}
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              {t('objetivos_titulo')} <span className="text-rose-500">*</span>
            </label>
            <input
              className="input"
              maxLength={200}
              required
              value={form.titulo}
              onChange={(e) => atualizar('titulo', e.target.value)}
              placeholder={t('objetivos_titulo_placeholder')}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">{t('objetivos_descricao')}</label>
            <textarea
              className="input min-h-24 resize-y"
              value={form.descricao}
              onChange={(e) => atualizar('descricao', e.target.value)}
              placeholder={t('objetivos_descricao_placeholder')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">{t('objetivos_data_inicio')}</label>
              <input
                type="date"
                className="input"
                value={form.data_inicio}
                onChange={(e) => atualizar('data_inicio', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">{t('objetivos_prazo')}</label>
              <input
                type="date"
                className="input"
                value={form.data_fim}
                onChange={(e) => atualizar('data_fim', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">{t('objetivos_estado')}</label>
            <select className="input" value={form.estado} onChange={(e) => atualizar('estado', e.target.value)}>
              {Object.entries(ESTADOS).map(([valor, meta]) => (
                <option key={valor} value={valor}>{t(meta.labelKey)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t('cancelar')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            {loading ? t('objetivos_a_guardar') : edicao ? t('objetivos_guardar') : t('objetivos_criar')}
          </button>
        </div>
      </form>
    </div>
  );
}

function ModalEliminar({ objetivo, onCancelar, onConfirmar, loading, t }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4" onMouseDown={onCancelar}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="px-6 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <AlertTriangle className="h-6 w-6" strokeWidth={2} />
          </div>
          <h2 className="mt-5 text-lg font-bold text-slate-900">{t('objetivos_eliminar')}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t('objetivos_confirmar_eliminar').replace('{titulo}', objetivo?.titulo || '')}
            {' '}
            {t('objetivos_eliminar_irreversivel')}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t('cancelar')}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
            {loading ? t('objetivos_a_eliminar') : t('objetivos_eliminar')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ObjetivoTimelineItem({ objetivo, ultimo, onEditar, onEliminar, t }) {
  const meta = ESTADOS[objetivo.estado] || ESTADOS.PENDENTE;
  const Icon = meta.icon;

  return (
    <div className="relative grid gap-4 md:grid-cols-[36px_minmax(0,1fr)]">
      <div className="relative hidden justify-center md:flex">
        <span className={`mt-5 flex h-5 w-5 rounded-full ring-8 ${meta.dot}`} />
        {!ultimo && <span className="absolute bottom-[-28px] top-11 w-px bg-slate-200" />}
      </div>

      <article className={`rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${meta.border}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${meta.chip}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {t(meta.labelKey)}
              </span>
              {objetivo.data_fim && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
                  {t('objetivos_prazo')}: {formatarData(objetivo.data_fim)}
                </span>
              )}
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">{objetivo.titulo}</h3>
            {objetivo.descricao && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{objetivo.descricao}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
              <span>{t('objetivos_inicio')}: {formatarData(objetivo.data_inicio)}</span>
              <span>{t('objetivos_atualizado')}: {formatarData(objetivo.updated_at)}</span>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => onEditar(objetivo)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-softinsa-300 hover:text-softinsa-700"
              title={t('objetivos_editar')}
            >
              <Pencil className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => onEliminar(objetivo)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-300 hover:text-rose-600"
              title={t('objetivos_eliminar')}
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

export default function Objetivos() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [pesquisa, setPesquisa] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [modalObjetivo, setModalObjetivo] = useState(null);
  const [objetivoEliminar, setObjetivoEliminar] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['consultor-objetivos'],
    queryFn: async () => (await api.get('/api/timeline')).data,
    staleTime: 60_000,
  });

  const objetivos = data?.dados || [];

  const objetivosFiltrados = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    return ordenarObjetivos(objetivos).filter((objetivo) => {
      const passaEstado = !estadoFiltro || objetivo.estado === estadoFiltro;
      const passaPesquisa = !termo
        || objetivo.titulo?.toLowerCase().includes(termo)
        || objetivo.descricao?.toLowerCase().includes(termo);
      return passaEstado && passaPesquisa;
    });
  }, [estadoFiltro, objetivos, pesquisa]);

  const contadores = useMemo(() => {
    return Object.keys(ESTADOS).reduce((acc, estado) => {
      acc[estado] = objetivos.filter((objetivo) => objetivo.estado === estado).length;
      return acc;
    }, {});
  }, [objetivos]);

  const criar = useMutation({
    mutationFn: (payload) => api.post('/api/timeline', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultor-objetivos'] });
      setModalObjetivo(null);
      toast.success(t('objetivos_toast_criado'));
    },
    onError: (err) => toast.error(extrairErro(err, t('objetivos_erro_criar'))),
  });

  const atualizar = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/api/timeline/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultor-objetivos'] });
      setModalObjetivo(null);
      toast.success(t('objetivos_toast_atualizado'));
    },
    onError: (err) => toast.error(extrairErro(err, t('objetivos_erro_atualizar'))),
  });

  const eliminar = useMutation({
    mutationFn: (id) => api.delete(`/api/timeline/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultor-objetivos'] });
      setObjetivoEliminar(null);
      toast.success(t('objetivos_toast_eliminado'));
    },
    onError: (err) => toast.error(extrairErro(err, t('objetivos_erro_eliminar'))),
  });

  function guardarObjetivo(payload) {
    if (modalObjetivo?.id_objetivo) {
      atualizar.mutate({ id: modalObjetivo.id_objetivo, payload });
    } else {
      criar.mutate(payload);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <ConsultorSidebar />
      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo={t('sub_objetivos')} />

        <main className="px-5 py-8 pb-24 lg:px-10 lg:pb-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-softinsa-700">{t('objetivos_eyebrow')}</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">{t('objetivos_titulo_pagina')}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                {t('objetivos_desc_pagina')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalObjetivo({})}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              {t('objetivos_novo')}
            </button>
          </div>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(ESTADOS).map(([estado, meta]) => {
              const Icon = meta.icon;
              return (
                <div key={estado} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-3xl font-bold text-slate-900">{contadores[estado] || 0}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{t(meta.labelKey)}</p>
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${meta.chip}`}>
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
                <input
                  className="input pl-11"
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  placeholder={t('objetivos_pesquisar')}
                />
              </label>
              <label className="relative block">
                <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
                <select className="input pl-11" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                  <option value="">{t('objetivos_todos_estados')}</option>
                  {Object.entries(ESTADOS).map(([valor, meta]) => (
                    <option key={valor} value={valor}>{t(meta.labelKey)}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => { setPesquisa(''); setEstadoFiltro(''); }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                {t('objetivos_limpar_filtros')}
              </button>
            </div>
          </section>

          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center"><Carregando /></div>
          ) : objetivosFiltrados.length === 0 ? (
            <section className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <Target className="mx-auto h-14 w-14 text-slate-300" strokeWidth={1.5} />
              <h3 className="mt-4 text-lg font-bold text-slate-800">{t('objetivos_sem_registos')}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {t('objetivos_sem_registos_desc')}
              </p>
              <button
                type="button"
                onClick={() => setModalObjetivo({})}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                {t('objetivos_novo')}
              </button>
            </section>
          ) : (
            <section className="mt-8 space-y-6">
              {objetivosFiltrados.map((objetivo, index) => (
                <ObjetivoTimelineItem
                  key={objetivo.id_objetivo}
                  objetivo={objetivo}
                  ultimo={index === objetivosFiltrados.length - 1}
                  onEditar={setModalObjetivo}
                  onEliminar={setObjetivoEliminar}
                  t={t}
                />
              ))}
            </section>
          )}
        </main>
      </div>

      {modalObjetivo && (
        <ModalObjetivo
          objetivo={modalObjetivo.id_objetivo ? modalObjetivo : null}
          onFechar={() => setModalObjetivo(null)}
          onGuardar={guardarObjetivo}
          loading={criar.isPending || atualizar.isPending}
          t={t}
        />
      )}

      {objetivoEliminar && (
        <ModalEliminar
          objetivo={objetivoEliminar}
          onCancelar={() => setObjetivoEliminar(null)}
          onConfirmar={() => eliminar.mutate(objetivoEliminar.id_objetivo)}
          loading={eliminar.isPending}
          t={t}
        />
      )}
    </div>
  );
}
