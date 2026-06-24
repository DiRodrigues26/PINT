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

const BADGES_NIVEL = {
  A: '🥉',
  B: '🥈',
  C: '🥇',
  D: '💎',
  E: '👑',
};

const CODIGOS_NIVEL = ['A', 'B', 'C', 'D', 'E'];

function niveisInfo(t) {
  return {
    A: { nome_nivel: t('admin_nivel_a'), ordem: 1 },
    B: { nome_nivel: t('admin_nivel_b'), ordem: 2 },
    C: { nome_nivel: t('admin_nivel_c'), ordem: 3 },
    D: { nome_nivel: t('admin_nivel_d'), ordem: 4 },
    E: { nome_nivel: t('admin_nivel_e'), ordem: 5 },
  };
}

const FORM_INICIAL = {
  codigo_nivel: 'A',
  id_learning_path: '',
  id_service_line: '',
  id_area: '',
  descricao: '',
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

function Modal({ titulo, children, onFechar, icon, iconTone = 'blue', size = 'md' }) {
  const sizeClass = size === 'sm' ? 'max-w-xl' : size === 'lg' ? 'max-w-4xl' : 'max-w-2xl';
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

function dificuldade(nivel) {
  const codigo = nivel.codigo_nivel || '';
  const nome = nivel.nome_nivel || '';
  return codigo && nome ? `${codigo} – ${nome}` : nome || codigo || '—';
}

function badgeNivel(nivel, t) {
  if (nivel.imagem_badge) {
    return <img src={nivel.imagem_badge} alt={nivel.titulo_badge || 'Badge'} className="mx-auto h-7 w-7 object-contain" />;
  }

  return (
    <span className="inline-flex h-8 w-8 items-center justify-center text-xl" title={nivel.titulo_badge || t('admin_niveis_badge_nivel')}>
      {BADGES_NIVEL[nivel.codigo_nivel] || '🏅'}
    </span>
  );
}

function prepararPayload(form, t) {
  const infoNivel = niveisInfo(t)[form.codigo_nivel];

  return {
    id_area: Number(form.id_area),
    codigo_nivel: form.codigo_nivel,
    nome_nivel: infoNivel.nome_nivel,
    ordem: infoNivel.ordem,
    descricao: form.descricao.trim() || null,
  };
}

function dadosNiveis(items, t) {
  const headers = [t('admin_niveis_dificuldade'), t('admin_rel_col_area'), 'Service Line', t('admin_rel_col_lp'), t('admin_rel_col_nr_req'), t('admin_dash_col_badge'), t('admin_lp_col_data_criacao'), t('admin_dash_col_state')];
  const linhas = items.map((nivel) => [
    dificuldade(nivel),
    nivel.nome_area || '',
    nivel.nome_service_line || '',
    nivel.nome_learning_path || '',
    nivel.total_requisitos || 0,
    nivel.titulo_badge || nivel.codigo_nivel || '',
    formatarData(nivel.created_at),
    nivel.ativo !== 0 ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive'),
  ]);
  return { headers, linhas };
}

function FormNivel({
  form,
  setForm,
  nivel,
  modo,
  learningPaths,
  serviceLines,
  areas,
  onSubmit,
  onCancelar,
  loading,
  t,
}) {
  const serviceLinesDisponiveis = useMemo(() => {
    if (!form.id_learning_path) return serviceLines;
    return serviceLines.filter((sl) => String(sl.id_learning_path) === String(form.id_learning_path));
  }, [form.id_learning_path, serviceLines]);

  const areasDisponiveis = useMemo(() => {
    if (form.id_service_line) {
      return areas.filter((area) => String(area.id_service_line) === String(form.id_service_line));
    }
    if (form.id_learning_path) {
      return areas.filter((area) => String(area.id_learning_path) === String(form.id_learning_path));
    }
    return areas;
  }, [areas, form.id_learning_path, form.id_service_line]);

  function atualizar(campo, valor) {
    setForm((atual) => {
      const proximo = { ...atual, [campo]: valor };

      if (campo === 'id_learning_path') {
        proximo.id_service_line = '';
        proximo.id_area = '';
      }

      if (campo === 'id_service_line') {
        proximo.id_area = '';
        const serviceLineSelecionada = serviceLines.find((sl) => String(sl.id_service_line) === String(valor));
        if (serviceLineSelecionada?.id_learning_path) {
          proximo.id_learning_path = String(serviceLineSelecionada.id_learning_path);
        }
      }

      if (campo === 'id_area') {
        const areaSelecionada = areas.find((area) => String(area.id_area) === String(valor));
        if (areaSelecionada) {
          proximo.id_service_line = String(areaSelecionada.id_service_line);
          proximo.id_learning_path = String(areaSelecionada.id_learning_path);
        }
      }

      return proximo;
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-6 px-7 py-4">
        <div>
          <div className="mb-3 text-sm font-medium text-slate-900">{t('admin_niveis_dificuldade')}</div>
          <div className="flex flex-wrap gap-5 text-base text-slate-700">
            {CODIGOS_NIVEL.map((codigo) => (
              <label key={codigo} className="flex items-center gap-2">
                <input
                  type="radio"
                  className="h-4 w-4 text-softinsa-600"
                  checked={form.codigo_nivel === codigo}
                  onChange={() => atualizar('codigo_nivel', codigo)}
                />
                {codigo}
              </label>
            ))}
          </div>
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
            <option value="">{t('admin_areas_select_sl')}</option>
            {serviceLinesDisponiveis.map((sl) => (
              <option key={sl.id_service_line} value={sl.id_service_line}>{sl.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            {t('admin_rel_col_area')}<span className="text-red-600">*</span>
          </label>
          <select
            className="input"
            required
            value={form.id_area}
            onChange={(e) => atualizar('id_area', e.target.value)}
          >
            <option value="">{t('admin_niveis_select_area')}</option>
            {areasDisponiveis.map((area) => (
              <option key={area.id_area} value={area.id_area}>{area.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            {t('admin_lp_descricao')}
          </label>
          <textarea
            className="input min-h-[110px] resize-y"
            value={form.descricao}
            onChange={(e) => atualizar('descricao', e.target.value)}
          />
        </div>

      </div>

      <div className="flex justify-end gap-3 border-t-4 border-slate-200 px-7 py-5">
        <button type="button" className="btn-secondary px-6" onClick={onCancelar}>{t('admin_cancel')}</button>
        <button type="submit" className="btn-primary min-w-32" disabled={loading}>
          {loading ? t('admin_lp_a_guardar') : modo === 'criar' ? t('admin_niveis_criar') : t('admin_niveis_editar')}
        </button>
      </div>
    </form>
  );
}

export default function AdminNiveis() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState({ pesquisa: '', id_learning_path: '', id_service_line: '', id_area: '', ativo: '' });
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);

  const niveis = useQuery({
    queryKey: ['admin', 'niveis', filtros, pagina],
    queryFn: async () => (await api.get('/api/niveis', {
      params: {
        pagina,
        por_pagina: 5,
        pesquisa: filtros.pesquisa || undefined,
        id_learning_path: filtros.id_learning_path || undefined,
        id_service_line: filtros.id_service_line || undefined,
        id_area: filtros.id_area || undefined,
        ativo: filtros.ativo || undefined,
      },
    })).data,
  });

  const learningPaths = useQuery({
    queryKey: ['admin', 'niveis', 'learning-paths-select'],
    queryFn: async () => obterTodasDaRota('/api/learning-paths'),
  });

  const serviceLines = useQuery({
    queryKey: ['admin', 'niveis', 'service-lines-select'],
    queryFn: async () => obterTodasDaRota('/api/service-lines'),
  });

  const areas = useQuery({
    queryKey: ['admin', 'niveis', 'areas-select'],
    queryFn: async () => obterTodasDaRota('/api/areas'),
  });

  const criar = useMutation({
    mutationFn: async () => (await api.post('/api/niveis', prepararPayload(form, t))).data,
    onSuccess: () => {
      toast.success(t('admin_niveis_toast_criado'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'niveis'] });
      qc.invalidateQueries({ queryKey: ['admin', 'areas'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const atualizar = useMutation({
    mutationFn: async () => (await api.put(`/api/niveis/${modal.nivel.id_nivel}`, prepararPayload(form, t))).data,
    onSuccess: () => {
      toast.success(t('admin_niveis_toast_atualizado'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'niveis'] });
      qc.invalidateQueries({ queryKey: ['admin', 'areas'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const alternarEstado = useMutation({
    mutationFn: async (nivel) => (await api.put(`/api/niveis/${nivel.id_nivel}`, { ativo: !(nivel.ativo !== 0) })).data,
    onSuccess: () => {
      toast.success(t('admin_lp_toast_estado_atualizado'));
      qc.invalidateQueries({ queryKey: ['admin', 'niveis'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const eliminar = useMutation({
    mutationFn: async () => (await api.delete(`/api/niveis/${modal.nivel.id_nivel}`)).data,
    onSuccess: () => {
      toast.success(t('admin_niveis_toast_eliminado'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'niveis'] });
      qc.invalidateQueries({ queryKey: ['admin', 'areas'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const lista = niveis.data?.dados || [];
  const total = niveis.data?.total || 0;
  const porPagina = niveis.data?.por_pagina || 5;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const lps = learningPaths.data?.dados || [];
  const sls = serviceLines.data?.dados || [];
  const listaAreas = areas.data?.dados || [];

  const serviceLinesFiltro = useMemo(() => {
    if (!filtros.id_learning_path) return sls;
    return sls.filter((sl) => String(sl.id_learning_path) === String(filtros.id_learning_path));
  }, [filtros.id_learning_path, sls]);

  const areasFiltro = useMemo(() => {
    if (filtros.id_service_line) {
      return listaAreas.filter((area) => String(area.id_service_line) === String(filtros.id_service_line));
    }
    if (filtros.id_learning_path) {
      return listaAreas.filter((area) => String(area.id_learning_path) === String(filtros.id_learning_path));
    }
    return listaAreas;
  }, [filtros.id_learning_path, filtros.id_service_line, listaAreas]);

  function atualizarFiltro(campo, valor) {
    setFiltros((atual) => {
      const proximo = { ...atual, [campo]: valor };

      if (campo === 'id_learning_path') {
        proximo.id_service_line = '';
        proximo.id_area = '';
      }

      if (campo === 'id_service_line') {
        proximo.id_area = '';
        const serviceLineSelecionada = sls.find((sl) => String(sl.id_service_line) === String(valor));
        if (serviceLineSelecionada?.id_learning_path) {
          proximo.id_learning_path = String(serviceLineSelecionada.id_learning_path);
        }
      }

      if (campo === 'id_area') {
        const areaSelecionada = listaAreas.find((area) => String(area.id_area) === String(valor));
        if (areaSelecionada) {
          proximo.id_service_line = String(areaSelecionada.id_service_line);
          proximo.id_learning_path = String(areaSelecionada.id_learning_path);
        }
      }

      return proximo;
    });
    setPagina(1);
  }

  function limparFiltros() {
    setFiltros({ pesquisa: '', id_learning_path: '', id_service_line: '', id_area: '', ativo: '' });
    setPagina(1);
  }

  function abrirCriacao() {
    if (learningPaths.isLoading || serviceLines.isLoading || areas.isLoading) {
      toast(t('admin_areas_a_carregar_hierarquia'));
      return;
    }
    if (lps.length === 0) {
      toast.error(t('admin_niveis_erro_sem_lp'));
      return;
    }
    if (sls.length === 0) {
      toast.error(t('admin_niveis_erro_sem_sl'));
      return;
    }
    if (listaAreas.length === 0) {
      toast.error(t('admin_niveis_erro_sem_area'));
      return;
    }

    setForm({ ...FORM_INICIAL });
    setModal({ tipo: 'criar' });
  }

  function abrirEdicao(nivel) {
    setForm({
      codigo_nivel: nivel.codigo_nivel || 'A',
      id_learning_path: nivel.id_learning_path ? String(nivel.id_learning_path) : '',
      id_service_line: nivel.id_service_line ? String(nivel.id_service_line) : '',
      id_area: nivel.id_area ? String(nivel.id_area) : '',
      descricao: nivel.descricao || '',
    });
    setModal({ tipo: 'editar', nivel });
  }

  async function obterTodosFiltrados() {
    const paramsBase = {
      pesquisa: filtros.pesquisa || undefined,
      id_learning_path: filtros.id_learning_path || undefined,
      id_service_line: filtros.id_service_line || undefined,
      id_area: filtros.id_area || undefined,
      ativo: filtros.ativo || undefined,
    };
    return (await obterTodasDaRota('/api/niveis', paramsBase)).dados;
  }

  async function exportarExcel() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosNiveis(todos, t);
      descarregarCsv('niveis.csv', headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_niveis_erro_exportar_excel')));
    }
  }

  async function exportarPdf() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosNiveis(todos, t);
      imprimirTabela(t('admin_menu_niveis'), headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_lp_erro_exportar_pdf')));
    }
  }

  return (
    <div className="mx-auto max-w-[1560px] space-y-7">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin_menu_niveis')}</h1>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={exportarExcel}>
            <Icon nome="download" className="h-4 w-4" /> {t('admin_sla_export_excel')}
          </button>
          <button type="button" className="btn-secondary" onClick={exportarPdf}>
            <Icon nome="file" className="h-4 w-4" /> {t('admin_sla_export_pdf')}
          </button>
          <button type="button" className="btn-primary" onClick={abrirCriacao}>
            <Icon nome="plus" className="h-4 w-4" /> {t('admin_niveis_criar')}
          </button>
        </div>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_220px_220px_200px_200px]">
          <label className="relative block">
            <Icon nome="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder={t('admin_niveis_pesquisar')}
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
          <select className="input" value={filtros.id_area} onChange={(e) => atualizarFiltro('id_area', e.target.value)}>
            <option value="">{t('admin_cand_area_todas')}</option>
            {areasFiltro.map((area) => <option key={area.id_area} value={area.id_area}>{area.nome}</option>)}
          </select>
          <button type="button" className="btn-secondary border-softinsa-600 text-softinsa-700" onClick={limparFiltros}>
            <Icon nome="x" className="h-4 w-4" /> {t('admin_notif_limpar_filtros')}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1280px] w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4 text-center">{t('admin_niveis_dificuldade')}</th>
                <th className="px-6 py-4 text-center">{t('admin_rel_col_area')}</th>
                <th className="px-6 py-4 text-center">Service Line</th>
                <th className="px-6 py-4 text-center">{t('admin_rel_col_lp')}</th>
                <th className="px-6 py-4 text-center">{t('admin_rel_col_nr_req')}</th>
                <th className="px-6 py-4 text-center">{t('admin_dash_col_badge')}</th>
                <th className="px-6 py-4 text-center">{t('admin_lp_col_data_criacao')}</th>
                <th className="px-6 py-4 text-center">{t('admin_dash_col_state')}</th>
                <th className="px-6 py-4 text-center">{t('admin_sla_col_acoes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {niveis.isLoading ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">{t('admin_niveis_a_carregar')}</td></tr>
              ) : lista.map((nivel) => (
                <tr key={nivel.id_nivel} className="text-slate-700">
                  <td className="px-6 py-5 text-center font-semibold text-slate-800">{dificuldade(nivel)}</td>
                  <td className="px-6 py-5 text-center text-slate-500">{nivel.nome_area}</td>
                  <td className="px-6 py-5 text-center text-slate-500">{nivel.nome_service_line}</td>
                  <td className="px-6 py-5 text-center text-slate-500">{nivel.nome_learning_path}</td>
                  <td className="px-6 py-5 text-center font-semibold text-slate-800">{nivel.total_requisitos || 0}</td>
                  <td className="px-6 py-5 text-center">{badgeNivel(nivel, t)}</td>
                  <td className="px-6 py-5 text-center text-slate-600">{formatarData(nivel.created_at)}</td>
                  <td className="px-6 py-5 text-center">
                    <span className={`badge-pill ${nivel.ativo !== 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {nivel.ativo !== 0 ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-4 text-softinsa-700">
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_ver')} onClick={() => setModal({ tipo: 'ver', nivel })}>
                        <Icon nome="eye" className="h-5 w-5" />
                      </button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_editar')} onClick={() => abrirEdicao(nivel)}>
                        <Icon nome="edit" className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1 hover:bg-blue-50"
                        title={nivel.ativo !== 0 ? t('admin_lp_desativar') : t('admin_lp_ativar')}
                        onClick={() => (nivel.ativo !== 0 ? setModal({ tipo: 'desativar', nivel }) : alternarEstado.mutate(nivel))}
                      >
                        <Icon nome="power" className="h-5 w-5" />
                      </button>
                      <button type="button" className="rounded-md p-1 text-red-600 hover:bg-red-50" title={t('admin_notif_eliminar')} onClick={() => setModal({ tipo: 'eliminar', nivel })}>
                        <Icon nome="trash" className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!niveis.isLoading && lista.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">{t('admin_niveis_vazio')}</td></tr>
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
        <Modal titulo={t('admin_niveis_criar')} onFechar={() => setModal(null)} size="lg">
          <FormNivel
            form={form}
            setForm={setForm}
            nivel={{ codigo_nivel: form.codigo_nivel }}
            modo="criar"
            learningPaths={lps}
            serviceLines={sls}
            areas={listaAreas}
            onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={criar.isPending}
            t={t}
          />
        </Modal>
      )}

      {modal?.tipo === 'editar' && (
        <Modal titulo={t('admin_niveis_editar')} onFechar={() => setModal(null)} size="lg">
          <FormNivel
            form={form}
            setForm={setForm}
            nivel={modal.nivel}
            modo="editar"
            learningPaths={lps}
            serviceLines={sls}
            areas={listaAreas}
            onSubmit={(e) => { e.preventDefault(); atualizar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={atualizar.isPending}
            t={t}
          />
        </Modal>
      )}

      {modal?.tipo === 'ver' && (
        <Modal titulo={t('admin_niveis_modal_detalhe_titulo')} onFechar={() => setModal(null)}>
          <div className="grid grid-cols-1 gap-4 px-7 py-5 text-sm md:grid-cols-2">
            <div><div className="text-slate-500">{t('admin_niveis_dificuldade')}</div><div className="font-semibold">{dificuldade(modal.nivel)}</div></div>
            <div><div className="text-slate-500">{t('admin_rel_col_area')}</div><div className="font-semibold">{modal.nivel.nome_area}</div></div>
            <div><div className="text-slate-500">Service Line</div><div className="font-semibold">{modal.nivel.nome_service_line}</div></div>
            <div><div className="text-slate-500">{t('admin_rel_col_lp')}</div><div className="font-semibold">{modal.nivel.nome_learning_path}</div></div>
            <div><div className="text-slate-500">{t('admin_short_requisitos')}</div><div className="font-semibold">{modal.nivel.total_requisitos || 0}</div></div>
            <div><div className="text-slate-500">{t('admin_dash_col_badge')}</div><div className="font-semibold">{modal.nivel.titulo_badge || '—'}</div></div>
            <div><div className="text-slate-500">{t('admin_lp_col_data_criacao')}</div><div className="font-semibold">{formatarData(modal.nivel.created_at)}</div></div>
            <div><div className="text-slate-500">{t('admin_dash_col_state')}</div><div className="font-semibold">{modal.nivel.ativo !== 0 ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive')}</div></div>
            <div className="md:col-span-2"><div className="text-slate-500">{t('admin_lp_descricao')}</div><div className="font-semibold">{modal.nivel.descricao || '—'}</div></div>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'desativar' && (
        <Modal titulo={t('admin_niveis_modal_desativar_titulo')} icon="warning" iconTone="amber" size="sm" onFechar={() => setModal(null)}>
          <div className="px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              {t('admin_niveis_desativar_confirm').replace('{nome}', dificuldade(modal.nivel))}
            </p>
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>{t('admin_cancel')}</button>
            <button
              type="button"
              className="btn bg-orange-500 px-7 text-white hover:bg-orange-600"
              disabled={alternarEstado.isPending}
              onClick={() => {
                alternarEstado.mutate(modal.nivel, { onSuccess: () => setModal(null) });
              }}
            >
              {alternarEstado.isPending ? t('admin_lp_a_confirmar') : t('admin_lp_confirmar')}
            </button>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'eliminar' && (
        <Modal titulo={t('admin_niveis_modal_eliminar_titulo')} icon="warning" iconTone="rose" size="sm" onFechar={() => setModal(null)}>
          <div className="space-y-4 px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              {t('admin_niveis_eliminar_confirm').replace('{nome}', dificuldade(modal.nivel))}
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
