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
import UploadImagemAdmin from '../../components/UploadImagemAdmin';
import Paginacao from '../../components/admin/Paginacao';
import { useLanguage } from '../../context/LanguageContext';

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

const CODIGOS_NIVEL = ['A', 'B', 'C', 'D', 'E'];

const TIPOS_EVIDENCIA = ['Certificado', 'Curso', 'Documento', 'Badge', 'Outro'];

/* Converte um campo guardado (JSON array ou texto multi-linha) em texto, uma linha por item. */
function textoDeLista(campo) {
  if (!campo) return '';
  try {
    const parsed = JSON.parse(campo);
    if (Array.isArray(parsed)) return parsed.join('\n');
  } catch { /* não é JSON — usa o texto tal como está */ }
  return String(campo);
}

const FORM_INICIAL = {
  titulo: '',
  descricao: '',
  id_learning_path: '',
  id_service_line: '',
  id_area: '',
  codigo_nivel: 'A',
  id_nivel: '',
  pontos: 0,
  imagem_url: '',
  is_conquista_especial: false,
  competencias_certificadas: '',
  beneficios: '',
  tem_expiracao: true,
  tipo_expiracao: 'dias',
  valor_expiracao: 30,
  data_expiracao: '',
  validade_dias: 30,
  requisitos: [],
  requisitosNovos: [],
  paginaRequisitos: 1,
  novoRequisito: {
    aberto: false,
    titulo: '',
    descricao: '',
    tipo_evidencia: 'Certificado',
    imagem_url: '',
  },
  pesquisaRequisito: '',
  filtroNivelRequisito: '',
  filtroTipoRequisito: '',
  ativo: true,
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

function dificuldade(badge) {
  const codigo = badge.codigo_nivel || '';
  const nome = badge.nome_nivel || '';
  return codigo ? `(${codigo}) ${nome}`.trim() : '—';
}

function dataExpiracao(badge) {
  if (!badge.tem_expiracao) return null;
  if (badge.data_expiracao_badge) return badge.data_expiracao_badge;
  if (!badge.validade_dias || !badge.created_at) return null;
  const data = new Date(badge.created_at);
  if (Number.isNaN(data.getTime())) return null;
  data.setDate(data.getDate() + Number(badge.validade_dias));
  return data.toISOString();
}

function estadoBadge(badge) {
  if (badge.estado_badge) return badge.estado_badge;
  if (badge.ativo === 0 || badge.ativo === false) return 'INATIVO';
  const expira = dataExpiracao(badge);
  if (expira && new Date(expira).getTime() < Date.now()) return 'EXPIRADO';
  return 'ATIVO';
}

function estadoClasses(estado) {
  if (estado === 'INATIVO' || estado === 'Inativo') return 'bg-rose-100 text-rose-700';
  if (estado === 'EXPIRADO' || estado === 'Expirado') return 'bg-yellow-100 text-yellow-800';
  return 'bg-emerald-100 text-emerald-700';
}

function estadoLabel(estado, t) {
  return {
    ATIVO: t('admin_dash_notice_active'),
    Ativo: t('admin_dash_notice_active'),
    INATIVO: t('admin_dash_notice_inactive'),
    Inativo: t('admin_dash_notice_inactive'),
    EXPIRADO: t('admin_pontos_expirado'),
    Expirado: t('admin_pontos_expirado'),
  }[estado] || estado;
}

function expiracaoTexto(badge, t) {
  const expira = dataExpiracao(badge);
  return expira ? formatarData(expira) : t('admin_badges_sem_expiracao');
}

function formatarDataInput(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function adicionarDias(dataBase, dias) {
  const data = new Date(dataBase);
  if (Number.isNaN(data.getTime())) return '';
  data.setDate(data.getDate() + Number(dias || 0));
  return formatarDataInput(data);
}

function calcularValidadeDias(form, badgeAtual = null, t) {
  if (!form.tem_expiracao) return null;

  if (form.tipo_expiracao === 'data') {
    if (!form.data_expiracao) throw new Error(t('admin_badges_erro_data_expiracao'));
    const base = badgeAtual?.created_at ? new Date(badgeAtual.created_at) : new Date();
    const alvo = new Date(`${form.data_expiracao}T23:59:59`);
    if (Number.isNaN(alvo.getTime())) throw new Error(t('admin_badges_erro_data_valida'));
    const dias = Math.ceil((alvo.getTime() - base.getTime()) / 86400000);
    if (dias < 1) throw new Error(t('admin_badges_erro_data_posterior'));
    return dias;
  }

  const valor = Number(form.valor_expiracao);
  if (!Number.isFinite(valor) || valor < 1) throw new Error(t('admin_badges_erro_duracao'));
  if (form.tipo_expiracao === 'meses') return valor * 30;
  if (form.tipo_expiracao === 'anos') return valor * 365;
  return valor;
}

function descricaoCurta(texto) {
  if (!texto) return '—';
  return texto.length > 28 ? `${texto.slice(0, 28)}...` : texto;
}

function encontrarNivelNoContexto({ codigo, nivelAtual, filtros, niveis }) {
  const porArea = nivelAtual?.id_area || filtros.id_area;
  if (porArea) {
    const nivel = niveis.find((item) => String(item.id_area) === String(porArea) && item.codigo_nivel === codigo);
    if (nivel) return nivel;
  }

  const porServiceLine = nivelAtual?.id_service_line || filtros.id_service_line;
  if (porServiceLine) {
    const nivel = niveis.find((item) => String(item.id_service_line) === String(porServiceLine) && item.codigo_nivel === codigo);
    if (nivel) return nivel;
  }

  const porLearningPath = nivelAtual?.id_learning_path || filtros.id_learning_path;
  if (porLearningPath) {
    const nivel = niveis.find((item) => String(item.id_learning_path) === String(porLearningPath) && item.codigo_nivel === codigo);
    if (nivel) return nivel;
  }

  return niveis.find((item) => item.codigo_nivel === codigo) || null;
}

function prepararPayload(form, niveis, badgeAtual = null, t) {
  const nivel = form.id_nivel
    ? niveis.find((item) => String(item.id_nivel) === String(form.id_nivel))
    : null;

  if (!form.id_area || !nivel || String(nivel.id_area) !== String(form.id_area)) {
    throw new Error(t('admin_badges_erro_hierarquia'));
  }

  if ((form.requisitos.length + form.requisitosNovos.length) === 0) {
    throw new Error(t('admin_badges_erro_requisito'));
  }

  return {
    id_nivel: Number(nivel.id_nivel),
    titulo: form.titulo.trim(),
    descricao: form.descricao?.trim() || null,
    pontos: Number(form.pontos) || 0,
    imagem_url: form.imagem_url || null,
    is_conquista_especial: form.is_conquista_especial ? 1 : 0,
    competencias_certificadas: form.competencias_certificadas?.trim() || null,
    beneficios: form.beneficios?.trim() || null,
    tem_expiracao: form.tem_expiracao,
    validade_dias: calcularValidadeDias(form, badgeAtual, t),
    ativo: form.ativo,
    requisitos: form.requisitos,
    requisitosNovos: form.requisitosNovos,
  };
}

function separarPayloadBadge(payload) {
  const { requisitosNovos, ...dadosBadge } = payload;
  return { dadosBadge, requisitosNovos };
}

function dadosBadges(items, t) {
  const headers = [
    t('admin_pontos_col_badge'),
    t('admin_badges_col_nivel_associado'),
    t('admin_rel_col_area'),
    t('admin_dash_col_service_line'),
    t('admin_rel_col_lp'),
    t('admin_pontos_atuais'),
    t('admin_eventos_expiracao'),
    t('admin_lp_col_data_criacao'),
    t('admin_dash_col_state'),
  ];
  const linhas = items.map((badge) => [
    badge.titulo,
    dificuldade(badge),
    badge.nome_area || '',
    badge.nome_service_line || '',
    badge.nome_learning_path || '',
    badge.pontos || 0,
    expiracaoTexto(badge, t),
    formatarData(badge.created_at),
    estadoLabel(estadoBadge(badge), t),
  ]);
  return { headers, linhas };
}

function tipoEvidenciaLabel(tipo, t) {
  return {
    Certificado: t('admin_badges_tipo_certificado'),
    Curso: t('admin_eventos_tipo_curso'),
    Documento: t('admin_badges_tipo_documento'),
    Badge: t('admin_dash_col_badge'),
    Outro: t('admin_badges_tipo_outro'),
  }[tipo] || tipo;
}

function FormBadge({
  form,
  setForm,
  learningPaths,
  serviceLines,
  areas,
  requisitos,
  niveis,
  filtros,
  badgeAtual,
  modo,
  onSubmit,
  onCancelar,
  loading,
  t,
}) {
  const serviceLinesDoForm = useMemo(() => {
    if (!form.id_learning_path) return serviceLines;
    return serviceLines.filter((sl) => String(sl.id_learning_path) === String(form.id_learning_path));
  }, [form.id_learning_path, serviceLines]);

  const areasDoForm = useMemo(() => {
    if (form.id_service_line) return areas.filter((area) => String(area.id_service_line) === String(form.id_service_line));
    if (form.id_learning_path) return areas.filter((area) => String(area.id_learning_path) === String(form.id_learning_path));
    return areas;
  }, [areas, form.id_learning_path, form.id_service_line]);

  const niveisDoForm = useMemo(() => {
    if (!form.id_area) return [];
    return niveis.filter((nivel) => String(nivel.id_area) === String(form.id_area));
  }, [form.id_area, niveis]);

  const requisitosFiltrados = useMemo(() => {
    const pesquisa = form.pesquisaRequisito.trim().toLowerCase();
    return requisitos.filter((req) => {
      const passaPesquisa = !pesquisa
        || req.titulo?.toLowerCase().includes(pesquisa)
        || req.descricao?.toLowerCase().includes(pesquisa);
      const passaNivel = !form.filtroNivelRequisito || req.codigo_nivel === form.filtroNivelRequisito;
      const passaTipo = !form.filtroTipoRequisito || req.tipo_evidencia === form.filtroTipoRequisito;
      return passaPesquisa && passaNivel && passaTipo;
    });
  }, [form.filtroNivelRequisito, form.filtroTipoRequisito, form.pesquisaRequisito, requisitos]);

  const requisitosPorPagina = 5;
  const totalPaginasRequisitos = Math.max(1, Math.ceil(requisitosFiltrados.length / requisitosPorPagina));
  const paginaRequisitosAtual = Math.min(form.paginaRequisitos || 1, totalPaginasRequisitos);
  const inicioRequisitos = (paginaRequisitosAtual - 1) * requisitosPorPagina;
  const requisitosVisiveis = requisitosFiltrados.slice(inicioRequisitos, inicioRequisitos + requisitosPorPagina);

  function atualizarFiltroRequisitos(campo, valor) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
      paginaRequisitos: 1,
    }));
  }

  function mudarPaginaRequisitos(delta) {
    setForm((atual) => {
      const total = Math.max(1, Math.ceil(requisitosFiltrados.length / requisitosPorPagina));
      const proxima = Math.min(Math.max((atual.paginaRequisitos || 1) + delta, 1), total);
      return { ...atual, paginaRequisitos: proxima };
    });
  }

  function escolherNivelDoContexto({ codigo = form.codigo_nivel, idArea, idServiceLine, idLearningPath }) {
    const candidatos = niveis.filter((nivel) => {
      if (idArea) return String(nivel.id_area) === String(idArea);
      if (idServiceLine) return String(nivel.id_service_line) === String(idServiceLine);
      if (idLearningPath) return String(nivel.id_learning_path) === String(idLearningPath);
      return true;
    });
    return candidatos.find((nivel) => nivel.codigo_nivel === codigo) || candidatos[0] || null;
  }

  function atualizarHierarquia(campo, valor) {
    setForm((atual) => {
      const proximo = { ...atual, [campo]: valor };

      if (campo === 'id_learning_path') {
        proximo.id_service_line = '';
        proximo.id_area = '';
        proximo.id_nivel = '';
      }

      if (campo === 'id_service_line') {
        proximo.id_area = '';
        proximo.id_nivel = '';
        const serviceLine = serviceLines.find((sl) => String(sl.id_service_line) === String(valor));
        proximo.id_learning_path = serviceLine?.id_learning_path ? String(serviceLine.id_learning_path) : proximo.id_learning_path;
      }

      if (campo === 'id_area') {
        const area = areas.find((item) => String(item.id_area) === String(valor));
        if (area) {
          proximo.id_learning_path = String(area.id_learning_path);
          proximo.id_service_line = String(area.id_service_line);
        }
        const nivel = escolherNivelDoContexto({
          codigo: atual.codigo_nivel,
          idArea: valor,
          idServiceLine: proximo.id_service_line,
          idLearningPath: proximo.id_learning_path,
        });
        proximo.id_nivel = nivel ? String(nivel.id_nivel) : '';
        proximo.codigo_nivel = nivel?.codigo_nivel || atual.codigo_nivel;
      }

      if (campo === 'id_nivel') {
        const nivel = niveis.find((item) => String(item.id_nivel) === String(valor));
        if (nivel && String(nivel.id_area) === String(proximo.id_area)) {
          proximo.codigo_nivel = nivel.codigo_nivel;
        } else {
          proximo.id_nivel = '';
        }
      }

      return proximo;
    });
  }

  function alternarRequisito(id) {
    setForm((atual) => {
      const existe = atual.requisitos.includes(id);
      return {
        ...atual,
        requisitos: existe
          ? atual.requisitos.filter((item) => item !== id)
          : [...atual.requisitos, id],
      };
    });
  }

  function atualizarNovoRequisito(campo, valor) {
    setForm((atual) => ({
      ...atual,
      novoRequisito: { ...atual.novoRequisito, [campo]: valor },
    }));
  }

  function limparNovoRequisito() {
    setForm((atual) => ({
      ...atual,
      novoRequisito: {
        aberto: false,
        titulo: '',
        descricao: '',
        tipo_evidencia: 'Certificado',
        imagem_url: '',
      },
    }));
  }

  function adicionarNovoRequisito() {
    const novo = form.novoRequisito;
    if (!novo.titulo.trim()) {
      toast.error(t('admin_badges_erro_titulo_requisito'));
      return;
    }

    setForm((atual) => ({
      ...atual,
      requisitosNovos: [
        ...atual.requisitosNovos,
        {
          id_temporario: `novo-${Date.now()}`,
          titulo: novo.titulo.trim(),
          descricao: novo.descricao.trim(),
          tipo_evidencia: novo.tipo_evidencia,
          imagem_url: novo.imagem_url || null,
        },
      ],
      novoRequisito: {
        aberto: false,
        titulo: '',
        descricao: '',
        tipo_evidencia: 'Certificado',
        imagem_url: '',
      },
    }));
  }

  function removerNovoRequisito(idTemporario) {
    setForm((atual) => ({
      ...atual,
      requisitosNovos: atual.requisitosNovos.filter((req) => req.id_temporario !== idTemporario),
    }));
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="max-h-[72vh] space-y-6 overflow-y-auto px-7 py-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            {t('admin_badges_titulo_badge')}<span className="text-red-600">*</span>
          </label>
          <input
            className="input"
            required
            placeholder={t('admin_dash_col_badge')}
            value={form.titulo}
            onChange={(e) => setForm((atual) => ({ ...atual, titulo: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_lp_descricao')}</label>
          <textarea
            className="input min-h-24 resize-y"
            placeholder={t('admin_badges_placeholder_descricao')}
            value={form.descricao}
            onChange={(e) => setForm((atual) => ({ ...atual, descricao: e.target.value }))}
          />
        </div>

        <div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                {t('admin_rel_col_lp')}<span className="text-red-600">*</span>
              </label>
              <select
                className="input"
                required
                value={form.id_learning_path}
                onChange={(e) => atualizarHierarquia('id_learning_path', e.target.value)}
              >
                <option value="">{t('admin_sl_select_lp')}</option>
                {learningPaths.map((lp) => <option key={lp.id_learning_path} value={lp.id_learning_path}>{lp.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                {t('admin_dash_col_service_line')}<span className="text-red-600">*</span>
              </label>
              <select
                className="input"
                required
                value={form.id_service_line}
                onChange={(e) => atualizarHierarquia('id_service_line', e.target.value)}
              >
                <option value="">{t('admin_areas_select_sl')}</option>
                {serviceLinesDoForm.map((sl) => <option key={sl.id_service_line} value={sl.id_service_line}>{sl.nome}</option>)}
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
                onChange={(e) => atualizarHierarquia('id_area', e.target.value)}
              >
                <option value="">{t('admin_niveis_select_area')}</option>
                {areasDoForm.map((area) => <option key={area.id_area} value={area.id_area}>{area.nome}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            {t('admin_dash_level')}<span className="text-red-600">*</span>
          </label>
          <select
            className="input"
            required
            disabled={!form.id_area}
            value={form.id_nivel}
            onChange={(e) => atualizarHierarquia('id_nivel', e.target.value)}
          >
            <option value="">{form.id_area ? t('admin_badges_select_nivel_area') : t('admin_badges_select_area_primeiro')}</option>
            {niveisDoForm.map((nivel) => (
              <option key={nivel.id_nivel} value={nivel.id_nivel}>
                {nivel.codigo_nivel} - {nivel.nome_nivel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_badges_pontos')}</label>
          <input
            type="number"
            min="0"
            className="input"
            value={form.pontos}
            onChange={(e) => setForm((atual) => ({ ...atual, pontos: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-slate-900">
            {t('admin_badges_imagem')}<span className="text-red-600">*</span>
          </label>
          <UploadImagemAdmin
            contexto="badges"
            valor={form.imagem_url}
            className="mx-auto h-36 w-[90%]"
            onUpload={(url) => setForm((atual) => ({ ...atual, imagem_url: url }))}
          />
        </div>

        <div>
          <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900">
            <input
              type="checkbox"
              className="h-4 w-4 rounded text-softinsa-600"
              checked={form.tem_expiracao}
              onChange={(e) => setForm((atual) => ({ ...atual, tem_expiracao: e.target.checked }))}
            />
            {t('admin_badges_data_expiracao')}
          </label>
          <div className="grid grid-cols-[140px_1fr] gap-5">
            <select
              className="input"
              disabled={!form.tem_expiracao}
              value={form.tipo_expiracao}
              onChange={(e) => setForm((atual) => ({
                ...atual,
                tipo_expiracao: e.target.value,
                valor_expiracao: atual.valor_expiracao || 30,
                data_expiracao: atual.data_expiracao || adicionarDias(new Date(), atual.valor_expiracao || 30),
              }))}
            >
              <option value="dias">{t('admin_badges_exp_dias')}</option>
              <option value="meses">{t('admin_badges_exp_meses')}</option>
              <option value="anos">{t('admin_badges_exp_anos')}</option>
              <option value="data">{t('admin_badges_exp_data')}</option>
            </select>
            {form.tipo_expiracao === 'data' ? (
              <label className="relative block">
                <Icon nome="calendar" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  type="date"
                  className="input pl-12"
                  disabled={!form.tem_expiracao}
                  value={form.data_expiracao}
                  onChange={(e) => setForm((atual) => ({ ...atual, data_expiracao: e.target.value }))}
                />
              </label>
            ) : (
              <input
                type="number"
                min="1"
                className="input"
                disabled={!form.tem_expiracao}
                value={form.valor_expiracao}
                onChange={(e) => setForm((atual) => ({
                  ...atual,
                  valor_expiracao: e.target.value,
                  validade_dias: e.target.value,
                }))}
              />
            )}
          </div>
        </div>

        {/* Conquista especial (ex.: certificações pagas) */}
        <div>
          <label className="flex items-start gap-2 text-sm font-medium text-slate-900">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded text-softinsa-600"
              checked={form.is_conquista_especial}
              onChange={(e) => setForm((atual) => ({ ...atual, is_conquista_especial: e.target.checked }))}
            />
            <span>
              {t('admin_badges_conquista_especial')}
              <span className="mt-0.5 block text-xs font-normal text-slate-500">{t('admin_badges_conquista_especial_ajuda')}</span>
            </span>
          </label>
        </div>

        {/* Competências certificadas (visíveis na página do badge) */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_badges_competencias')}</label>
          <textarea
            className="input min-h-[88px]"
            placeholder={t('admin_badges_competencias_ph')}
            value={form.competencias_certificadas}
            onChange={(e) => setForm((atual) => ({ ...atual, competencias_certificadas: e.target.value }))}
          />
        </div>

        {/* Benefícios */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_badges_beneficios')}</label>
          <textarea
            className="input min-h-[88px]"
            placeholder={t('admin_badges_beneficios_ph')}
            value={form.beneficios}
            onChange={(e) => setForm((atual) => ({ ...atual, beneficios: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-slate-900">
            {t('admin_badges_requisitos')}<span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px_220px]">
            <label className="relative block">
              <Icon nome="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-11"
                placeholder={t('admin_eventos_pesquisar_requisitos')}
                value={form.pesquisaRequisito}
                onChange={(e) => atualizarFiltroRequisitos('pesquisaRequisito', e.target.value)}
              />
            </label>
            <select className="input" value={form.filtroNivelRequisito} onChange={(e) => atualizarFiltroRequisitos('filtroNivelRequisito', e.target.value)}>
              <option value="">{t('admin_req_nivel_todos')}</option>
              {CODIGOS_NIVEL.map((codigo) => <option key={codigo} value={codigo}>{codigo}</option>)}
            </select>
            <select className="input" value={form.filtroTipoRequisito} onChange={(e) => atualizarFiltroRequisitos('filtroTipoRequisito', e.target.value)}>
              <option value="">{t('admin_req_tipo_todos')}</option>
              {TIPOS_EVIDENCIA.map((tipo) => <option key={tipo} value={tipo}>{tipoEvidenciaLabel(tipo, t)}</option>)}
            </select>
          </div>

          <div className="mt-1 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-16 px-4 py-4 text-center"></th>
                  <th className="px-4 py-4 text-center">{t('admin_rel_col_titulo')}</th>
                  <th className="px-4 py-4 text-center">{t('admin_lp_descricao')}</th>
                  <th className="px-4 py-4 text-center">{t('admin_dash_level')}</th>
                  <th className="px-4 py-4 text-center">{t('admin_req_tipo_evidencia')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {requisitosVisiveis.map((req) => (
                  <tr key={req.id_requisito}>
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded text-softinsa-600"
                        checked={form.requisitos.includes(req.id_requisito)}
                        onChange={() => alternarRequisito(req.id_requisito)}
                      />
                    </td>
                    <td className="px-4 py-4 text-center font-medium text-slate-800">{req.titulo}</td>
                    <td className="px-4 py-4 text-center text-slate-600" title={req.descricao || ''}>{descricaoCurta(req.descricao)}</td>
                    <td className="px-4 py-4 text-center text-slate-600">{dificuldade(req)}</td>
                    <td className="px-4 py-4 text-center text-slate-600">{tipoEvidenciaLabel(req.tipo_evidencia, t) || '—'}</td>
                  </tr>
                ))}
                {form.requisitosNovos.map((req) => (
                  <tr key={req.id_temporario} className="bg-blue-50/60">
                    <td className="px-4 py-4 text-center">
                      <input type="checkbox" className="h-4 w-4 rounded text-softinsa-600" checked readOnly />
                    </td>
                    <td className="px-4 py-4 text-center font-medium text-slate-800">{req.titulo}</td>
                    <td className="px-4 py-4 text-center text-slate-600" title={req.descricao || ''}>{descricaoCurta(req.descricao)}</td>
                    <td className="px-4 py-4 text-center text-slate-600">{form.codigo_nivel}</td>
                    <td className="px-4 py-4 text-center text-slate-600">
                      <button type="button" className="font-semibold text-red-600 hover:underline" onClick={() => removerNovoRequisito(req.id_temporario)}>
                        {t('admin_badges_remover')}
                      </button>
                    </td>
                  </tr>
                ))}
                {requisitosFiltrados.length === 0 && form.requisitosNovos.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{t('admin_badges_sem_requisitos')}</td></tr>
                )}
              </tbody>
            </table>
            <Paginacao
              as="div"
              pagina={paginaRequisitosAtual}
              totalPaginas={totalPaginasRequisitos}
              total={requisitosFiltrados.length}
              porPagina={requisitosPorPagina}
              itensNaPagina={requisitosVisiveis.length}
              onMudarPagina={(novaPagina) => mudarPaginaRequisitos(novaPagina - paginaRequisitosAtual)}
              className="gap-3 px-6 py-3"
            >
              <button
                type="button"
                className="btn-primary"
                onClick={() => setForm((atual) => ({ ...atual, novoRequisito: { ...atual.novoRequisito, aberto: true } }))}
              >
                <Icon nome="plus" className="h-4 w-4" /> {t('admin_eventos_criar_requisito')}
              </button>
            </Paginacao>
          </div>

          {form.novoRequisito.aberto && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 text-sm font-bold text-slate-900">{t('admin_badges_novo_requisito')}</div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_rel_col_titulo')}<span className="text-red-600">*</span></label>
                  <input
                    className="input bg-white"
                    value={form.novoRequisito.titulo}
                    onChange={(e) => atualizarNovoRequisito('titulo', e.target.value)}
                    placeholder={t('admin_req_placeholder_titulo')}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_req_tipo_evidencia')}</label>
                  <select
                    className="input bg-white"
                    value={form.novoRequisito.tipo_evidencia}
                    onChange={(e) => atualizarNovoRequisito('tipo_evidencia', e.target.value)}
                  >
                    {TIPOS_EVIDENCIA.map((tipo) => <option key={tipo} value={tipo}>{tipoEvidenciaLabel(tipo, t)}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_lp_descricao')}</label>
                  <textarea
                    className="input min-h-[84px] bg-white py-3"
                    value={form.novoRequisito.descricao}
                    onChange={(e) => atualizarNovoRequisito('descricao', e.target.value)}
                    placeholder={t('admin_badges_placeholder_evidencia')}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_req_imagem')}</label>
                  <UploadImagemAdmin
                    contexto="requisitos"
                    valor={form.novoRequisito.imagem_url}
                    onUpload={(url) => atualizarNovoRequisito('imagem_url', url)}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={limparNovoRequisito}>{t('admin_cancel')}</button>
                <button type="button" className="btn-primary" onClick={adicionarNovoRequisito}>{t('admin_badges_adicionar_badge')}</button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 text-sm font-medium text-slate-900">{t('admin_dash_col_state')}</div>
          <div className="flex gap-5 text-base text-slate-700">
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
        <button type="submit" className="btn-primary min-w-36" disabled={loading}>
          {loading ? t('admin_lp_a_guardar') : modo === 'criar' ? t('admin_eventos_criar_badge') : t('admin_pontos_editar_badge')}
        </button>
      </div>
    </form>
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
