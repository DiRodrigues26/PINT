import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, X, ExternalLink, Download, FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';
import { exportCSV, exportPDF } from '../../lib/exportUtils';
import { useLanguage } from '../../context/LanguageContext';

/* ─── Dados ─────────────────────────────────────────────────────────── */
function usePedidos() {
  return useQuery({
    queryKey: ['sl-pedidos'],
    queryFn: async () => {
      const { data } = await api.get('/api/candidaturas', { params: { por_pagina: 100 } });
      return data.dados || [];
    },
    staleTime: 30_000,
  });
}

function useSLA() {
  return useQuery({
    queryKey: ['sla-config'],
    queryFn: async () => {
      const { data } = await api.get('/api/sla');
      return data.dados || [];
    },
    staleTime: 300_000,
  });
}

function useAreasSL() {
  return useQuery({
    queryKey: ['sl-areas-pedidos'],
    queryFn: async () => {
      const { data } = await api.get('/api/estatisticas/service-line');
      return data.areas || [];
    },
    staleTime: 300_000,
  });
}

/* ─── Helpers ───────────────────────────────────────────────────────── */
const NIVEL_COR = {
  A: 'bg-blue-400',
  B: 'bg-blue-500',
  C: 'bg-softinsa-600',
  D: 'bg-indigo-700',
  E: 'bg-purple-800',
};

function getEstadoCfg(t) {
  return {
    OPEN:                   { label: t('sl_estado_open'),             cls: 'bg-slate-100 text-slate-600' },
    SUBMITTED:              { label: t('sl_estado_submitted'),        cls: 'bg-amber-100 text-amber-700' },
    IN_TALENT_REVIEW:       { label: t('sl_estado_talent_review'),    cls: 'bg-blue-100 text-blue-700' },
    IN_SERVICE_LINE_REVIEW: { label: t('sl_estado_sl_review'),        cls: 'bg-orange-100 text-orange-700' },
    APPROVED:               { label: t('sl_estado_closed_approved'),  cls: 'bg-emerald-100 text-emerald-700' },
    REJECTED:               { label: t('sl_estado_closed_rejected'),  cls: 'bg-rose-100 text-rose-700' },
    SENT_BACK:              { label: t('sl_estado_sent_back'),        cls: 'bg-orange-100 text-orange-600' },
    CLOSED:                 { label: t('sl_estado_closed'),           cls: 'bg-slate-100 text-slate-500' },
  };
}

function calcularSLA(candidatura, slaConfig, labelExpirado) {
  if (!candidatura.data_submissao) return null;
  if (['APPROVED', 'REJECTED', 'CLOSED'].includes(candidatura.estado_atual)) return null;

  const fase = candidatura.estado_atual === 'IN_SERVICE_LINE_REVIEW'
    ? 'SERVICE_LINE_REVIEW'
    : 'TALENT_REVIEW';

  const cfg = slaConfig?.find(s => s.fase === fase);
  if (!cfg) return null;

  const limiteHoras = cfg.unidade === 'dias' ? cfg.limite * 24 : cfg.limite;
  const inicioFase = new Date(candidatura.data_submissao);
  const agora = new Date();
  const horasDecorridas = (agora - inicioFase) / 3_600_000;
  const horasRestantes = limiteHoras - horasDecorridas;

  if (horasRestantes <= 0) return { label: labelExpirado, cls: 'text-rose-600 font-semibold' };
  const diasRestantes = Math.ceil(horasRestantes / 24);
  const cor = horasRestantes < 48 ? 'text-orange-500 font-semibold' : 'text-slate-600';
  return { label: `${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`, cls: cor };
}

function iniciais(nome) {
  return (nome || '?').split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
}

/* ─── Linha da tabela ───────────────────────────────────────────────── */
function LinhaPedido({ c, slaInfo, navigate, ESTADO_CFG, labelRever }) {
  const estadoCfg = ESTADO_CFG[c.estado_atual] || { label: c.estado_atual, cls: 'bg-slate-100 text-slate-500' };
  const ini = iniciais(c.nome_consultor);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition">
      {/* Consultor */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-softinsa-600 text-xs font-bold text-white">
            {ini}
          </div>
          <span className="text-sm font-medium text-slate-800">{c.nome_consultor}</span>
        </div>
      </td>
      {/* Área */}
      <td className="px-3 py-3 text-sm text-slate-500">{c.nome_area}</td>
      {/* Badge */}
      <td className="px-3 py-3 text-sm font-medium text-slate-700">{c.titulo_badge}</td>
      {/* Nível */}
      <td className="px-3 py-3 text-center">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${NIVEL_COR[c.codigo_nivel] || 'bg-slate-400'}`}>
          {c.codigo_nivel}
        </span>
      </td>
      {/* Data submissão */}
      <td className="px-3 py-3 text-sm text-slate-500">
        {c.data_submissao
          ? new Date(c.data_submissao).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '—'}
      </td>
      {/* SLA */}
      <td className="px-3 py-3 text-sm">
        {slaInfo
          ? <span className={slaInfo.cls}>{slaInfo.label}</span>
          : <span className="text-slate-300">—</span>}
      </td>
      {/* Estado */}
      <td className="px-3 py-3">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estadoCfg.cls}`}>
          {estadoCfg.label}
        </span>
      </td>
      {/* Validado por */}
      <td className="px-3 py-3 text-sm text-slate-500">
        {c.validado_por || <span className="text-slate-300">—</span>}
      </td>
      {/* Ação */}
      <td className="px-3 py-3">
        <button
          onClick={() => navigate(`/sl/pedidos/${c.id_candidatura}`)}
          className="flex items-center gap-1.5 rounded-lg border border-softinsa-200 bg-white px-3 py-1.5 text-xs font-semibold text-softinsa-600 hover:bg-softinsa-50 transition"
        >
          <ExternalLink className="h-3 w-3" strokeWidth={2} />
          {labelRever}
        </button>
      </td>
    </tr>
  );
}

/* ─── Página principal ──────────────────────────────────────────────── */
export default function ServiceLinePedidos() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: pedidos = [], isLoading } = usePedidos();
  const { data: slaConfig = [] } = useSLA();
  const { data: areas = [] } = useAreasSL();

  const [pesquisa, setPesquisa] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const ESTADO_CFG = getEstadoCfg(t);

  const niveis = useMemo(() => {
    const set = new Map();
    pedidos.forEach(p => { if (p.codigo_nivel) set.set(p.codigo_nivel, p.nome_nivel); });
    return [...set.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pedidos]);

  const filtrados = useMemo(() => {
    return pedidos.filter(p => {
      if (pesquisa && !p.nome_consultor?.toLowerCase().includes(pesquisa.toLowerCase())) return false;
      if (filtroArea && String(p.id_area) !== filtroArea) return false;
      if (filtroNivel && p.codigo_nivel !== filtroNivel) return false;
      if (filtroEstado && p.estado_atual !== filtroEstado) return false;
      return true;
    });
  }, [pedidos, pesquisa, filtroArea, filtroNivel, filtroEstado]);

  function limparFiltros() {
    setPesquisa('');
    setFiltroArea('');
    setFiltroNivel('');
    setFiltroEstado('');
  }

  const temFiltros = pesquisa || filtroArea || filtroNivel || filtroEstado;

  const CSV_HEADERS = [
    t('sl_ped_csv_consultor'), t('sl_ped_csv_area'), t('sl_ped_csv_badge'),
    t('sl_ped_csv_nivel'), t('sl_ped_csv_data'), t('sl_ped_csv_estado'), t('sl_ped_csv_validado'),
  ];
  const hoje = new Date().toISOString().slice(0, 10);
  function pedidosParaLinhas(lista) {
    return lista.map(p => [
      p.nome_consultor, p.nome_area, p.titulo_badge, p.codigo_nivel,
      p.data_submissao ? new Date(p.data_submissao).toLocaleDateString('pt-PT') : '',
      ESTADO_CFG[p.estado_atual]?.label || p.estado_atual,
      p.validado_por || '',
    ]);
  }

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo={t('sl_ped_subtitulo')} />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8 space-y-4">

          {/* Filtros */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              {/* Pesquisa */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_ped_pesquisa_label')}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
                  <input
                    type="text"
                    value={pesquisa}
                    onChange={e => setPesquisa(e.target.value)}
                    placeholder={t('sl_ped_pesquisa_ph')}
                    className="input pl-8 text-sm"
                  />
                </div>
              </div>
              {/* Área */}
              <div className="min-w-[160px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_ped_filtro_area')}</label>
                <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className="input text-sm">
                  <option value="">{t('sl_ped_todas_areas')}</option>
                  {areas.map(a => (
                    <option key={a.id_area} value={String(a.id_area)}>{a.nome}</option>
                  ))}
                </select>
              </div>
              {/* Nível */}
              <div className="min-w-[150px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_ped_filtro_nivel')}</label>
                <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)} className="input text-sm">
                  <option value="">{t('sl_ped_todos_niveis')}</option>
                  {niveis.map(([cod, nome]) => (
                    <option key={cod} value={cod}>{cod} – {nome}</option>
                  ))}
                </select>
              </div>
              {/* Estado */}
              <div className="min-w-[170px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_ped_filtro_estado')}</label>
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="input text-sm">
                  <option value="">{t('sl_ped_todos_estados')}</option>
                  {Object.entries(ESTADO_CFG).map(([val, cfg]) => (
                    <option key={val} value={val}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              {/* Limpar */}
              {temFiltros && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition self-end"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                  {t('sl_ped_limpar')}
                </button>
              )}
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16"><Carregando /></div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                  <span className="text-xs text-slate-500">
                    {t('sl_ped_mostrando').replace('{n}', filtrados.length).replace('{total}', pedidos.length)}
                  </span>
                  {filtrados.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button type="button"
                        onClick={() => exportCSV(`pedidos_sl_${hoje}.csv`, CSV_HEADERS, pedidosParaLinhas(filtrados))}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                        <Download className="h-3.5 w-3.5" strokeWidth={2} /> Excel (CSV)
                      </button>
                      <button type="button"
                        onClick={() => exportPDF(`pedidos_sl_${hoje}.pdf`, t('sl_ped_subtitulo'), CSV_HEADERS, pedidosParaLinhas(filtrados))}
                        className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition">
                        <FileText className="h-3.5 w-3.5" strokeWidth={2} /> PDF
                      </button>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3 text-left">{t('sl_ped_col_consultor')}</th>
                        <th className="px-3 py-3 text-left">{t('sl_ped_col_area')}</th>
                        <th className="px-3 py-3 text-left">{t('sl_ped_col_badge')}</th>
                        <th className="px-3 py-3 text-center">{t('sl_ped_col_nivel')}</th>
                        <th className="px-3 py-3 text-left">{t('sl_ped_col_data')}</th>
                        <th className="px-3 py-3 text-left">{t('sl_ped_col_sla')}</th>
                        <th className="px-3 py-3 text-left">{t('sl_ped_col_estado')}</th>
                        <th className="px-3 py-3 text-left">{t('sl_ped_col_validado')}</th>
                        <th className="px-3 py-3 text-center">{t('sl_ped_col_acao')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                            {t('sl_ped_nenhum')}
                          </td>
                        </tr>
                      ) : filtrados.map(c => (
                        <LinhaPedido
                          key={c.id_candidatura}
                          c={c}
                          slaInfo={calcularSLA(c, slaConfig, t('sl_ped_expirado'))}
                          navigate={navigate}
                          ESTADO_CFG={ESTADO_CFG}
                          labelRever={t('sl_ped_rever')}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
