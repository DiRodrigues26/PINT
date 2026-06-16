import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Award, Layers, Search, Star, Timer, X, Download, FileText } from 'lucide-react';
import { api } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';
import { exportCSV, exportPDF } from '../../lib/exportUtils';
import { useLanguage } from '../../context/LanguageContext';

/* ─── Cor do círculo por nível ──────────────────────────────────────── */
const NIVEL_COR = {
  A: 'bg-blue-400',
  B: 'bg-blue-600',
  C: 'bg-softinsa-600',
  D: 'bg-rose-400',
  E: 'bg-purple-600',
};

const NIVEL_PILL = {
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-indigo-100 text-indigo-700',
  C: 'bg-softinsa-100 text-softinsa-700',
  D: 'bg-rose-100 text-rose-600',
  E: 'bg-purple-100 text-purple-700',
};

/* ─── Helpers ───────────────────────────────────────────────────────── */
function mesesDeValidade(validade_dias) {
  if (!validade_dias) return null;
  const meses = Math.round(Number(validade_dias) / 30);
  return meses;
}

/* ─── Card ──────────────────────────────────────────────────────────── */
function BadgeCard({ badge, onDetalhe }) {
  const { t } = useLanguage();
  const meses = mesesDeValidade(badge.validade_dias);
  const pilCls = NIVEL_PILL[badge.codigo_nivel] || 'bg-slate-100 text-slate-600';
  const cirCls = NIVEL_COR[badge.codigo_nivel] || 'bg-softinsa-600';

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Topo colorido */}
      <div className="flex flex-col items-center px-6 pt-7 pb-4">
        {badge.imagem_url ? (
          <img
            src={badge.imagem_url}
            alt={badge.titulo}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className={`flex h-20 w-20 items-center justify-center rounded-full ${cirCls}`}>
            <Award className="h-9 w-9 text-white" strokeWidth={1.5} />
          </div>
        )}

        <h3 className="mt-4 text-center text-sm font-bold text-slate-900 leading-snug">
          {badge.titulo}
        </h3>
      </div>

      {/* Info */}
      <div className="flex-1 space-y-1.5 px-6 pb-4">
        {/* Service Line */}
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-1 rounded-full shrink-0" style={{ background: '#0ea5e9' }} />
          <span className="text-xs text-slate-600 truncate">{badge.nome_service_line}</span>
        </div>
        {/* Área */}
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.8} />
          <span className="text-xs text-slate-500 truncate">{badge.nome_area}</span>
        </div>
      </div>

      {/* Rodapé */}
      <div className="border-t border-slate-100 px-6 pb-5 pt-4 space-y-2">
        <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-semibold ${pilCls}`}>
          {t('sl_badges_nivel_tag').replace('{cod}', badge.codigo_nivel).replace('{nome}', badge.nome_nivel)}
        </span>

        <div className="flex items-center justify-between text-xs text-slate-500">
          {badge.pontos > 0 ? (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.8} />
              {badge.pontos} {t('sl_badges_pontos_tag')}
            </span>
          ) : <span />}
          {meses && (
            <span className="flex items-center gap-1 text-amber-500 font-medium">
              <Timer className="h-3.5 w-3.5" strokeWidth={1.8} />
              {meses === 1 ? t('sl_badges_expira').replace('{n}', meses) : t('sl_badges_expira_pl').replace('{n}', meses)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDetalhe(badge.id_badge)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          {t('sl_badges_ver_det')}
        </button>
      </div>
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────── */
export default function ServiceLineBadges() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [pesquisa, setPesquisa] = useState('');
  const [filtroLP, setFiltroLP] = useState('');
  const [filtroSL, setFiltroSL] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroPontos, setFiltroPontos] = useState('');
  const [filtroExp, setFiltroExp] = useState('');

  const { data: badgesData, isLoading } = useQuery({
    queryKey: ['sl-badges-catalogo'],
    queryFn: async () => {
      const { data } = await api.get('/api/badges', { params: { ativo: 1, por_pagina: 200 } });
      return data.dados || [];
    },
    staleTime: 60_000,
  });

  const badges = badgesData || [];

  /* ─── Listas para dropdowns (derivadas dos dados) ────────────────── */
  const learningPaths = useMemo(() => {
    const m = new Map();
    badges.forEach(b => { if (b.id_learning_path) m.set(b.id_learning_path, b.nome_learning_path); });
    return [...m.entries()].map(([id, nome]) => ({ id, nome }));
  }, [badges]);

  const serviceLines = useMemo(() => {
    const m = new Map();
    badges.forEach(b => { if (b.id_service_line) m.set(b.id_service_line, b.nome_service_line); });
    return [...m.entries()].map(([id, nome]) => ({ id, nome }));
  }, [badges]);

  const areas = useMemo(() => {
    const m = new Map();
    badges.forEach(b => {
      if (b.id_area && (!filtroSL || String(b.id_service_line) === filtroSL)) {
        m.set(b.id_area, b.nome_area);
      }
    });
    return [...m.entries()].map(([id, nome]) => ({ id, nome }));
  }, [badges, filtroSL]);

  const niveis = useMemo(() => {
    const m = new Map();
    badges.forEach(b => { if (b.codigo_nivel) m.set(b.codigo_nivel, b.nome_nivel); });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [badges]);

  /* ─── Filtragem ──────────────────────────────────────────────────── */
  const filtrados = useMemo(() => {
    return badges.filter(b => {
      if (pesquisa && !b.titulo.toLowerCase().includes(pesquisa.toLowerCase())) return false;
      if (filtroLP && String(b.id_learning_path) !== filtroLP) return false;
      if (filtroSL && String(b.id_service_line) !== filtroSL) return false;
      if (filtroArea && String(b.id_area) !== filtroArea) return false;
      if (filtroNivel && b.codigo_nivel !== filtroNivel) return false;
      if (filtroPontos === 'com' && !(b.pontos > 0)) return false;
      if (filtroPontos === 'sem' && b.pontos > 0) return false;
      if (filtroExp === 'com' && !b.tem_expiracao) return false;
      if (filtroExp === 'sem' && b.tem_expiracao) return false;
      return true;
    });
  }, [badges, pesquisa, filtroLP, filtroSL, filtroArea, filtroNivel, filtroPontos, filtroExp]);

  function limparFiltros() {
    setPesquisa(''); setFiltroLP(''); setFiltroSL('');
    setFiltroArea(''); setFiltroNivel(''); setFiltroPontos(''); setFiltroExp('');
  }

  const temFiltros = pesquisa || filtroLP || filtroSL || filtroArea || filtroNivel || filtroPontos || filtroExp;

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo={t('sl_badges_subtitulo')} />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8 space-y-4">

          {/* Filtros */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Learning Path */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_badges_lp_label')}</label>
                <select value={filtroLP} onChange={e => setFiltroLP(e.target.value)} className="input text-sm">
                  <option value="">{t('sl_badges_todos')}</option>
                  {learningPaths.map(lp => (
                    <option key={lp.id} value={String(lp.id)}>{lp.nome}</option>
                  ))}
                </select>
              </div>
              {/* Service Line */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_badges_sl_label')}</label>
                <select value={filtroSL} onChange={e => { setFiltroSL(e.target.value); setFiltroArea(''); }} className="input text-sm">
                  <option value="">{t('sl_badges_todas')}</option>
                  {serviceLines.map(sl => (
                    <option key={sl.id} value={String(sl.id)}>{sl.nome}</option>
                  ))}
                </select>
              </div>
              {/* Área */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_badges_area_label')}</label>
                <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className="input text-sm">
                  <option value="">{t('sl_badges_todas')}</option>
                  {areas.map(a => (
                    <option key={a.id} value={String(a.id)}>{a.nome}</option>
                  ))}
                </select>
              </div>
              {/* Nível */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_badges_nivel_label')}</label>
                <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)} className="input text-sm">
                  <option value="">{t('sl_badges_todos')}</option>
                  {niveis.map(([cod, nome]) => (
                    <option key={cod} value={cod}>{cod} – {nome}</option>
                  ))}
                </select>
              </div>
              {/* Pontos */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_badges_pontos_label')}</label>
                <select value={filtroPontos} onChange={e => setFiltroPontos(e.target.value)} className="input text-sm">
                  <option value="">{t('sl_badges_todos')}</option>
                  <option value="com">{t('sl_badges_com_pontos')}</option>
                  <option value="sem">{t('sl_badges_sem_pontos')}</option>
                </select>
              </div>
              {/* Expiração */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_badges_exp_label')}</label>
                <select value={filtroExp} onChange={e => setFiltroExp(e.target.value)} className="input text-sm">
                  <option value="">{t('sl_badges_todos')}</option>
                  <option value="com">{t('sl_badges_com_exp')}</option>
                  <option value="sem">{t('sl_badges_sem_exp')}</option>
                </select>
              </div>
              {/* Pesquisa */}
              <div className="sm:col-span-1 lg:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_badges_pesquisar_label')}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
                  <input
                    type="text"
                    value={pesquisa}
                    onChange={e => setPesquisa(e.target.value)}
                    placeholder={t('sl_badges_pesquisar_ph')}
                    className="input pl-8 text-sm"
                  />
                </div>
              </div>
              {/* Limpar */}
              <div className="flex items-end">
                {temFiltros && (
                  <button
                    type="button"
                    onClick={limparFiltros}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition w-full justify-center"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                    {t('sl_badges_limpar')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Contador + Exportar */}
          {!isLoading && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{filtrados.length}</span>{' '}
                {filtrados.length === 1
                  ? t('sl_badges_contagem').replace('{n}', '').trim()
                  : t('sl_badges_contagem_pl').replace('{n}', '').trim()}
              </p>
              {filtrados.length > 0 && (() => {
                const hdrs = [
                  t('sl_badges_csv_badge'), t('sl_badges_csv_nivel'), t('sl_badges_csv_nome_nivel'),
                  t('sl_badges_csv_area'), t('sl_badges_csv_sl'), t('sl_badges_csv_pontos'), t('sl_badges_csv_validade'),
                ];
                const rows = filtrados.map(b => [
                  b.titulo, b.codigo_nivel, b.nome_nivel, b.nome_area, b.nome_service_line,
                  b.pontos, b.validade_dias || '',
                ]);
                const hoje = new Date().toISOString().slice(0, 10);
                return (
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => exportCSV(`badges_sl_${hoje}.csv`, hdrs, rows)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                      <Download className="h-3.5 w-3.5" strokeWidth={2} /> Excel (CSV)
                    </button>
                    <button type="button"
                      onClick={() => exportPDF(`badges_sl_${hoje}.pdf`, t('sl_badges_pdf_titulo'), hdrs, rows)}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition">
                      <FileText className="h-3.5 w-3.5" strokeWidth={2} /> PDF
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Carregando /></div>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Award className="h-12 w-12 mb-3 opacity-30" strokeWidth={1.5} />
              <p className="text-sm font-medium">{t('sl_badges_nenhum')}</p>
              {temFiltros && (
                <button onClick={limparFiltros} className="mt-2 text-xs text-softinsa-600 hover:underline">
                  {t('sl_badges_limpar_link')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtrados.map(b => (
                <BadgeCard key={b.id_badge} badge={b} onDetalhe={(id) => navigate(`/sl/badges/${id}`)} />
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
