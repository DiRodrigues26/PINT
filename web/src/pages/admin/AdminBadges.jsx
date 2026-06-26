import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
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

// Importações dos helpers extraídos e componente FormBadge
import {
  FORM_INICIAL,
  textoDeLista,
  obterTodasDaRota,
  dificuldade,
  estadoBadge,
  estadoClasses,
  estadoLabel,
  expiracaoTexto,
  formatarDataInput,
  adicionarDias,
  dadosBadges,
  separarPayloadBadge,
  prepararPayload,
  encontrarNivelNoContexto
} from '../../components/admin/BadgeHelpers';
import FormBadge from '../../components/admin/BadgeFormModal';

const ICONES = {
  calendar: CalendarDays,
  download: Download,
  edit: Pencil,
  eye: Eye,
  file: FileText,
  plus: Plus,
  power: Power,
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
  const sizeClass = size === 'sm' ? 'max-w-xl' : size === 'lg' ? 'max-w-4xl' : 'max-w-2xl';
  const iconClass = {
    amber: 'bg-amber-100 text-orange-500',
    rose: 'bg-rose-100 text-red-600',
    blue: 'bg-softinsa-100 text-softinsa-700',
  }[iconTone];

  return (
    <div className="fixed inset-x-0 -top-8 bottom-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 pt-8">
      <div className={`max-h-[96vh] w-full ${sizeClass} overflow-hidden rounded-[28px] bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b-4 border-slate-200 px-7 py-5">
          <div className="flex items-center gap-4">
            {icon && (
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${iconClass}`}>
                <Icon nome="icon" className="hidden" />
                <div className="text-inherit">
                  <Icon nome={icon} className="h-8 w-8" />
                </div>
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

export default function AdminBadges({ editarBadgeId = null, onEditarBadgeConsumido }) {
  const { t } = useLanguage();
  const location = useLocation();
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState({
    pesquisa: '',
    id_learning_path: '',
    id_service_line: '',
    id_area: '',
    id_nivel: '',
    estado: '',
  });
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);

  const badges = useQuery({
    queryKey: ['admin', 'badges', filtros, pagina],
    queryFn: async () => (await api.get('/api/badges', {
      params: {
        pagina,
        por_pagina: 5,
        pesquisa: filtros.pesquisa || undefined,
        id_learning_path: filtros.id_learning_path || undefined,
        id_service_line: filtros.id_service_line || undefined,
        id_area: filtros.id_area || undefined,
        id_nivel: filtros.id_nivel || undefined,
        estado: filtros.estado || undefined,
      },
    })).data,
  });

  const learningPaths = useQuery({
    queryKey: ['admin', 'badges', 'learning-paths-select'],
    queryFn: async () => obterTodasDaRota('/api/learning-paths'),
  });

  const serviceLines = useQuery({
    queryKey: ['admin', 'badges', 'service-lines-select'],
    queryFn: async () => obterTodasDaRota('/api/service-lines'),
  });

  const areas = useQuery({
    queryKey: ['admin', 'badges', 'areas-select'],
    queryFn: async () => obterTodasDaRota('/api/areas'),
  });

  const niveis = useQuery({
    queryKey: ['admin', 'badges', 'niveis-select'],
    queryFn: async () => obterTodasDaRota('/api/niveis'),
  });

  const requisitos = useQuery({
    queryKey: ['admin', 'badges', 'requisitos-select'],
    queryFn: async () => obterTodasDaRota('/api/requisitos'),
  });

  const criar = useMutation({
    mutationFn: async () => {
      const { dadosBadge, requisitosNovos } = separarPayloadBadge(prepararPayload(form, listaNiveis, null, t));
      const criado = (await api.post('/api/badges', dadosBadge)).data;
      await Promise.all((requisitosNovos || []).map((req, idx) => api.post('/api/requisitos', {
        id_badge: criado.id_badge,
        titulo: req.titulo,
        descricao: req.descricao,
        tipo_evidencia: req.tipo_evidencia,
        imagem_url: req.imagem_url || null,
        ordem: dadosBadge.requisitos.length + idx + 1,
        obrigatorio: 1,
        ativo: 1,
      })));
      return criado;
    },
    onSuccess: () => {
      toast.success(t('admin_badges_toast_criado'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'badges'] });
      qc.invalidateQueries({ queryKey: ['admin', 'requisitos'] });
      qc.invalidateQueries({ queryKey: ['admin', 'niveis'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const atualizar = useMutation({
    mutationFn: async () => {
      const { dadosBadge, requisitosNovos } = separarPayloadBadge(prepararPayload(form, listaNiveis, modal.badge, t));
      const atualizado = (await api.put(`/api/badges/${modal.badge.id_badge}`, dadosBadge)).data;
      await Promise.all((requisitosNovos || []).map((req, idx) => api.post('/api/requisitos', {
        id_badge: modal.badge.id_badge,
        titulo: req.titulo,
        descricao: req.descricao,
        tipo_evidencia: req.tipo_evidencia,
        imagem_url: req.imagem_url || null,
        ordem: dadosBadge.requisitos.length + idx + 1,
        obrigatorio: 1,
        ativo: 1,
      })));
      return atualizado;
    },
    onSuccess: () => {
      toast.success(t('admin_badges_toast_atualizado'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'badges'] });
      qc.invalidateQueries({ queryKey: ['admin', 'requisitos'] });
      qc.invalidateQueries({ queryKey: ['admin', 'niveis'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const alternarEstado = useMutation({
    mutationFn: async (badge) => (await api.put(`/api/badges/${badge.id_badge}`, { ativo: !(badge.ativo !== 0) })).data,
    onSuccess: () => {
      toast.success(t('admin_lp_toast_estado_atualizado'));
      qc.invalidateQueries({ queryKey: ['admin', 'badges'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const eliminar = useMutation({
    mutationFn: async () => (await api.delete(`/api/badges/${modal.badge.id_badge}`)).data,
    onSuccess: () => {
      toast.success(t('admin_badges_toast_eliminado'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'badges'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const lista = badges.data?.dados || [];
  const total = badges.data?.total || 0;
  const porPagina = badges.data?.por_pagina || 5;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const lps = learningPaths.data?.dados || [];
  const sls = serviceLines.data?.dados || [];
  const listaAreas = areas.data?.dados || [];
  const listaNiveis = niveis.data?.dados || [];
  const listaRequisitos = requisitos.data?.dados || [];

  const idBadgeExterno = editarBadgeId || location.state?.editarBadgeId || null;

  useEffect(() => {
    if (!idBadgeExterno) return;
    abrirEdicao({ id_badge: idBadgeExterno });
    onEditarBadgeConsumido?.();
  }, [idBadgeExterno]);

  const serviceLinesFiltro = useMemo(() => {
    if (!filtros.id_learning_path) return sls;
    return sls.filter((sl) => String(sl.id_learning_path) === String(filtros.id_learning_path));
  }, [filtros.id_learning_path, sls]);

  const areasFiltro = useMemo(() => {
    if (filtros.id_service_line) return listaAreas.filter((area) => String(area.id_service_line) === String(filtros.id_service_line));
    if (filtros.id_learning_path) return listaAreas.filter((area) => String(area.id_learning_path) === String(filtros.id_learning_path));
    return listaAreas;
  }, [filtros.id_learning_path, filtros.id_service_line, listaAreas]);

  const niveisFiltro = useMemo(() => {
    if (filtros.id_area) return listaNiveis.filter((nivel) => String(nivel.id_area) === String(filtros.id_area));
    if (filtros.id_service_line) return listaNiveis.filter((nivel) => String(nivel.id_service_line) === String(filtros.id_service_line));
    if (filtros.id_learning_path) return listaNiveis.filter((nivel) => String(nivel.id_learning_path) === String(filtros.id_learning_path));
    return listaNiveis;
  }, [filtros.id_area, filtros.id_learning_path, filtros.id_service_line, listaNiveis]);

  function atualizarFiltro(campo, valor) {
    setFiltros((atual) => {
      const proximo = { ...atual, [campo]: valor };

      if (campo === 'id_learning_path') {
        proximo.id_service_line = '';
        proximo.id_area = '';
        proximo.id_nivel = '';
      }
      if (campo === 'id_service_line') {
        proximo.id_area = '';
        proximo.id_nivel = '';
        const serviceLine = sls.find((sl) => String(sl.id_service_line) === String(valor));
        if (serviceLine?.id_learning_path) proximo.id_learning_path = String(serviceLine.id_learning_path);
      }
      if (campo === 'id_area') {
        proximo.id_nivel = '';
        const area = listaAreas.find((item) => String(item.id_area) === String(valor));
        if (area) {
          proximo.id_service_line = String(area.id_service_line);
          proximo.id_learning_path = String(area.id_learning_path);
        }
      }
      if (campo === 'id_nivel') {
        const nivel = listaNiveis.find((item) => String(item.id_nivel) === String(valor));
        if (nivel) {
          proximo.id_area = String(nivel.id_area);
          proximo.id_service_line = String(nivel.id_service_line);
          proximo.id_learning_path = String(nivel.id_learning_path);
        }
      }

      return proximo;
    });
    setPagina(1);
  }

  function limparFiltros() {
    setFiltros({ pesquisa: '', id_learning_path: '', id_service_line: '', id_area: '', id_nivel: '', estado: '' });
    setPagina(1);
  }

  function abrirCriacao() {
    if (learningPaths.isLoading || serviceLines.isLoading || areas.isLoading || niveis.isLoading || requisitos.isLoading) {
      toast(t('admin_areas_a_carregar_hierarquia'));
      return;
    }
    if (lps.length === 0) return toast.error(t('admin_badges_erro_sem_lp'));
    if (sls.length === 0) return toast.error(t('admin_badges_erro_sem_sl'));
    if (listaAreas.length === 0) return toast.error(t('admin_badges_erro_sem_area'));
    if (listaNiveis.length === 0) return toast.error(t('admin_badges_erro_sem_nivel'));

    const nivelBase = filtros.id_nivel
      ? listaNiveis.find((nivel) => String(nivel.id_nivel) === String(filtros.id_nivel))
      : encontrarNivelNoContexto({ codigo: 'A', filtros, niveis: listaNiveis });

    setForm({
      ...FORM_INICIAL,
      id_learning_path: nivelBase?.id_learning_path ? String(nivelBase.id_learning_path) : filtros.id_learning_path,
      id_service_line: nivelBase?.id_service_line ? String(nivelBase.id_service_line) : filtros.id_service_line,
      id_area: nivelBase?.id_area ? String(nivelBase.id_area) : filtros.id_area,
      codigo_nivel: nivelBase?.codigo_nivel || 'A',
      id_nivel: nivelBase ? String(nivelBase.id_nivel) : '',
    });
    return setModal({ tipo: 'criar' });
  }

  async function abrirEdicao(badge) {
    setModal({ tipo: 'editar', badge, carregando: true });
    try {
      const detalhe = (await api.get(`/api/badges/${badge.id_badge}`)).data;
      const item = detalhe.badge;
      setForm({
        ...FORM_INICIAL,
        titulo: item.titulo || '',
        descricao: item.descricao || '',
        id_learning_path: item.id_learning_path ? String(item.id_learning_path) : '',
        id_service_line: item.id_service_line ? String(item.id_service_line) : '',
        id_area: item.id_area ? String(item.id_area) : '',
        codigo_nivel: item.codigo_nivel || 'A',
        id_nivel: item.id_nivel ? String(item.id_nivel) : '',
        pontos: item.pontos ?? 0,
        imagem_url: item.imagem_url || '',
        is_conquista_especial: Boolean(item.is_conquista_especial),
        competencias_certificadas: textoDeLista(item.competencias_certificadas),
        beneficios: textoDeLista(item.beneficios),
        tem_expiracao: Boolean(item.tem_expiracao),
        tipo_expiracao: 'dias',
        valor_expiracao: item.validade_dias || 30,
        data_expiracao: formatarDataInput(item.data_expiracao_badge) || adicionarDias(item.created_at || new Date(), item.validade_dias || 30),
        validade_dias: item.validade_dias || 30,
        ativo: item.ativo !== 0,
        requisitos: (detalhe.requisitos || []).map((req) => req.id_requisito),
      });
      setModal({ tipo: 'editar', badge: item });
    } catch (err) {
      setModal(null);
      toast.error(extrairErro(err, t('admin_badges_erro_abrir')));
    }
  }

  async function obterTodosFiltrados() {
    return (await obterTodasDaRota('/api/badges', {
      pesquisa: filtros.pesquisa || undefined,
      id_learning_path: filtros.id_learning_path || undefined,
      id_service_line: filtros.id_service_line || undefined,
      id_area: filtros.id_area || undefined,
      id_nivel: filtros.id_nivel || undefined,
      estado: filtros.estado || undefined,
    })).dados;
  }

  async function exportarExcel() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosBadges(todos, t);
      descarregarCsv('badges.csv', headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_badges_erro_exportar_excel')));
    }
  }

  async function exportarPdf() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosBadges(todos, t);
      imprimirTabela(t('admin_menu_badges'), headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_lp_erro_exportar_pdf')));
    }
  }

  return (
    <div className="mx-auto max-w-[1560px] space-y-7">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin_menu_badges')}</h1>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={exportarExcel}>
            <Icon nome="file" className="h-4 w-4" /> {t('admin_sla_export_excel')}
          </button>
          <button type="button" className="btn-secondary" onClick={exportarPdf}>
            <Icon nome="file" className="h-4 w-4" /> {t('admin_sla_export_pdf')}
          </button>
          <button type="button" className="btn-primary" onClick={abrirCriacao}>
            <Icon nome="plus" className="h-4 w-4" /> {t('admin_eventos_criar_badge')}
          </button>
        </div>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_210px_220px_200px_190px_190px_200px]">
          <label className="relative block">
            <Icon nome="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder={t('admin_pontos_pesquisar')}
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
          <select className="input" value={filtros.id_nivel} onChange={(e) => atualizarFiltro('id_nivel', e.target.value)}>
            <option value="">{t('admin_req_nivel_todos')}</option>
            {niveisFiltro.map((nivel) => (
              <option key={nivel.id_nivel} value={nivel.id_nivel}>
                {nivel.codigo_nivel} - {nivel.nome_nivel}
              </option>
            ))}
          </select>
          <select className="input" value={filtros.estado} onChange={(e) => atualizarFiltro('estado', e.target.value)}>
            <option value="">{t('admin_notif_estado_todos')}</option>
            <option value="ativo">{t('admin_dash_notice_active')}</option>
            <option value="expirado">{t('admin_pontos_expirado')}</option>
            <option value="inativo">{t('admin_dash_notice_inactive')}</option>
          </select>
          <button type="button" className="btn-secondary border-softinsa-600 text-softinsa-700" onClick={limparFiltros}>
            <Icon nome="x" className="h-4 w-4" /> {t('admin_notif_limpar_filtros')}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1360px] w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-4 text-left">{t('admin_pontos_col_badge')}</th>
                <th className="px-4 py-4 text-left">{t('admin_badges_col_nivel_associado')}</th>
                <th className="px-4 py-4 text-left">{t('admin_rel_col_area')}</th>
                <th className="px-4 py-4 text-left">{t('admin_dash_col_service_line')}</th>
                <th className="px-4 py-4 text-left">{t('admin_rel_col_lp')}</th>
                <th className="px-4 py-4 text-center">{t('admin_pontos_atuais')}</th>
                <th className="px-4 py-4 text-center">{t('admin_eventos_expiracao')}</th>
                <th className="px-4 py-4 text-center">{t('admin_lp_col_data_criacao')}</th>
                <th className="px-4 py-4 text-center">{t('admin_dash_col_state')}</th>
                <th className="px-4 py-4 text-center">{t('admin_sla_col_acoes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {badges.isLoading ? (
                <tr><td colSpan={10} className="px-5 py-12 text-center text-slate-500">{t('admin_badges_a_carregar')}</td></tr>
              ) : lista.map((badge) => {
                const estado = estadoBadge(badge);
                return (
                  <tr key={badge.id_badge} className="text-slate-700">
                    <td className="px-4 py-5 font-semibold text-slate-800">{badge.titulo}</td>
                    <td className="px-4 py-5 text-slate-500">{dificuldade(badge)}</td>
                    <td className="px-4 py-5 text-slate-500">{badge.nome_area}</td>
                    <td className="px-4 py-5 text-slate-500">{badge.nome_service_line}</td>
                    <td className="px-4 py-5 text-slate-500">{badge.nome_learning_path}</td>
                    <td className="px-4 py-5 text-center font-semibold text-slate-800">{badge.pontos || 0}</td>
                    <td className="px-4 py-5 text-center text-slate-600">{expiracaoTexto(badge, t)}</td>
                    <td className="px-4 py-5 text-center text-slate-600">{formatarData(badge.created_at)}</td>
                    <td className="px-4 py-5 text-center">
                      <span className={`badge-pill ${estadoClasses(estado)}`}>{estadoLabel(estado, t)}</span>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center justify-center gap-4 text-softinsa-700">
                        <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_ver')} onClick={() => setModal({ tipo: 'ver', badge })}><Icon nome="eye" className="h-5 w-5" /></button>
                        <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_editar')} onClick={() => abrirEdicao(badge)}><Icon nome="edit" className="h-5 w-5" /></button>
                        <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={badge.ativo !== 0 ? t('admin_lp_desativar') : t('admin_lp_ativar')} onClick={() => badge.ativo !== 0 ? setModal({ tipo: 'desativar', badge }) : alternarEstado.mutate(badge)}><Icon nome="power" className="h-5 w-5" /></button>
                        <button type="button" className="rounded-md p-1 text-red-600 hover:bg-red-50" title={t('admin_notif_eliminar')} onClick={() => setModal({ tipo: 'eliminar', badge })}><Icon nome="trash" className="h-5 w-5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!badges.isLoading && lista.length === 0 && (
                <tr><td colSpan={10} className="px-5 py-12 text-center text-slate-500">{t('admin_pontos_vazio')}</td></tr>
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

      {['criar', 'editar'].includes(modal?.tipo) && (
        <Modal titulo={modal.tipo === 'criar' ? t('admin_eventos_criar_badge') : t('admin_pontos_editar_badge')} onFechar={() => setModal(null)} size="lg">
          {modal.carregando ? (
            <div className="px-7 py-12 text-center text-slate-500">{t('admin_badges_a_carregar_badge')}</div>
          ) : (
            <FormBadge
              form={form}
              setForm={setForm}
              learningPaths={lps}
              serviceLines={sls}
              areas={listaAreas}
              requisitos={listaRequisitos}
              niveis={listaNiveis}
              filtros={filtros}
              badgeAtual={modal.badge}
              modo={modal.tipo}
              onSubmit={(e) => { e.preventDefault(); modal.tipo === 'criar' ? criar.mutate() : atualizar.mutate(); }}
              onCancelar={() => setModal(null)}
              loading={modal.tipo === 'criar' ? criar.isPending : atualizar.isPending}
              t={t}
            />
          )}
        </Modal>
      )}

      {modal?.tipo === 'ver' && (
        <Modal titulo={t('admin_badges_modal_detalhe_titulo')} onFechar={() => setModal(null)}>
          <div className="grid grid-cols-1 gap-4 px-7 py-5 text-sm md:grid-cols-2">
            <div><div className="text-slate-500">{t('admin_rel_col_nome')}</div><div className="font-semibold">{modal.badge.titulo}</div></div>
            <div><div className="text-slate-500">{t('admin_dash_level')}</div><div className="font-semibold">{dificuldade(modal.badge)}</div></div>
            <div><div className="text-slate-500">{t('admin_rel_col_area')}</div><div className="font-semibold">{modal.badge.nome_area}</div></div>
            <div><div className="text-slate-500">Service Line</div><div className="font-semibold">{modal.badge.nome_service_line}</div></div>
            <div><div className="text-slate-500">Learning Path</div><div className="font-semibold">{modal.badge.nome_learning_path}</div></div>
            <div><div className="text-slate-500">{t('admin_pontos_atuais')}</div><div className="font-semibold">{modal.badge.pontos || 0}</div></div>
            <div><div className="text-slate-500">{t('admin_eventos_expiracao')}</div><div className="font-semibold">{expiracaoTexto(modal.badge, t)}</div></div>
            <div><div className="text-slate-500">{t('admin_dash_col_state')}</div><div className="font-semibold">{estadoLabel(estadoBadge(modal.badge), t)}</div></div>
            <div className="md:col-span-2"><div className="text-slate-500">{t('admin_lp_descricao')}</div><div className="font-semibold">{modal.badge.descricao || '—'}</div></div>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'desativar' && (
        <Modal titulo={t('admin_badges_modal_desativar_titulo')} icon="warning" iconTone="amber" size="sm" onFechar={() => setModal(null)}>
          <div className="px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              {t('admin_badges_desativar_confirm').replace('{titulo}', modal.badge.titulo)}
            </p>
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>{t('admin_cancel')}</button>
            <button
              type="button"
              className="btn bg-orange-500 px-7 text-white hover:bg-orange-600"
              disabled={alternarEstado.isPending}
              onClick={() => alternarEstado.mutate(modal.badge, { onSuccess: () => setModal(null) })}
            >
              {alternarEstado.isPending ? t('admin_lp_a_confirmar') : t('admin_lp_confirmar')}
            </button>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'eliminar' && (
        <Modal titulo={t('admin_badges_modal_eliminar_titulo')} icon="warning" iconTone="rose" size="sm" onFechar={() => setModal(null)}>
          <div className="space-y-4 px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              {t('admin_badges_eliminar_confirm').replace('{titulo}', modal.badge.titulo)}
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
