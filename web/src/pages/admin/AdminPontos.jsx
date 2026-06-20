import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  FileText,
  Medal,
  Pencil,
  Search,
  Trophy,
  TrendingUp,
  X,
} from 'lucide-react';
import { descarregarCsv, imprimirTabela } from '../../lib/exportar';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { formatarData } from '../../lib/formatar';
import Paginacao from '../../components/admin/Paginacao';
import { useLanguage } from '../../context/LanguageContext';

const POR_PAGINA = 8;

function Icon({ icon: Icone, className = 'h-5 w-5' }) {
  return <Icone className={className} aria-hidden="true" strokeWidth={1.8} />;
}

async function obterTodasDaRota(rota, params = {}) {
  const primeira = (await api.get(rota, { params: { ...params, pagina: 1, por_pagina: 100 } })).data;
  const todas = [...(primeira.dados || [])];
  const totalPaginas = Math.ceil((primeira.total || 0) / (primeira.por_pagina || 100));

  for (let pagina = 2; pagina <= totalPaginas; pagina += 1) {
    const resposta = (await api.get(rota, { params: { ...params, pagina, por_pagina: 100 } })).data;
    todas.push(...(resposta.dados || []));
  }

  return { dados: todas };
}

function dificuldade(badge) {
  if (!badge.codigo_nivel) return '-';
  return `(${badge.codigo_nivel}) ${badge.nome_nivel || ''}`.trim();
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

function estadoBadgeValor(badge) {
  if (badge.estado_badge === 'Inativo' || badge.estado_badge === 'INATIVO') return 'INATIVO';
  if (badge.estado_badge === 'Expirado' || badge.estado_badge === 'EXPIRADO') return 'EXPIRADO';
  if (badge.estado_badge === 'Ativo' || badge.estado_badge === 'ATIVO') return 'ATIVO';
  if (badge.ativo === 0 || badge.ativo === false) return 'INATIVO';
  const expira = dataExpiracao(badge);
  if (expira && new Date(expira).getTime() < Date.now()) return 'EXPIRADO';
  return 'ATIVO';
}

function estadoClasses(estado) {
  if (estado === 'INATIVO') return 'bg-rose-100 text-rose-700';
  if (estado === 'EXPIRADO') return 'bg-yellow-100 text-yellow-800';
  return 'bg-emerald-100 text-emerald-700';
}

function estadoLabel(estado, t) {
  if (estado === 'INATIVO') return t('admin_dash_notice_inactive');
  if (estado === 'EXPIRADO') return t('admin_pontos_expirado');
  return t('admin_dash_notice_active');
}

function numero(valor) {
  return new Intl.NumberFormat('pt-PT').format(Number(valor) || 0);
}

function dadosPontos(items, t) {
  const headers = [t('admin_pontos_col_badge'), t('admin_rel_col_lp'), 'Service Line', t('admin_rel_col_area'), t('admin_dash_level'), t('admin_pontos_atuais'), t('admin_dash_col_state')];
  const linhas = items.map((badge) => [
    badge.titulo,
    badge.nome_learning_path || '',
    badge.nome_service_line || '',
    badge.nome_area || '',
    dificuldade(badge),
    badge.pontos || 0,
    estadoLabel(estadoBadgeValor(badge), t),
  ]);
  return { headers, linhas };
}

export default function AdminPontos({ onEditarBadge }) {
  const { t } = useLanguage();
  const [filtros, setFiltros] = useState({
    pesquisa: '',
    id_learning_path: '',
    id_service_line: '',
    id_area: '',
    id_nivel: '',
  });
  const [pagina, setPagina] = useState(1);

  const badges = useQuery({
    queryKey: ['admin', 'pontos', 'badges', filtros, pagina],
    queryFn: async () => (await api.get('/api/badges', {
      params: {
        pagina,
        por_pagina: POR_PAGINA,
        pesquisa: filtros.pesquisa || undefined,
        id_learning_path: filtros.id_learning_path || undefined,
        id_service_line: filtros.id_service_line || undefined,
        id_area: filtros.id_area || undefined,
        id_nivel: filtros.id_nivel || undefined,
      },
    })).data,
  });

  const estatisticas = useQuery({
    queryKey: ['admin', 'pontos', 'estatisticas'],
    queryFn: async () => (await api.get('/api/estatisticas/pontos')).data,
    refetchInterval: 15000,
  });

  const learningPaths = useQuery({
    queryKey: ['admin', 'pontos', 'learning-paths'],
    queryFn: async () => obterTodasDaRota('/api/learning-paths'),
  });

  const serviceLines = useQuery({
    queryKey: ['admin', 'pontos', 'service-lines'],
    queryFn: async () => obterTodasDaRota('/api/service-lines'),
  });

  const areas = useQuery({
    queryKey: ['admin', 'pontos', 'areas'],
    queryFn: async () => obterTodasDaRota('/api/areas'),
  });

  const niveis = useQuery({
    queryKey: ['admin', 'pontos', 'niveis'],
    queryFn: async () => obterTodasDaRota('/api/niveis'),
  });

  const lista = badges.data?.dados || [];
  const total = badges.data?.total || 0;
  const totalPaginas = Math.max(1, Math.ceil(total / (badges.data?.por_pagina || POR_PAGINA)));
  const lps = learningPaths.data?.dados || [];
  const sls = serviceLines.data?.dados || [];
  const listaAreas = areas.data?.dados || [];
  const listaNiveis = niveis.data?.dados || [];
  const stats = estatisticas.data || {};

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
    setFiltros({ pesquisa: '', id_learning_path: '', id_service_line: '', id_area: '', id_nivel: '' });
    setPagina(1);
  }

  async function obterTodosFiltrados() {
    return (await obterTodasDaRota('/api/badges', {
      pesquisa: filtros.pesquisa || undefined,
      id_learning_path: filtros.id_learning_path || undefined,
      id_service_line: filtros.id_service_line || undefined,
      id_area: filtros.id_area || undefined,
      id_nivel: filtros.id_nivel || undefined,
    })).dados;
  }

  async function exportarExcel() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosPontos(todos, t);
      descarregarCsv('gestao-pontos.csv', headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_pontos_erro_exportar_excel')));
    }
  }

  async function exportarPdf() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosPontos(todos, t);
      imprimirTabela(t('admin_menu_pontos'), headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_lp_erro_exportar_pdf')));
    }
  }

  return (
    <div className="mx-auto max-w-none">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="space-y-6">
          <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin_menu_pontos')}</h1>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn-secondary" onClick={exportarExcel}>
                <Icon icon={Download} className="h-4 w-4" /> {t('admin_sla_export_excel')}
              </button>
              <button type="button" className="btn-secondary" onClick={exportarPdf}>
                <Icon icon={FileText} className="h-4 w-4" /> {t('admin_sla_export_pdf')}
              </button>
            </div>
          </header>

          <section className="rounded-lg bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="relative block">
                <Icon icon={Search} className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
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
              <button type="button" className="btn-secondary w-full border-softinsa-600 text-softinsa-700 sm:w-fit xl:col-start-1" onClick={limparFiltros}>
                <Icon icon={X} className="h-4 w-4" /> {t('admin_notif_limpar_filtros')}
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-4 text-left">{t('admin_pontos_col_badge')}</th>
                    <th className="px-4 py-4 text-left">{t('admin_rel_col_lp')}</th>
                    <th className="px-4 py-4 text-left">Service Line</th>
                    <th className="px-4 py-4 text-left">{t('admin_rel_col_area')}</th>
                    <th className="px-4 py-4 text-left">{t('admin_dash_level')}</th>
                    <th className="px-4 py-4 text-center">{t('admin_pontos_atuais')}</th>
                    <th className="px-4 py-4 text-center">{t('admin_dash_col_state')}</th>
                    <th className="px-4 py-4 text-center">{t('admin_sla_col_acoes')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {badges.isLoading ? (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">{t('admin_pontos_a_carregar')}</td></tr>
                  ) : lista.map((badge) => {
                    const estado = estadoBadgeValor(badge);
                    return (
                      <tr key={badge.id_badge} className="text-slate-700">
                        <td className="px-4 py-5 font-semibold text-slate-800">{badge.titulo}</td>
                        <td className="px-4 py-5 text-slate-500">{badge.nome_learning_path}</td>
                        <td className="px-4 py-5 text-slate-500">{badge.nome_service_line}</td>
                        <td className="px-4 py-5 text-slate-500">{badge.nome_area}</td>
                        <td className="px-4 py-5 text-slate-500">{dificuldade(badge)}</td>
                        <td className="px-4 py-5 text-center">
                          <span className="inline-flex min-w-[76px] justify-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
                            {numero(badge.pontos)}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className={`badge-pill ${estadoClasses(estado)}`}>{estadoLabel(estado, t)}</span>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-md px-3 py-2 font-semibold text-softinsa-700 hover:bg-blue-50"
                            onClick={() => onEditarBadge?.(badge.id_badge)}
                          >
                            <Icon icon={Pencil} className="h-4 w-4" />
                            {t('admin_pontos_editar_badge')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!badges.isLoading && lista.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">{t('admin_pontos_vazio')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Paginacao
              pagina={pagina}
              totalPaginas={totalPaginas}
              total={total}
              porPagina={badges.data?.por_pagina || POR_PAGINA}
              itensNaPagina={lista.length}
              onMudarPagina={setPagina}
            />
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-base font-bold text-slate-800">
              <Icon icon={Trophy} className="h-5 w-5 text-softinsa-600" />
              {t('admin_pontos_top_consultores')}
            </div>
            <div className="space-y-4">
              {(stats.ranking || []).map((item, idx) => (
                <div key={item.id_utilizador} className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-500' : 'bg-slate-200 text-slate-600'}`}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-800">{item.nome}</div>
                    <div className="text-xs text-slate-400">{t('admin_pontos_badges_count').replace('{total}', numero(item.total_badges))}</div>
                  </div>
                  <div className="font-bold text-softinsa-700">{numero(item.pontos_totais)}</div>
                </div>
              ))}
              {(stats.ranking || []).length === 0 && <div className="text-sm text-slate-500">{t('admin_pontos_sem_pontos')}</div>}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
              <Icon icon={TrendingUp} className="h-5 w-5 text-softinsa-600" />
              {t('admin_pontos_total')}
            </div>
            <div className="text-4xl font-bold text-softinsa-700">{numero(stats.total_pontos)}</div>
            <div className="mt-2 text-sm text-slate-400">{t('admin_pontos_distribuidos')}</div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
              <Icon icon={Medal} className="h-5 w-5 text-softinsa-600" />
              {t('admin_pontos_badge_valioso')}
            </div>
            <div className="text-xl font-bold text-slate-800">{stats.badge_mais_valioso?.titulo || '-'}</div>
            <div className="mt-2 text-3xl font-bold text-softinsa-700">
              {t('admin_pontos_pontos_count').replace('{total}', numero(stats.badge_mais_valioso?.pontos))}
            </div>
            {stats.badge_mais_valioso?.nome_area && (
              <div className="mt-3 text-sm text-slate-500">
                {stats.badge_mais_valioso.nome_area} - {stats.badge_mais_valioso.nome_service_line}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
