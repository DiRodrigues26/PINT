import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Award, Calendar, CheckCircle, ExternalLink, Search, Sparkles, Star, X } from 'lucide-react';
import { api } from '../../lib/api';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';

function formatarData(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const NIVEL_BG = { A: 'bg-softinsa-600', B: 'bg-blue-500', C: 'bg-indigo-500', D: 'bg-violet-600', E: 'bg-purple-700' };
const NIVEL_TEXT = { A: 'text-softinsa-600', B: 'text-blue-600', C: 'text-indigo-600', D: 'text-violet-700', E: 'text-purple-700' };

/* ─── Card de badge obtido ──────────────────────────────────────────────── */
function CardObtido({ item }) {
  const navigate = useNavigate();
  const expirado = item.data_expiracao && new Date(item.data_expiracao) < new Date();

  return (
    <div className="relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Tag status */}
      <div className="absolute right-4 top-4">
        {item.is_conquista_especial ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
            <Sparkles className="h-3 w-3" /> Conquista Especial
          </span>
        ) : expirado ? (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-600">Expirado</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
            <CheckCircle className="h-3 w-3" /> Ativo
          </span>
        )}
      </div>

      {/* Imagem */}
      <div className="relative w-fit mx-auto mt-2">
        {item.imagem_url ? (
          <img src={item.imagem_url} alt={item.titulo} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-softinsa-100">
            <Award className="h-8 w-8 text-softinsa-500" strokeWidth={1.5} />
          </div>
        )}
        <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white ${NIVEL_BG[item.codigo_nivel] || 'bg-softinsa-600'}`}>
          {item.codigo_nivel}
        </div>
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-900 leading-snug">{item.titulo}</h3>

      <div className="mt-2 space-y-0.5 text-xs text-slate-500">
        <p>Service Line: {item.nome_service_line}</p>
        <p>Área: {item.nome_area}</p>
        <p>Nível: {item.codigo_nivel} {item.nome_nivel}</p>
      </div>

      {item.pontos > 0 && (
        <p className={`mt-2 text-sm font-bold ${NIVEL_TEXT[item.codigo_nivel] || 'text-softinsa-600'}`}>
          {item.pontos} pontos
        </p>
      )}

      <div className="mt-3 space-y-1 text-xs text-slate-500">
        {item.data_atribuicao && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            Obtido em: {formatarData(item.data_atribuicao)}
          </div>
        )}
        {item.data_expiracao && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            Expira em: {formatarData(item.data_expiracao)}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => navigate(`/badges/${item.id_badge}`)}
          className="w-full rounded-lg bg-softinsa-600 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700"
        >
          Ver Detalhes
        </button>
        {item.url_publica && (
          <button
            type="button"
            onClick={() => window.open(item.url_publica, '_blank')}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-700 transition hover:border-softinsa-300 hover:text-softinsa-700"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Ver Página Pública
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Card de candidatura em progresso ─────────────────────────────────── */
function CardEmProgresso({ item }) {
  const navigate = useNavigate();
  const total = Number(item.total_requisitos) || 0;
  const evCount = Number(item.evidencias_count) || 0;
  const pct = total > 0 ? Math.round((evCount / total) * 100) : 0;

  return (
    <div className="relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="absolute right-4 top-4">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
          Em Progresso
        </span>
      </div>

      <div className="relative w-fit mx-auto mt-2">
        {item.imagem_url ? (
          <img src={item.imagem_url} alt={item.titulo_badge} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-softinsa-100">
            <Award className="h-8 w-8 text-softinsa-500" strokeWidth={1.5} />
          </div>
        )}
        <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white ${NIVEL_BG[item.codigo_nivel] || 'bg-softinsa-600'}`}>
          {item.codigo_nivel}
        </div>
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-900 leading-snug">{item.titulo_badge}</h3>

      <div className="mt-2 space-y-0.5 text-xs text-slate-500">
        <p>Service Line: {item.nome_service_line}</p>
        <p>Área: {item.nome_area}</p>
        <p>Nível: {item.codigo_nivel} {item.nome_nivel}</p>
      </div>

      {item.pontos > 0 && (
        <p className={`mt-2 text-sm font-bold ${NIVEL_TEXT[item.codigo_nivel] || 'text-softinsa-600'}`}>
          {item.pontos} pontos
        </p>
      )}

      <div className="mt-3 space-y-1 text-xs text-slate-500">
        {item.data_abertura && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            Iniciado em: {formatarData(item.data_abertura)}
          </div>
        )}
      </div>

      {/* Barra progresso */}
      {total > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{evCount}/{total} requisitos</span>
            <span className="font-semibold text-softinsa-600">{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-softinsa-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => navigate(`/candidaturas/${item.id_candidatura}`)}
          className="w-full rounded-lg bg-softinsa-600 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700"
        >
          Continuar Candidatura
        </button>
        <button
          type="button"
          onClick={() => navigate(`/badges/${item.id_badge}`)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-700 transition hover:border-softinsa-300 hover:text-softinsa-700"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Ver Detalhes
        </button>
      </div>
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────────── */
export default function MeusBadges() {
  const [pesquisa, setPesquisa] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroSL, setFiltroSL] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const { data: obtidosData, isLoading: loadObtidos } = useQuery({
    queryKey: ['meus-badges'],
    queryFn: async () => { const { data } = await api.get('/api/badge-atribuido/meus'); return data; },
    staleTime: 60_000,
  });

  const { data: candidaturasData, isLoading: loadCand } = useQuery({
    queryKey: ['candidaturas-ativas'],
    queryFn: async () => { const { data } = await api.get('/api/candidaturas?fechadas=0&por_pagina=100'); return data; },
    staleTime: 60_000,
  });

  const isLoading = loadObtidos || loadCand;

  const obtidos = obtidosData?.dados ?? [];
  const candidaturasAtivas = useMemo(
    () => (candidaturasData?.dados ?? []).filter(c => !['APPROVED', 'REJECTED', 'CLOSED'].includes(c.estado_atual)),
    [candidaturasData]
  );

  const kpis = useMemo(() => {
    const agora = new Date();
    return {
      total: obtidos.length,
      pontos: obtidos.reduce((s, b) => s + (Number(b.pontos) || 0), 0),
      emProgresso: candidaturasAtivas.length,
      expirados: obtidos.filter(b => b.data_expiracao && new Date(b.data_expiracao) < agora).length,
    };
  }, [obtidos, candidaturasAtivas]);

  const badgesObtidosFiltrados = useMemo(() => {
    let lista = obtidos;
    if (pesquisa) lista = lista.filter(b => b.titulo.toLowerCase().includes(pesquisa.toLowerCase()));
    if (filtroArea) lista = lista.filter(b => String(b.id_area) === filtroArea || b.nome_area?.toLowerCase().includes(filtroArea.toLowerCase()));
    if (filtroSL) lista = lista.filter(b => b.nome_service_line?.toLowerCase().includes(filtroSL.toLowerCase()));
    if (filtroNivel) lista = lista.filter(b => b.codigo_nivel === filtroNivel);
    if (filtroEstado === 'ativo') lista = lista.filter(b => !b.data_expiracao || new Date(b.data_expiracao) >= new Date());
    if (filtroEstado === 'expirado') lista = lista.filter(b => b.data_expiracao && new Date(b.data_expiracao) < new Date());
    return lista;
  }, [obtidos, pesquisa, filtroArea, filtroSL, filtroNivel, filtroEstado]);

  const candidaturasFiltradas = useMemo(() => {
    let lista = candidaturasAtivas;
    if (pesquisa) lista = lista.filter(c => c.titulo_badge.toLowerCase().includes(pesquisa.toLowerCase()));
    if (filtroNivel) lista = lista.filter(c => c.codigo_nivel === filtroNivel);
    if (filtroEstado && filtroEstado !== 'em_progresso') lista = [];
    return lista;
  }, [candidaturasAtivas, pesquisa, filtroNivel, filtroEstado]);

  const mostrarCandidaturas = !filtroEstado || filtroEstado === 'em_progresso';
  const mostrarObtidos = !filtroEstado || filtroEstado === 'ativo' || filtroEstado === 'expirado';

  function limparFiltros() {
    setPesquisa(''); setFiltroArea(''); setFiltroSL(''); setFiltroNivel(''); setFiltroEstado('');
  }
  const temFiltros = pesquisa || filtroArea || filtroSL || filtroNivel || filtroEstado;

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <ConsultorSidebar />
      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo="Os Meus Badges" />

        <main className="px-5 py-8 lg:px-10 pb-24 lg:pb-10">
          <h2 className="text-2xl font-bold text-slate-900">Os Meus Badges</h2>
          <p className="mt-1 text-sm text-slate-500">
            Visualize os badges obtidos, o progresso das certificações e partilhe as suas conquistas profissionais.
          </p>

          {/* KPIs */}
          {!isLoading && (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Total Badges Obtidos</p>
                <p className="mt-2 text-3xl font-bold text-softinsa-700">{kpis.total}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Total Pontos</p>
                <p className="mt-2 text-3xl font-bold text-amber-500">{kpis.pontos.toLocaleString('pt-PT')}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Badges em Progresso</p>
                <p className="mt-2 text-3xl font-bold text-emerald-500">{kpis.emProgresso}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Badges Expirados</p>
                <p className="mt-2 text-3xl font-bold text-red-500">{kpis.expirados}</p>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                <input
                  value={pesquisa}
                  onChange={e => setPesquisa(e.target.value)}
                  placeholder="Pesquisar badge"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-softinsa-400"
                />
              </div>
              <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className="rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-softinsa-400">
                <option value="">Todas as áreas</option>
                {[...new Set(obtidos.map(b => b.nome_area))].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={filtroSL} onChange={e => setFiltroSL(e.target.value)} className="rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-softinsa-400">
                <option value="">Todas as service lines</option>
                {[...new Set(obtidos.map(b => b.nome_service_line))].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)} className="rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-softinsa-400">
                <option value="">Todos os níveis</option>
                {['A','B','C','D','E'].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none focus:border-softinsa-400">
                <option value="">Todos os estados</option>
                <option value="ativo">Ativo</option>
                <option value="expirado">Expirado</option>
                <option value="em_progresso">Em Progresso</option>
              </select>
              {temFiltros && (
                <button type="button" onClick={limparFiltros} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  <X className="h-4 w-4" /> Limpar Filtros
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center"><Carregando /></div>
          ) : (
            <>
              {/* Candidaturas em progresso */}
              {mostrarCandidaturas && candidaturasFiltradas.length > 0 && (
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {candidaturasFiltradas.map(c => <CardEmProgresso key={c.id_candidatura} item={c} />)}
                </div>
              )}

              {/* Badges obtidos */}
              {mostrarObtidos && badgesObtidosFiltrados.length > 0 && (
                <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 ${mostrarCandidaturas && candidaturasFiltradas.length > 0 ? 'mt-5' : 'mt-6'}`}>
                  {badgesObtidosFiltrados.map(b => <CardObtido key={b.id_badge_atribuido} item={b} />)}
                </div>
              )}

              {/* Vazio */}
              {candidaturasFiltradas.length === 0 && badgesObtidosFiltrados.length === 0 && (
                <div className="mt-16 flex flex-col items-center text-center">
                  <Award className="h-14 w-14 text-slate-300" strokeWidth={1} />
                  <p className="mt-4 text-base font-semibold text-slate-600">Ainda não tens badges</p>
                  <p className="mt-1 text-sm text-slate-400">Explora o catálogo e submete a tua primeira candidatura.</p>
                  <button type="button" onClick={() => window.location.href = '/badges'} className="mt-5 rounded-lg bg-softinsa-600 px-5 py-2 text-sm font-semibold text-white hover:bg-softinsa-700">
                    Ver Catálogo
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
