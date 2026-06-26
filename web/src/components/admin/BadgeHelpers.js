/*
 * Helpers puros para a gestão de Badges (Admin).
 * Funções sem estado React — lógica de domínio, formatação e preparação de payload.
 */

import { api } from '../../lib/api';
import { formatarData } from '../../lib/formatar';

export const CODIGOS_NIVEL = ['A', 'B', 'C', 'D', 'E'];

export const TIPOS_EVIDENCIA = ['Certificado', 'Curso', 'Documento', 'Outro'];

export const FORM_INICIAL = {
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

/* Converte um campo guardado (JSON array ou texto multi-linha) em texto, uma linha por item. */
export function textoDeLista(campo) {
  if (!campo) return '';
  try {
    const parsed = JSON.parse(campo);
    if (Array.isArray(parsed)) return parsed.join('\n');
  } catch { /* não é JSON — usa o texto tal como está */ }
  return String(campo);
}

export async function obterTodasDaRota(rota, params = {}) {
  const primeira = (await api.get(rota, { params: { ...params, pagina: 1, por_pagina: 100 } })).data;
  const todas = [...(primeira.dados || [])];
  const totalPaginas = Math.ceil((primeira.total || 0) / (primeira.por_pagina || 100));

  for (let p = 2; p <= totalPaginas; p += 1) {
    const resposta = (await api.get(rota, { params: { ...params, pagina: p, por_pagina: 100 } })).data;
    todas.push(...(resposta.dados || []));
  }

  return { dados: todas };
}

export function dificuldade(badge) {
  const codigo = badge.codigo_nivel || '';
  const nome = badge.nome_nivel || '';
  return codigo ? `(${codigo}) ${nome}`.trim() : '—';
}

export function dataExpiracao(badge) {
  if (!badge.tem_expiracao) return null;
  if (badge.data_expiracao_badge) return badge.data_expiracao_badge;
  if (!badge.validade_dias || !badge.created_at) return null;
  const data = new Date(badge.created_at);
  if (Number.isNaN(data.getTime())) return null;
  data.setDate(data.getDate() + Number(badge.validade_dias));
  return data.toISOString();
}

export function estadoBadge(badge) {
  if (badge.estado_badge) return badge.estado_badge;
  if (badge.ativo === 0 || badge.ativo === false) return 'INATIVO';
  const expira = dataExpiracao(badge);
  if (expira && new Date(expira).getTime() < Date.now()) return 'EXPIRADO';
  return 'ATIVO';
}

export function estadoClasses(estado) {
  if (estado === 'INATIVO' || estado === 'Inativo') return 'bg-rose-100 text-rose-700';
  if (estado === 'EXPIRADO' || estado === 'Expirado') return 'bg-yellow-100 text-yellow-800';
  return 'bg-emerald-100 text-emerald-700';
}

export function estadoLabel(estado, t) {
  return {
    ATIVO: t('admin_dash_notice_active'),
    Ativo: t('admin_dash_notice_active'),
    INATIVO: t('admin_dash_notice_inactive'),
    Inativo: t('admin_dash_notice_inactive'),
    EXPIRADO: t('admin_pontos_expirado'),
    Expirado: t('admin_pontos_expirado'),
  }[estado] || estado;
}

export function expiracaoTexto(badge, t) {
  const expira = dataExpiracao(badge);
  return expira ? formatarData(expira) : t('admin_badges_sem_expiracao');
}

export function formatarDataInput(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function adicionarDias(dataBase, dias) {
  const data = new Date(dataBase);
  if (Number.isNaN(data.getTime())) return '';
  data.setDate(data.getDate() + Number(dias || 0));
  return formatarDataInput(data);
}

export function calcularValidadeDias(form, badgeAtual = null, t) {
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

export function descricaoCurta(texto) {
  if (!texto) return '—';
  return texto.length > 28 ? `${texto.slice(0, 28)}...` : texto;
}

export function encontrarNivelNoContexto({ codigo, nivelAtual, filtros, niveis }) {
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

export function prepararPayload(form, niveis, badgeAtual = null, t) {
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

export function separarPayloadBadge(payload) {
  const { requisitosNovos, ...dadosBadge } = payload;
  return { dadosBadge, requisitosNovos };
}

export function dadosBadges(items, t) {
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

export function tipoEvidenciaLabel(tipo, t) {
  return {
    Certificado: t('admin_badges_tipo_certificado'),
    Curso: t('admin_eventos_tipo_curso'),
    Documento: t('admin_badges_tipo_documento'),
    Outro: t('admin_badges_tipo_outro'),
  }[tipo] || tipo;
}
