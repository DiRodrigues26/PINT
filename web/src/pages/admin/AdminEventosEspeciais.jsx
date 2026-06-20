import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
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
import UploadImagemAdmin from '../../components/UploadImagemAdmin';
import Paginacao from '../../components/admin/Paginacao';
import { useLanguage } from '../../context/LanguageContext';

const CODIGOS_NIVEL = ['A', 'B', 'C', 'D', 'E'];

function niveisMap(t) {
  return {
    A: t('admin_nivel_a'),
    B: t('admin_nivel_b'),
    C: t('admin_nivel_c'),
    D: t('admin_nivel_d'),
    E: t('admin_nivel_e'),
  };
}

const FORM_INICIAL = {
  titulo: '',
  imagem_url: '',
  codigo_nivel: 'A',
  id_nivel: '',
  id_badge: '',
  data_limite_ativa: true,
  data_limite: '',
  ativo: true,
  requisitosSelecionados: [],
  pesquisaRequisito: '',
  filtroNivelRequisito: '',
  filtroTipoRequisito: '',
  pesquisaBadge: '',
};

const ICONES = {
  calendar: Calendar,
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
  const sizeClass = size === 'sm' ? 'max-w-xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-2xl';
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

function dataParaInput(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toISOString().slice(0, 10);
}

function dataFuturaPadrao() {
  const data = new Date();
  data.setDate(data.getDate() + 90);
  return data.toISOString().slice(0, 10);
}

function dificuldade(item, t) {
  const codigo = item.codigo_nivel || '';
  return codigo ? `(${codigo}) ${item.nome_nivel || niveisMap(t)[codigo] || ''}` : '—';
}

function expiracaoBadge(item, t) {
  if (!item?.id_badge) return 'n/a';
  if (!item.tem_expiracao_badge && !item.tem_expiracao) return 'n/a';
  const dias = item.validade_dias_badge || item.validade_dias;
  return dias ? t('admin_eventos_dias').replace('{total}', dias) : t('admin_eventos_expiracao_configurada');
}

function tipoRequisitoValor(req) {
  const texto = `${req.titulo || ''} ${req.descricao || ''}`.toLowerCase();
  if (texto.includes('curso')) return 'CURSO';
  if (texto.includes('badge')) return 'BADGES';
  return 'EVENTO';
}

function tipoRequisitoLabel(valor, t) {
  return {
    BADGES: t('admin_eventos_tipo_badges'),
    CURSO: t('admin_eventos_tipo_curso'),
    EVENTO: t('admin_eventos_tipo_evento'),
  }[valor] || valor;
}

function dadosEventos(items, t) {
  const headers = [
    t('admin_rel_col_titulo'),
    t('admin_niveis_dificuldade'),
    t('admin_rel_col_nr_req'),
    t('admin_dash_col_badge'),
    t('admin_lp_col_data_criacao'),
    t('admin_rel_col_data_limite'),
    t('admin_dash_col_state'),
  ];
  const linhas = items.map((evento) => [
    evento.titulo,
    dificuldade(evento, t),
    evento.n_requisitos || 0,
    evento.titulo_badge || '',
    formatarData(evento.data_criacao),
    formatarData(evento.data_limite),
    evento.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive'),
  ]);
  return { headers, linhas };
}

function prepararPayload(form, niveis) {
  const nivel = niveis.find((n) => String(n.id_nivel) === String(form.id_nivel))
    || niveis.find((n) => n.codigo_nivel === form.codigo_nivel);

  return {
    titulo: form.titulo.trim(),
    id_nivel: Number(nivel?.id_nivel || form.id_nivel),
    id_badge: form.id_badge ? Number(form.id_badge) : null,
    imagem_url: form.imagem_url || null,
    data_limite: form.data_limite_ativa && form.data_limite ? form.data_limite : null,
    ativo: form.ativo,
  };
}

function BadgeEspecialResumo({ form, setForm, badges, modo, t }) {
  const pesquisa = form.pesquisaBadge.trim().toLowerCase();
  const selecionado = badges.find((badge) => String(badge.id_badge) === String(form.id_badge));
  const linhas = pesquisa
    ? badges.filter((badge) => badge.titulo?.toLowerCase().includes(pesquisa)).slice(0, 5)
    : selecionado ? [selecionado] : [];

  return (
    <div>
      <label className="relative mb-3 block">
        <Icon nome="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-11"
          placeholder={t('admin_pontos_pesquisar')}
          value={form.pesquisaBadge}
          onChange={(e) => setForm((atual) => ({ ...atual, pesquisaBadge: e.target.value }))}
        />
      </label>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-4 text-center">{t('admin_pontos_col_badge')}</th>
              <th className="px-4 py-4 text-center">{t('admin_pontos_atuais')}</th>
              <th className="px-4 py-4 text-center">{t('admin_eventos_expiracao')}</th>
              <th className="px-4 py-4 text-center">{t('admin_dash_col_state')}</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length > 0 ? linhas.map((badge) => (
              <tr
                key={badge.id_badge}
                className={`cursor-pointer border-t border-slate-200 text-slate-800 hover:bg-blue-50 ${String(badge.id_badge) === String(form.id_badge) ? 'bg-blue-50' : ''}`}
                onClick={() => setForm((atual) => ({ ...atual, id_badge: String(badge.id_badge), pesquisaBadge: '' }))}
              >
                <td className="px-4 py-5 text-center font-medium">{badge.titulo}</td>
                <td className="px-4 py-5 text-center font-medium">{badge.pontos || 0}</td>
                <td className="px-4 py-5 text-center font-medium">{expiracaoBadge(badge, t)}</td>
                <td className="px-4 py-5 text-center">
                  <span className={`badge-pill ${badge.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {badge.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive')}
                  </span>
                </td>
              </tr>
            )) : (
              <tr className="border-t border-slate-200 text-slate-800">
                <td className="px-4 py-5 text-center font-medium">n/a</td>
                <td className="px-4 py-5 text-center font-medium">n/a</td>
                <td className="px-4 py-5 text-center font-medium">n/a</td>
                <td className="px-4 py-5 text-center font-medium">n/a</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            className="btn-primary"
            onClick={() => toast(modo === 'criar' ? t('admin_eventos_toast_criar_badge_pendente') : t('admin_eventos_toast_editar_badge_pendente'))}
          >
            <Icon nome={modo === 'criar' ? 'plus' : 'edit'} className="h-4 w-4" />
            {modo === 'criar' ? t('admin_eventos_criar_badge') : t('admin_pontos_editar_badge')}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormEvento({ form, setForm, evento, requisitos, niveis, badges, modo, onSubmit, onCancelar, loading, t }) {
  const requisitosFiltrados = useMemo(() => {
    const pesquisa = form.pesquisaRequisito.trim().toLowerCase();
    return requisitos.filter((req) => {
      const passaPesquisa = !pesquisa
        || req.titulo?.toLowerCase().includes(pesquisa)
        || req.descricao?.toLowerCase().includes(pesquisa);
      const passaNivel = !form.filtroNivelRequisito || form.filtroNivelRequisito === form.codigo_nivel;
      const passaTipo = !form.filtroTipoRequisito || tipoRequisitoValor(req) === form.filtroTipoRequisito;
      return passaPesquisa && passaNivel && passaTipo;
    });
  }, [form.codigo_nivel, form.filtroNivelRequisito, form.filtroTipoRequisito, form.pesquisaRequisito, requisitos]);

  function atualizarNivel(codigo) {
    const nivelAtual = niveis.find((n) => String(n.id_nivel) === String(evento?.id_nivel || form.id_nivel));
    const nivelMesmoContexto = niveis.find((n) => n.codigo_nivel === codigo && n.id_area === nivelAtual?.id_area);
    const proximoNivel = nivelMesmoContexto || niveis.find((n) => n.codigo_nivel === codigo);
    setForm((atual) => ({ ...atual, codigo_nivel: codigo, id_nivel: proximoNivel ? String(proximoNivel.id_nivel) : atual.id_nivel }));
  }

  function alternarRequisito(id) {
    setForm((atual) => {
      const existe = atual.requisitosSelecionados.includes(id);
      return {
        ...atual,
        requisitosSelecionados: existe
          ? atual.requisitosSelecionados.filter((item) => item !== id)
          : [...atual.requisitosSelecionados, id],
      };
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="max-h-[72vh] space-y-6 overflow-y-auto px-7 py-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            {t('admin_eventos_titulo_evento')}<span className="text-red-600">*</span>
          </label>
          <input
            className="input"
            required
            placeholder={t('admin_eventos_placeholder_titulo')}
            value={form.titulo}
            onChange={(e) => setForm((atual) => ({ ...atual, titulo: e.target.value }))}
          />
        </div>

        <div>
          <div className="mb-3 text-sm font-medium text-slate-900">{t('admin_dash_level')}</div>
          <div className="flex flex-wrap gap-5 text-base text-slate-700">
            {CODIGOS_NIVEL.map((codigo) => (
              <label key={codigo} className="flex items-center gap-2">
                <input
                  type="radio"
                  className="h-4 w-4 text-softinsa-600"
                  checked={form.codigo_nivel === codigo}
                  onChange={() => atualizarNivel(codigo)}
                />
                {codigo}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-slate-900">
            {t('admin_eventos_imagem')}<span className="text-red-600">*</span>
          </label>
          <UploadImagemAdmin
            contexto="eventos"
            valor={form.imagem_url}
            onUpload={(url) => setForm((atual) => ({ ...atual, imagem_url: url }))}
          />
        </div>

        <div>
          <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900">
            <input
              type="checkbox"
              className="h-4 w-4 rounded text-softinsa-600"
              checked={form.data_limite_ativa}
              onChange={(e) => setForm((atual) => ({ ...atual, data_limite_ativa: e.target.checked }))}
            />
            {t('admin_eventos_data_limite')}<span className="text-red-600">*</span>
          </label>
          <label className="relative block">
            <Icon nome="calendar" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="date"
              className="input pl-11"
              disabled={!form.data_limite_ativa}
              required={form.data_limite_ativa}
              value={form.data_limite}
              onChange={(e) => setForm((atual) => ({ ...atual, data_limite: e.target.value }))}
            />
          </label>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-slate-900">
            {t('admin_eventos_requisitos_especiais')}<span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_200px]">
            <label className="relative block">
              <Icon nome="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-11"
                placeholder={t('admin_eventos_pesquisar_requisitos')}
                value={form.pesquisaRequisito}
                onChange={(e) => setForm((atual) => ({ ...atual, pesquisaRequisito: e.target.value }))}
              />
            </label>
            <select className="input" value={form.filtroNivelRequisito} onChange={(e) => setForm((atual) => ({ ...atual, filtroNivelRequisito: e.target.value }))}>
              <option value="">{t('admin_req_nivel_todos')}</option>
              {CODIGOS_NIVEL.map((codigo) => <option key={codigo} value={codigo}>{codigo}</option>)}
            </select>
            <select className="input" value={form.filtroTipoRequisito} onChange={(e) => setForm((atual) => ({ ...atual, filtroTipoRequisito: e.target.value }))}>
              <option value="">{t('admin_req_tipo_todos')}</option>
              <option value="BADGES">{t('admin_eventos_tipo_badges')}</option>
              <option value="CURSO">{t('admin_eventos_tipo_curso')}</option>
              <option value="EVENTO">{t('admin_eventos_tipo_evento')}</option>
            </select>
          </div>
          <div className="mt-1 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-16 px-4 py-4 text-center"></th>
                  <th className="px-4 py-4 text-center">{t('admin_rel_col_titulo')}</th>
                  <th className="px-4 py-4 text-center">{t('admin_lp_descricao')}</th>
                  <th className="px-4 py-4 text-center">{t('admin_req_tipo_evidencia')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {requisitosFiltrados.map((req) => (
                  <tr key={req.id_ee_requisito}>
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded text-softinsa-600"
                        checked={form.requisitosSelecionados.includes(req.id_ee_requisito)}
                        onChange={() => alternarRequisito(req.id_ee_requisito)}
                      />
                    </td>
                    <td className="px-4 py-4 text-center font-medium text-slate-800">{req.titulo}</td>
                    <td className="px-4 py-4 text-center text-slate-600">{req.descricao || '—'}</td>
                    <td className="px-4 py-4 text-center text-slate-600">{tipoRequisitoLabel(tipoRequisitoValor(req), t)}</td>
                  </tr>
                ))}
                {requisitosFiltrados.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">{t('admin_eventos_sem_requisitos')}</td></tr>
                )}
              </tbody>
            </table>
            <Paginacao
              as="div"
              pagina={1}
              totalPaginas={1}
              total={requisitosFiltrados.length}
              porPagina={Math.max(1, requisitosFiltrados.length || 1)}
              itensNaPagina={requisitosFiltrados.length}
              onMudarPagina={() => {}}
              className="gap-3 px-6 py-3"
            >
              <button type="button" className="btn-primary" onClick={() => toast(t('admin_eventos_toast_criar_req_pendente'))}>
                <Icon nome="plus" className="h-4 w-4" /> {t('admin_eventos_criar_requisito')}
              </button>
            </Paginacao>
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-slate-900">
            {t('admin_eventos_badge_especial')}<span className="text-red-600">*</span>
          </label>
          <BadgeEspecialResumo form={form} setForm={setForm} badges={badges} modo={modo} t={t} />
        </div>

        <div>
          <div className="mb-3 text-sm font-medium text-slate-900">{t('admin_dash_col_state')}</div>
          <div className="flex gap-4 text-base text-slate-700">
            <label className="flex items-center gap-2">
              <input type="radio" className="h-4 w-4 text-softinsa-600" checked={form.ativo} onChange={() => setForm((atual) => ({ ...atual, ativo: true }))} />
              {t('admin_dash_notice_active')}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" className="h-4 w-4 text-softinsa-600" checked={!form.ativo} onChange={() => setForm((atual) => ({ ...atual, ativo: false }))} />
              {t('admin_dash_notice_inactive')}
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t-4 border-slate-200 px-7 py-5">
        <button type="button" className="btn-secondary px-6" onClick={onCancelar}>{t('admin_cancel')}</button>
        <button type="submit" className="btn-primary min-w-48" disabled={loading}>
          {loading ? t('admin_lp_a_guardar') : modo === 'criar' ? t('admin_eventos_criar') : t('admin_eventos_editar')}
        </button>
      </div>
    </form>
  );
}

export default function AdminEventosEspeciais() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState({ pesquisa: '', id_learning_path: '', id_service_line: '', id_area: '' });
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);

  const eventos = useQuery({
    queryKey: ['admin', 'eventos-especiais', filtros, pagina],
    queryFn: async () => (await api.get('/api/eventos', {
      params: {
        pagina,
        por_pagina: 5,
        pesquisa: filtros.pesquisa || undefined,
        id_learning_path: filtros.id_learning_path || undefined,
        id_service_line: filtros.id_service_line || undefined,
        id_area: filtros.id_area || undefined,
      },
    })).data,
  });

  const learningPaths = useQuery({
    queryKey: ['admin', 'eventos', 'learning-paths-select'],
    queryFn: async () => obterTodasDaRota('/api/learning-paths'),
  });

  const serviceLines = useQuery({
    queryKey: ['admin', 'eventos', 'service-lines-select'],
    queryFn: async () => obterTodasDaRota('/api/service-lines'),
  });

  const areas = useQuery({
    queryKey: ['admin', 'eventos', 'areas-select'],
    queryFn: async () => obterTodasDaRota('/api/areas'),
  });

  const niveis = useQuery({
    queryKey: ['admin', 'eventos', 'niveis-select'],
    queryFn: async () => obterTodasDaRota('/api/niveis'),
  });

  const badges = useQuery({
    queryKey: ['admin', 'eventos', 'badges-especiais-select'],
    queryFn: async () => obterTodasDaRota('/api/badges', { is_conquista_especial: 1 }),
  });

  const criar = useMutation({
    mutationFn: async () => {
      const payload = prepararPayload(form, niveis.data?.dados || []);
      if (!payload.id_nivel) throw new Error(t('admin_eventos_erro_nivel'));
      return (await api.post('/api/eventos', payload)).data;
    },
    onSuccess: () => {
      toast.success(t('admin_eventos_toast_criado'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'eventos-especiais'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const atualizar = useMutation({
    mutationFn: async () => {
      await api.put(`/api/eventos/${modal.evento.id_evento}`, prepararPayload(form, niveis.data?.dados || []));

      const requisitosAtuais = modal.requisitos || [];
      const removidos = requisitosAtuais.filter((req) => !form.requisitosSelecionados.includes(req.id_ee_requisito));
      await Promise.all(removidos.map((req) => api.delete(`/api/eventos/${modal.evento.id_evento}/requisitos/${req.id_ee_requisito}`)));
    },
    onSuccess: () => {
      toast.success(t('admin_eventos_toast_atualizado'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'eventos-especiais'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const alternarEstado = useMutation({
    mutationFn: async (evento) => (await api.put(`/api/eventos/${evento.id_evento}`, { ativo: !evento.ativo })).data,
    onSuccess: () => {
      toast.success(t('admin_lp_toast_estado_atualizado'));
      qc.invalidateQueries({ queryKey: ['admin', 'eventos-especiais'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const eliminar = useMutation({
    mutationFn: async () => (await api.delete(`/api/eventos/${modal.evento.id_evento}`)).data,
    onSuccess: () => {
      toast.success(t('admin_eventos_toast_eliminado'));
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'eventos-especiais'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const lista = eventos.data?.dados || [];
  const total = eventos.data?.total || 0;
  const porPagina = eventos.data?.por_pagina || 5;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const lps = learningPaths.data?.dados || [];
  const sls = serviceLines.data?.dados || [];
  const listaAreas = areas.data?.dados || [];
  const listaNiveis = niveis.data?.dados || [];
  const listaBadges = badges.data?.dados || [];

  const serviceLinesFiltro = useMemo(() => {
    if (!filtros.id_learning_path) return sls;
    return sls.filter((sl) => String(sl.id_learning_path) === String(filtros.id_learning_path));
  }, [filtros.id_learning_path, sls]);

  const areasFiltro = useMemo(() => {
    if (filtros.id_service_line) return listaAreas.filter((area) => String(area.id_service_line) === String(filtros.id_service_line));
    if (filtros.id_learning_path) return listaAreas.filter((area) => String(area.id_learning_path) === String(filtros.id_learning_path));
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
        const serviceLine = sls.find((sl) => String(sl.id_service_line) === String(valor));
        if (serviceLine?.id_learning_path) proximo.id_learning_path = String(serviceLine.id_learning_path);
      }
      if (campo === 'id_area') {
        const area = listaAreas.find((item) => String(item.id_area) === String(valor));
        if (area) {
          proximo.id_service_line = String(area.id_service_line);
          proximo.id_learning_path = String(area.id_learning_path);
        }
      }
      return proximo;
    });
    setPagina(1);
  }

  function limparFiltros() {
    setFiltros({ pesquisa: '', id_learning_path: '', id_service_line: '', id_area: '' });
    setPagina(1);
  }

  async function obterTodosFiltrados() {
    return (await obterTodasDaRota('/api/eventos', {
      pesquisa: filtros.pesquisa || undefined,
      id_learning_path: filtros.id_learning_path || undefined,
      id_service_line: filtros.id_service_line || undefined,
      id_area: filtros.id_area || undefined,
    })).dados;
  }

  async function exportarExcel() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosEventos(todos, t);
      descarregarCsv('eventos-especiais.csv', headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_eventos_erro_exportar_excel')));
    }
  }

  async function exportarPdf() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosEventos(todos, t);
      imprimirTabela(t('admin_menu_eventos'), headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_lp_erro_exportar_pdf')));
    }
  }

  async function abrirEdicao(evento) {
    setModal({ tipo: 'editar', evento, requisitos: [], carregando: true });
    try {
      const detalhe = (await api.get(`/api/eventos/${evento.id_evento}`)).data;
      const requisitos = detalhe.requisitos || [];
      setForm({
        ...FORM_INICIAL,
        titulo: detalhe.evento.titulo || '',
        codigo_nivel: detalhe.evento.codigo_nivel || 'A',
        id_nivel: detalhe.evento.id_nivel ? String(detalhe.evento.id_nivel) : '',
        id_badge: detalhe.evento.id_badge ? String(detalhe.evento.id_badge) : '',
        imagem_url: detalhe.evento.imagem_url || detalhe.evento.imagem_badge || '',
        data_limite_ativa: Boolean(detalhe.evento.data_limite),
        data_limite: dataParaInput(detalhe.evento.data_limite),
        ativo: detalhe.evento.ativo !== 0,
        requisitosSelecionados: requisitos.map((req) => req.id_ee_requisito),
      });
      setModal({ tipo: 'editar', evento: detalhe.evento, requisitos });
    } catch (err) {
      setModal(null);
      toast.error(extrairErro(err, t('admin_eventos_erro_abrir')));
    }
  }

  function abrirCriacao() {
    if (learningPaths.isLoading || serviceLines.isLoading || areas.isLoading || niveis.isLoading) {
      toast(t('admin_areas_a_carregar_hierarquia'));
      return;
    }
    if (lps.length === 0) {
      toast.error(t('admin_eventos_erro_sem_lp'));
      return;
    }
    if (sls.length === 0) {
      toast.error(t('admin_eventos_erro_sem_sl'));
      return;
    }
    if (listaAreas.length === 0) {
      toast.error(t('admin_eventos_erro_sem_area'));
      return;
    }
    if (listaNiveis.length === 0) {
      toast.error(t('admin_eventos_erro_sem_nivel'));
      return;
    }

    const nivelInicial = listaNiveis.find((nivel) => nivel.codigo_nivel === 'A') || listaNiveis[0];
    setForm({
      ...FORM_INICIAL,
      codigo_nivel: nivelInicial.codigo_nivel || 'A',
      id_nivel: String(nivelInicial.id_nivel),
      data_limite: dataFuturaPadrao(),
    });
    setModal({ tipo: 'criar', evento: { id_nivel: nivelInicial.id_nivel }, requisitos: [] });
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-7">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin_menu_eventos')}</h1>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={exportarExcel}>
            <Icon nome="download" className="h-4 w-4" /> {t('admin_sla_export_excel')}
          </button>
          <button type="button" className="btn-secondary" onClick={exportarPdf}>
            <Icon nome="file" className="h-4 w-4" /> {t('admin_sla_export_pdf')}
          </button>
          <button type="button" className="btn-primary" onClick={abrirCriacao}>
            <Icon nome="plus" className="h-4 w-4" /> {t('admin_eventos_criar')}
          </button>
        </div>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_220px_220px_200px_200px]">
          <label className="relative block">
            <Icon nome="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder={t('admin_eventos_pesquisar')}
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
          <table className="min-w-[1120px] w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-4 text-center">{t('admin_rel_col_titulo')}</th>
                <th className="px-4 py-4 text-center">{t('admin_niveis_dificuldade')}</th>
                <th className="px-4 py-4 text-center">{t('admin_rel_col_nr_req')}</th>
                <th className="px-4 py-4 text-center">{t('admin_dash_col_badge')}</th>
                <th className="px-4 py-4 text-center">{t('admin_lp_col_data_criacao')}</th>
                <th className="px-4 py-4 text-center">{t('admin_rel_col_data_limite')}</th>
                <th className="px-4 py-4 text-center">{t('admin_dash_col_state')}</th>
                <th className="px-4 py-4 text-center">{t('admin_sla_col_acoes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {eventos.isLoading ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">{t('admin_eventos_a_carregar')}</td></tr>
              ) : lista.map((evento) => (
                <tr key={evento.id_evento} className="text-slate-700">
                  <td className="px-4 py-5 text-center font-semibold text-slate-800">{evento.titulo}</td>
                  <td className="px-4 py-5 text-center text-slate-500">{dificuldade(evento, t)}</td>
                  <td className="px-4 py-5 text-center font-semibold text-slate-800">{evento.n_requisitos || 0}</td>
                  <td className="px-4 py-5 text-center">{evento.imagem_badge ? <img src={evento.imagem_badge} alt={evento.titulo_badge || t('admin_dash_col_badge')} className="mx-auto h-7 w-7 object-contain" /> : '🏅'}</td>
                  <td className="px-4 py-5 text-center text-slate-600">{formatarData(evento.data_criacao)}</td>
                  <td className="px-4 py-5 text-center text-slate-600">{formatarData(evento.data_limite)}</td>
                  <td className="px-4 py-5 text-center">
                    <span className={`badge-pill ${evento.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {evento.ativo ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex items-center justify-center gap-4 text-softinsa-700">
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_ver')} onClick={() => abrirEdicao(evento)}><Icon nome="eye" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={t('admin_lp_editar')} onClick={() => abrirEdicao(evento)}><Icon nome="edit" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={evento.ativo ? t('admin_lp_desativar') : t('admin_lp_ativar')} onClick={() => evento.ativo ? setModal({ tipo: 'desativar', evento }) : alternarEstado.mutate(evento)}><Icon nome="power" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 text-red-600 hover:bg-red-50" title={t('admin_notif_eliminar')} onClick={() => setModal({ tipo: 'eliminar', evento })}><Icon nome="trash" className="h-5 w-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!eventos.isLoading && lista.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">{t('admin_eventos_vazio')}</td></tr>
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
        <Modal titulo={modal.tipo === 'criar' ? t('admin_eventos_criar') : t('admin_eventos_editar')} onFechar={() => setModal(null)} size="lg">
          {modal.carregando ? (
            <div className="px-7 py-12 text-center text-slate-500">{t('admin_eventos_a_carregar_evento')}</div>
          ) : (
            <FormEvento
              form={form}
              setForm={setForm}
              evento={modal.evento}
              requisitos={modal.requisitos || []}
              niveis={listaNiveis}
              badges={modal.evento?.id_badge && !listaBadges.some((badge) => String(badge.id_badge) === String(modal.evento.id_badge))
                ? [...listaBadges, {
                  id_badge: modal.evento.id_badge,
                  titulo: modal.evento.titulo_badge,
                  pontos: modal.evento.pontos_badge,
                  tem_expiracao: modal.evento.tem_expiracao_badge,
                  validade_dias: modal.evento.validade_dias_badge,
                  ativo: modal.evento.ativo_badge,
                }]
                : listaBadges}
              modo={modal.tipo}
              onSubmit={(e) => { e.preventDefault(); modal.tipo === 'criar' ? criar.mutate() : atualizar.mutate(); }}
              onCancelar={() => setModal(null)}
              loading={modal.tipo === 'criar' ? criar.isPending : atualizar.isPending}
              t={t}
            />
          )}
        </Modal>
      )}

      {modal?.tipo === 'desativar' && (
        <Modal titulo={t('admin_eventos_modal_desativar_titulo')} icon="warning" iconTone="amber" size="sm" onFechar={() => setModal(null)}>
          <div className="px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              {t('admin_eventos_desativar_confirm').replace('{titulo}', modal.evento.titulo)}
            </p>
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>{t('admin_cancel')}</button>
            <button
              type="button"
              className="btn bg-orange-500 px-7 text-white hover:bg-orange-600"
              disabled={alternarEstado.isPending}
              onClick={() => alternarEstado.mutate(modal.evento, { onSuccess: () => setModal(null) })}
            >
              {alternarEstado.isPending ? t('admin_lp_a_confirmar') : t('admin_lp_confirmar')}
            </button>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'eliminar' && (
        <Modal titulo={t('admin_eventos_modal_eliminar_titulo')} icon="warning" iconTone="rose" size="sm" onFechar={() => setModal(null)}>
          <div className="space-y-4 px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              {t('admin_eventos_eliminar_confirm').replace('{titulo}', modal.evento.titulo)}
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
