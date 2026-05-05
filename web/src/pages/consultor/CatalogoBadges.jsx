import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Calendar, CheckCircle, ChevronDown, ChevronUp, Filter, Search, Sparkles, Star, X } from 'lucide-react';
import { api } from '../../lib/api';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';
import BadgeModal from '../../components/BadgeModal';
import { useLanguage } from '../../context/LanguageContext';

const NIVEIS = [
  { value: '', label: 'Todos os níveis' },
  { value: 'A', label: 'A — Júnior' },
  { value: 'B', label: 'B — Intermédio' },
  { value: 'C', label: 'C — Sénior' },
  { value: 'D', label: 'D — Especialista' },
  { value: 'E', label: 'E — Líder de Conhecimento' },
];

function formatarData(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const NIVEL_BG = { A: 'bg-softinsa-600', B: 'bg-blue-500', C: 'bg-indigo-500', D: 'bg-violet-600', E: 'bg-purple-700' };

function BadgeCatalogoCard({ badge, candidatura, obtido, onAbrirModal }) {
  const { t } = useLanguage();
  const expirado = obtido?.data_expiracao && new Date(obtido.data_expiracao) < new Date();
  const emProgresso = candidatura && !['APPROVED', 'REJECTED', 'CLOSED'].includes(candidatura.estado_atual);
  const total = Number(badge.total_requisitos) || 0;
  const evCount = Number(candidatura?.evidencias_count) || 0;
  const pct = total > 0 ? Math.round((evCount / total) * 100) : 0;

  return (
    <div className="relative flex flex-col items-center rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
      {badge.is_conquista_especial ? (
        <div className="absolute right-3 top-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            <Sparkles className="h-3 w-3" /> {t('conquista_especial')}
          </span>
        </div>
      ) : null}

      {/* Imagem */}
      <div className="relative">
        {badge.imagem_url ? (
          <img src={badge.imagem_url} alt={badge.titulo} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-softinsa-100">
            <Award className="h-10 w-10 text-softinsa-500" strokeWidth={1.5} />
          </div>
        )}
        <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white ${NIVEL_BG[badge.codigo_nivel] || 'bg-softinsa-600'}`}>
          {badge.codigo_nivel}
        </div>
      </div>

      {/* Título */}
      <h3 className="mt-4 text-sm font-bold text-slate-900 leading-snug">{badge.titulo}</h3>
      <p className="mt-0.5 text-xs text-slate-400">{badge.nome_learning_path}</p>

      {/* Service Line + Área */}
      <span className="mt-2 rounded-full bg-softinsa-600 px-3 py-0.5 text-[11px] font-semibold text-white">
        {badge.nome_service_line}
      </span>
      <p className="mt-1 text-xs text-slate-500">{badge.nome_area}</p>

      {/* Nível + Pontos */}
      <div className="mt-2 flex w-full items-center justify-between">
        <span className="text-xs font-semibold text-softinsa-600">
          Nível {badge.codigo_nivel} — {badge.nome_nivel}
        </span>
        {badge.pontos > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            <Award className="h-3.5 w-3.5" strokeWidth={1.8} />
            {badge.pontos}
          </span>
        )}
      </div>

      {/* Estado */}
      <div className="mt-3 w-full">
        {obtido ? (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-slate-500">
              <Calendar className="h-3.5 w-3.5" strokeWidth={1.8} />
              {`${t('emitido')}:`} {formatarData(obtido.data_atribuicao)}
            </span>
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${expirado ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <CheckCircle className="h-3 w-3" />
              {expirado ? t('expirado_tag') : t('ativo_tag')}
            </span>
          </div>
        ) : emProgresso ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-softinsa-600">{t('em_progresso')}</span>
              <span className="text-slate-500">{evCount}/{total} requisitos</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-softinsa-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-right text-[11px] text-slate-400">{pct}%</p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onAbrirModal(badge.id_badge)}
        className="mt-4 w-full rounded-lg bg-softinsa-600 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700"
      >
        {t('ver_detalhes')}
      </button>
    </div>
  );
}

export default function CatalogoBadges() {
  const { t } = useLanguage();
  const [modalBadgeId, setModalBadgeId] = useState(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [pesquisa, setPesquisa] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroSL, setFiltroSL] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroPontos, setFiltroPontos] = useState('');
  const [filtroExpiracao, setFiltroExpiracao] = useState('');

  const { data: badgesData, isLoading } = useQuery({
    queryKey: ['badges-catalogo'],
    queryFn: async () => {
      const { data } = await api.get('/api/badges?ativo=1&por_pagina=100');
      return data;
    },
    staleTime: 60_000,
  });

  const { data: obtidosData } = useQuery({
    queryKey: ['meus-badges-ids'],
    queryFn: async () => {
      const { data } = await api.get('/api/badge-atribuido/meus');
      return data;
    },
    staleTime: 60_000,
  });

  const { data: candidaturasData } = useQuery({
    queryKey: ['candidaturas-ativas'],
    queryFn: async () => {
      const { data } = await api.get('/api/candidaturas?fechadas=0&por_pagina=100');
      return data;
    },
    staleTime: 60_000,
  });

  const obtidosMap = useMemo(() => {
    const m = new Map();
    for (const b of obtidosData?.dados ?? []) m.set(b.id_badge, b);
    return m;
  }, [obtidosData]);

  const candidaturasMap = useMemo(() => {
    const m = new Map();
    for (const c of candidaturasData?.dados ?? []) {
      if (!['APPROVED', 'REJECTED', 'CLOSED'].includes(c.estado_atual)) m.set(c.id_badge, c);
    }
    return m;
  }, [candidaturasData]);

  const areas = useMemo(() => {
    const set = new Map();
    for (const b of badgesData?.dados ?? []) set.set(b.id_area, b.nome_area);
    return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
  }, [badgesData]);

  const serviceLines = useMemo(() => {
    const set = new Map();
    for (const b of badgesData?.dados ?? []) set.set(b.id_service_line, b.nome_service_line);
    return Array.from(set.entries()).map(([id, nome]) => ({ id, nome }));
  }, [badgesData]);

  const badges = useMemo(() => {
    let lista = badgesData?.dados ?? [];
    if (pesquisa) lista = lista.filter(b => b.titulo.toLowerCase().includes(pesquisa.toLowerCase()));
    if (filtroArea) lista = lista.filter(b => String(b.id_area) === filtroArea);
    if (filtroSL) lista = lista.filter(b => String(b.id_service_line) === filtroSL);
    if (filtroNivel) lista = lista.filter(b => b.codigo_nivel === filtroNivel);
    if (filtroPontos === 'com') lista = lista.filter(b => b.pontos > 0);
    if (filtroPontos === 'sem') lista = lista.filter(b => b.pontos === 0);
    if (filtroExpiracao === 'com') lista = lista.filter(b => b.tem_expiracao);
    if (filtroExpiracao === 'sem') lista = lista.filter(b => !b.tem_expiracao);
    return lista;
  }, [badgesData, pesquisa, filtroArea, filtroSL, filtroNivel, filtroPontos, filtroExpiracao]);

  function limparFiltros() {
    setPesquisa(''); setFiltroArea(''); setFiltroSL('');
    setFiltroNivel(''); setFiltroPontos(''); setFiltroExpiracao('');
  }

  const temFiltros = pesquisa || filtroArea || filtroSL || filtroNivel || filtroPontos || filtroExpiracao;

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      {modalBadgeId && (
        <BadgeModal idBadge={modalBadgeId} onFechar={() => setModalBadgeId(null)} />
      )}
      <ConsultorSidebar />
      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo="Catálogo de Badges – Learning Path: Jornada Técnica" />

        <main className="px-5 py-8 lg:px-10 pb-24 lg:pb-10">
          <h2 className="text-2xl font-bold text-slate-900">{t('titulo_catalogo')}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t('desc_catalogo')}
          </p>

          {/* Filtros expansíveis */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Cabeçalho — sempre visível */}
            <button
              type="button"
              onClick={() => setFiltrosAbertos(v => !v)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-600" strokeWidth={1.8} />
                <span className="text-sm font-bold text-slate-700">{t('filtros')}</span>
                {temFiltros && (
                  <span className="rounded-full bg-softinsa-600 px-2 py-0.5 text-[11px] font-bold text-white">
                    {[pesquisa, filtroArea, filtroSL, filtroNivel, filtroPontos, filtroExpiracao].filter(Boolean).length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {temFiltros && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); limparFiltros(); }}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-500 transition"
                  >
                    <X className="h-3.5 w-3.5" /> {t('limpar_filtros')}
                  </button>
                )}
                {filtrosAbertos
                  ? <ChevronUp className="h-4 w-4 text-slate-400" strokeWidth={2} />
                  : <ChevronDown className="h-4 w-4 text-slate-400" strokeWidth={2} />
                }
              </div>
            </button>

            {/* Corpo expansível */}
            {filtrosAbertos && (
              <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                {/* Pesquisa */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('pesquisa_nome')}</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                    <input
                      value={pesquisa}
                      onChange={e => setPesquisa(e.target.value)}
                      placeholder={t('pesquisar')}
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-softinsa-400 focus:ring-2 focus:ring-softinsa-100"
                    />
                  </div>
                </div>

                {/* Dropdowns row 1 */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('area')}</label>
                    <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-softinsa-400">
                      <option value="">{t('todas_areas')}</option>
                      {areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('service_line')}</label>
                    <select value={filtroSL} onChange={e => setFiltroSL(e.target.value)} className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-softinsa-400">
                      <option value="">{t('todas_sl')}</option>
                      {serviceLines.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('nivel')}</label>
                    <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)} className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-softinsa-400">
                      {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Dropdowns row 2 */}
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('pontos')}</label>
                    <select value={filtroPontos} onChange={e => setFiltroPontos(e.target.value)} className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-softinsa-400">
                      <option value="">{t('todos')}</option>
                      <option value="com">{t('com_pontos')}</option>
                      <option value="sem">{t('sem_pontos')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('expiracao')}</label>
                    <select value={filtroExpiracao} onChange={e => setFiltroExpiracao(e.target.value)} className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-softinsa-400">
                      <option value="">{t('todos')}</option>
                      <option value="com">{t('com_expiracao')}</option>
                      <option value="sem">{t('sem_expiracao')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Badges Grid */}
          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center"><Carregando /></div>
          ) : badges.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <Award className="h-14 w-14 text-slate-300" strokeWidth={1} />
              <p className="mt-4 text-base font-semibold text-slate-600">{t('nenhum_badge')}</p>
              <p className="mt-1 text-sm text-slate-400">{t('ajustar_filtros')}</p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {badges.map(badge => (
                <BadgeCatalogoCard
                  key={badge.id_badge}
                  badge={badge}
                  candidatura={candidaturasMap.get(badge.id_badge)}
                  obtido={obtidosMap.get(badge.id_badge)}
                  onAbrirModal={setModalBadgeId}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
