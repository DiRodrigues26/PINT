import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Award, Users, Clock, Info, Search, Sparkles, Star, Trophy } from 'lucide-react';
import { api } from '../../lib/api';
import { TalentManagerSidebar, TalentManagerTopbar } from '../../components/TalentManagerShell';
import Carregando from '../../components/Carregando';
import { useTM } from './i18n';

const EM_VALIDACAO = ['IN_TALENT_REVIEW', 'IN_SERVICE_LINE_REVIEW'];
const CORES = [
  { bg: 'bg-blue-50', icon: 'text-blue-500' },
  { bg: 'bg-violet-50', icon: 'text-violet-500' },
  { bg: 'bg-emerald-50', icon: 'text-emerald-500' },
  { bg: 'bg-rose-50', icon: 'text-rose-500' },
  { bg: 'bg-amber-50', icon: 'text-amber-500' },
];
const NIVEL_PILL = {
  A: 'bg-blue-100 text-blue-700', B: 'bg-violet-100 text-violet-700',
  C: 'bg-emerald-100 text-emerald-700', D: 'bg-rose-100 text-rose-700', E: 'bg-amber-100 text-amber-700',
};

function statusBadge(b) {
  if (b.data_expiracao_badge) {
    const dias = (new Date(b.data_expiracao_badge) - Date.now()) / 86_400_000;
    if (dias < 0) return { key: 'st_expirado', dot: 'bg-rose-500', text: 'text-rose-600' };
    if (dias <= 30) return { key: 'st_proximo_exp', dot: 'bg-amber-500', text: 'text-amber-600' };
  }
  return b.ativo ? { key: 'st_ativo', dot: 'bg-emerald-500', text: 'text-emerald-600' }
                 : { key: 'st_inativo', dot: 'bg-slate-400', text: 'text-slate-500' };
}
function expiracaoMeses(b) {
  if (!b.tem_expiracao || !b.validade_dias) return null;
  return Math.round(b.validade_dias / 30);
}

function BadgeCard({ badge, idx, stats, onVerCandidaturas, onVerDetalhes }) {
  const tt = useTM();
  const cor = CORES[idx % CORES.length];
  const st = statusBadge(badge);
  const exp = expiracaoMeses(badge);

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <button type="button" onClick={onVerDetalhes} className="absolute right-3 top-3 text-softinsa-400 hover:text-softinsa-600" title={tt('ver_detalhes')}>
        <Info className="h-5 w-5" />
      </button>

      {badge.imagem_url ? (
        <img src={badge.imagem_url} alt={badge.titulo} className="mx-auto mt-2 h-20 w-20 rounded-full object-cover" />
      ) : (
        <div className={`mx-auto mt-2 flex h-20 w-20 items-center justify-center rounded-full ${cor.bg}`}>
          <Award className={`h-10 w-10 ${cor.icon}`} strokeWidth={1.5} />
        </div>
      )}

      <div className="mt-4 flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
        <span className={`text-[11px] font-semibold ${st.text}`}>{tt(st.key)}</span>
      </div>
      <h3 className="mt-1 text-sm font-bold text-slate-900 leading-snug">{badge.titulo}</h3>

      <div className="mt-3 border-l-2 border-softinsa-400 pl-2">
        <p className="text-[11px] text-slate-400">{badge.nome_service_line}</p>
        <p className="text-sm font-semibold text-slate-700">{badge.nome_area}</p>
      </div>

      <span className={`mt-2 inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${NIVEL_PILL[badge.codigo_nivel] || 'bg-slate-100 text-slate-600'}`}>
        {tt('nivel')} {badge.codigo_nivel} · {badge.nome_nivel}
      </span>

      <p className="mt-3 text-sm font-bold text-slate-800">{badge.pontos} {tt('pontos')}</p>
      {exp && <p className="mt-0.5 text-xs font-medium text-amber-600">{tt('expira_em')} {exp} {exp === 1 ? tt('mes') : tt('meses')}</p>}

      <div className="mt-3 space-y-1 text-xs text-slate-500">
        <p className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {stats.total} {stats.total !== 1 ? tt('candidaturas_lbl') : tt('candidatura_lbl')}</p>
        <p className="flex items-center gap-1.5 text-amber-600"><Clock className="h-3.5 w-3.5" /> {stats.validacao} {tt('em_validacao_lbl')}</p>
      </div>

      <div className="mt-4 space-y-2">
        <button type="button" onClick={onVerCandidaturas}
          className="w-full rounded-lg bg-softinsa-600 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700">
          {tt('ver_candidaturas')}
        </button>
        <button type="button" onClick={onVerDetalhes}
          className="w-full rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          {tt('ver_detalhes')}
        </button>
      </div>
    </div>
  );
}

function ConquistasView() {
  const tt = useTM();
  const { data, isLoading } = useQuery({
    queryKey: ['tm-conquistas'],
    queryFn: async () => { const { data } = await api.get('/api/conquistas'); return data; },
    staleTime: 60_000,
  });
  const conquistas = data?.dados ?? [];

  const TIPO_KEY = {
    BADGES_TOTAL: 'crit_badges_total', BADGES_AREA: 'crit_badges_area',
    PONTOS: 'crit_pontos', NIVEL: 'crit_nivel',
  };

  if (isLoading) return <div className="flex min-h-[40vh] items-center justify-center"><Carregando /></div>;
  if (conquistas.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center text-center">
        <Trophy className="h-14 w-14 text-slate-300" strokeWidth={1} />
        <p className="mt-4 text-base font-semibold text-slate-600">{tt('sem_conquistas_def')}</p>
      </div>
    );
  }
  return (
    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {conquistas.map(c => (
        <div key={c.id_conquista} className="flex flex-col rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <Sparkles className="h-6 w-6 text-amber-500" strokeWidth={1.6} />
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">{tt('conquista_especial')}</span>
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-900">{c.nome}</h3>
          {c.descricao && <p className="mt-1 text-xs leading-5 text-slate-500">{c.descricao}</p>}
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            {c.tipo_criterio && (
              <p>{tt('criterio')}: <span className="font-semibold text-slate-700">{TIPO_KEY[c.tipo_criterio] ? tt(TIPO_KEY[c.tipo_criterio]) : c.tipo_criterio}</span>{c.valor_objetivo ? ` (${c.valor_objetivo})` : ''}{c.entidade_referencia ? ` — ${c.entidade_referencia}` : ''}</p>
            )}
          </div>
          {Number(c.pontos_bonus) > 0 && (
            <p className="mt-2 flex items-center gap-1 text-sm font-bold text-amber-600">
              <Star className="h-3.5 w-3.5 fill-current" /> +{c.pontos_bonus} {tt('pontos_bonus')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function TalentBadges() {
  const tt = useTM();
  const navigate = useNavigate();
  const [vista, setVista] = useState('badges');
  const [fLP, setFLP] = useState('');
  const [fSL, setFSL] = useState('');
  const [fArea, setFArea] = useState('');
  const [fNivel, setFNivel] = useState('');
  const [fPontos, setFPontos] = useState('');
  const [fExp, setFExp] = useState('');
  const [pesquisa, setPesquisa] = useState('');

  const { data: badgesData, isLoading } = useQuery({
    queryKey: ['tm-badges'],
    queryFn: async () => { const { data } = await api.get('/api/badges?ativo=1&por_pagina=200'); return data; },
    staleTime: 60_000,
  });
  const { data: candData } = useQuery({
    queryKey: ['tm-candidaturas'],
    queryFn: async () => { const { data } = await api.get('/api/candidaturas?por_pagina=200'); return data; },
    staleTime: 30_000,
  });

  const badges = badgesData?.dados ?? [];
  const candidaturas = candData?.dados ?? [];

  const statsPorBadge = useMemo(() => {
    const m = new Map();
    for (const c of candidaturas) {
      const s = m.get(c.id_badge) || { total: 0, validacao: 0 };
      s.total++;
      if (EM_VALIDACAO.includes(c.estado_atual)) s.validacao++;
      m.set(c.id_badge, s);
    }
    return m;
  }, [candidaturas]);

  const learningPaths = useMemo(() => [...new Set(badges.map(b => b.nome_learning_path).filter(Boolean))], [badges]);
  const serviceLines = useMemo(() => [...new Set(badges.map(b => b.nome_service_line).filter(Boolean))], [badges]);
  const areas = useMemo(() => [...new Set(badges.map(b => b.nome_area).filter(Boolean))], [badges]);

  const lista = useMemo(() => {
    let l = badges;
    if (fLP) l = l.filter(b => b.nome_learning_path === fLP);
    if (fSL) l = l.filter(b => b.nome_service_line === fSL);
    if (fArea) l = l.filter(b => b.nome_area === fArea);
    if (fNivel) l = l.filter(b => b.codigo_nivel === fNivel);
    if (fPontos === 'com') l = l.filter(b => b.pontos > 0);
    if (fPontos === 'sem') l = l.filter(b => !b.pontos);
    if (fExp === 'com') l = l.filter(b => b.tem_expiracao);
    if (fExp === 'sem') l = l.filter(b => !b.tem_expiracao);
    if (pesquisa) l = l.filter(b => b.titulo?.toLowerCase().includes(pesquisa.toLowerCase()));
    return l;
  }, [badges, fLP, fSL, fArea, fNivel, fPontos, fExp, pesquisa]);

  function limpar() { setFLP(''); setFSL(''); setFArea(''); setFNivel(''); setFPontos(''); setFExp(''); setPesquisa(''); }

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <TalentManagerSidebar />
      <div className="lg:pl-[240px]">
        <TalentManagerTopbar titulo={tt('badges_titulo')} subtitulo={tt('badges_sub')} />

        <main className="px-5 py-8 lg:px-8 pb-24 lg:pb-10">
          {/* Alternador Badges / Conquistas Especiais */}
          <div className="mb-6 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button type="button" onClick={() => setVista('badges')}
              className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition ${vista === 'badges' ? 'bg-softinsa-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              <Award className="h-4 w-4" /> {tt('aba_badges')}
            </button>
            <button type="button" onClick={() => setVista('conquistas')}
              className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition ${vista === 'conquistas' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              <Sparkles className="h-4 w-4" /> {tt('aba_conquistas')}
            </button>
          </div>

          {vista === 'conquistas' ? <ConquistasView /> : (
          <>
          {/* Filtros */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Campo label={tt('learning_path')}>
                <select value={fLP} onChange={e => setFLP(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                  <option value="">{tt('todos')}</option>{learningPaths.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </Campo>
              <Campo label={tt('col_service_line')}>
                <select value={fSL} onChange={e => setFSL(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                  <option value="">{tt('todas')}</option>{serviceLines.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </Campo>
              <Campo label={tt('col_area')}>
                <select value={fArea} onChange={e => setFArea(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                  <option value="">{tt('todas')}</option>{areas.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </Campo>
              <Campo label={tt('nivel')}>
                <select value={fNivel} onChange={e => setFNivel(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                  <option value="">{tt('todos')}</option>{['A', 'B', 'C', 'D', 'E'].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </Campo>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Campo label={tt('col_pontos')}>
                <select value={fPontos} onChange={e => setFPontos(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                  <option value="">{tt('todos')}</option><option value="com">{tt('com_pontos')}</option><option value="sem">{tt('sem_pontos')}</option>
                </select>
              </Campo>
              <Campo label={tt('expiracao')}>
                <select value={fExp} onChange={e => setFExp(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                  <option value="">{tt('todos')}</option><option value="com">{tt('com_expiracao')}</option><option value="sem">{tt('sem_expiracao')}</option>
                </select>
              </Campo>
              <Campo label={tt('pesquisar')}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder={tt('nome_badge')}
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-softinsa-400" />
                </div>
              </Campo>
              <div className="flex items-end">
                <button type="button" onClick={limpar}
                  className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  {tt('limpar_filtros_btn')}
                </button>
              </div>
            </div>
          </div>

          {/* Grelha */}
          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center"><Carregando /></div>
          ) : lista.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <Award className="h-14 w-14 text-slate-300" strokeWidth={1} />
              <p className="mt-4 text-base font-semibold text-slate-600">{tt('sem_badges_filtros')}</p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lista.map((b, i) => (
                <BadgeCard key={b.id_badge} badge={b} idx={i}
                  stats={statsPorBadge.get(b.id_badge) || { total: 0, validacao: 0 }}
                  onVerCandidaturas={() => navigate('/tm/candidaturas', { state: { badge: b.titulo } })}
                  onVerDetalhes={() => navigate(`/tm/badges/${b.id_badge}`)} />
              ))}
            </div>
          )}
          </>
          )}
        </main>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}
