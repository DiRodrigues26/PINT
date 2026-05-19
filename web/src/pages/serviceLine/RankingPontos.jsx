import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, Medal, Trophy } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  CartesianGrid,
} from 'recharts';
import { api } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';

/* ─── Cores ─────────────────────────────────────────────────────────── */
const NIVEL_COR = {
  A: 'bg-blue-400', B: 'bg-blue-600', C: 'bg-softinsa-600',
  D: 'bg-indigo-700', E: 'bg-purple-700',
};

const AREA_COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899'];

/* ─── Ícone da posição ──────────────────────────────────────────────── */
function IconePosicao({ pos }) {
  if (pos === 1) return <Trophy className="h-5 w-5 text-amber-500" strokeWidth={1.8} />;
  if (pos === 2) return <Medal className="h-5 w-5 text-slate-400" strokeWidth={1.8} />;
  if (pos === 3) return <Medal className="h-5 w-5 text-amber-700" strokeWidth={1.8} />;
  return <span className="text-sm font-semibold text-slate-500">{pos}</span>;
}

/* ─── Estilo da linha por posição ───────────────────────────────────── */
function rowCls(pos) {
  if (pos === 1) return 'border-l-4 border-l-amber-400 bg-amber-50/40';
  if (pos === 2) return 'border-l-4 border-l-slate-300 bg-slate-50/40';
  if (pos === 3) return 'border-l-4 border-l-amber-700/40 bg-orange-50/30';
  return '';
}

/* ─── Tooltip personalizado ─────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow text-xs space-y-0.5">
      <p className="font-semibold text-slate-700">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────── */
export default function ServiceLineRanking() {
  const [ordenar, setOrdenar]       = useState('pontos'); // 'pontos' | 'badges'
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['sl-dashboard'],
    queryFn: async () => { const { data } = await api.get('/api/estatisticas/service-line'); return data; },
    staleTime: 60_000,
  });

  const consultores = data?.consultores || [];
  const areas       = data?.areas || [];
  const slNome      = data?.nome_service_line || '';

  /* ── Ranking ordenado ──────────────────────────────────────────────── */
  const ranking = useMemo(() => {
    return [...consultores].sort((a, b) =>
      ordenar === 'pontos'
        ? Number(b.pontos_totais) - Number(a.pontos_totais)
        : Number(b.total_badges) - Number(a.total_badges)
    );
  }, [consultores, ordenar]);

  const visiveis = mostrarTodos ? ranking : ranking.slice(0, 5);

  /* ── Comparação por Área ───────────────────────────────────────────── */
  const dadosArea = useMemo(() => {
    const m = {};
    consultores.forEach(c => {
      if (!m[c.nome_area]) m[c.nome_area] = { area: c.nome_area, pontos: 0, badges: 0, count: 0, niveis: {} };
      m[c.nome_area].pontos += Number(c.pontos_totais);
      m[c.nome_area].badges += Number(c.total_badges);
      m[c.nome_area].count  += 1;
      if (c.nivel_mais_alto) {
        m[c.nome_area].niveis[c.nivel_mais_alto] = (m[c.nome_area].niveis[c.nivel_mais_alto] || 0) + 1;
      }
    });
    return Object.values(m).map(d => ({
      ...d,
      media_pontos: d.count > 0 ? Math.round(d.pontos / d.count) : 0,
    }));
  }, [consultores]);

  /* ── % Consultores por Nível (por área) ────────────────────────────── */
  const dadosNivel = useMemo(() => {
    const niveisSet = new Set(['A', 'B', 'C', 'D', 'E']);
    return dadosArea.map(d => {
      const row = { area: d.area };
      niveisSet.forEach(n => {
        row[n] = d.count > 0 ? Math.round(((d.niveis[n] || 0) / d.count) * 100) : 0;
      });
      return row;
    });
  }, [dadosArea]);

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo="Ranking & Pontos – Service Line Leader" />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8 space-y-6">

          {/* Título */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ranking & Pontos</h1>
            <p className="mt-1 text-sm text-slate-500">Comparação Estratégica – {slNome}</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><Carregando /></div>
          ) : (
            <>
              {/* ── Ranking Geral ───────────────────────────────────── */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <h2 className="text-sm font-bold text-slate-800">Ranking Geral</h2>
                  <button
                    type="button"
                    onClick={() => setOrdenar(o => o === 'pontos' ? 'badges' : 'pontos')}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={2} />
                    Ordenar por {ordenar === 'pontos' ? 'Badges' : 'Pontos'}
                  </button>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 text-left w-20">Posição</th>
                      <th className="px-3 py-3 text-left">Nome do Consultor</th>
                      <th className="px-3 py-3 text-left">Área</th>
                      <th className="px-3 py-3 text-right">Total de Pontos</th>
                      <th className="px-3 py-3 text-right">Nº de Badges</th>
                      <th className="px-3 py-3 text-center">Nível Mais Alto</th>
                      <th className="px-3 py-3 text-left">Conquistas Especiais</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((c, i) => {
                      const pos = i + 1;
                      const nivelCls = NIVEL_COR[c.nivel_mais_alto] || 'bg-slate-400';
                      return (
                        <tr key={c.id_utilizador} className={`border-b border-slate-100 hover:bg-slate-50/60 transition ${rowCls(pos)}`}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-center w-8">
                              <IconePosicao pos={pos} />
                            </div>
                          </td>
                          <td className="px-3 py-3.5 font-semibold text-slate-900">{c.nome}</td>
                          <td className="px-3 py-3.5">
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                              {c.nome_area}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-right font-bold text-softinsa-600">
                            {Number(c.pontos_totais).toLocaleString('pt-PT')}
                          </td>
                          <td className="px-3 py-3.5 text-right text-slate-700 font-medium">
                            {c.total_badges}
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            {c.nivel_mais_alto ? (
                              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${nivelCls}`}>
                                {c.nivel_mais_alto}
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-3.5 text-sm text-slate-500">
                            {c.conquista_especial || <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                    {ranking.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">
                          Sem consultores nesta Service Line.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Ver Mais */}
                {ranking.length > 5 && (
                  <div className="flex justify-center border-t border-slate-100 py-4">
                    <button
                      type="button"
                      onClick={() => setMostrarTodos(v => !v)}
                      className="rounded-lg bg-softinsa-600 px-6 py-2 text-sm font-semibold text-white hover:bg-softinsa-700 transition"
                    >
                      {mostrarTodos ? 'Ver Menos' : 'Ver Mais'}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Comparação por Área ─────────────────────────────── */}
              {dadosArea.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-slate-900">Comparação por Área</h2>

                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    {/* Média de Pontos por Área */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-4 text-xs font-semibold text-slate-600">Média de Pontos por Área</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={dadosArea} margin={{ left: -10, right: 10, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="area" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-30} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="media_pontos" name="Média Pontos" radius={[4, 4, 0, 0]} barSize={28}>
                            {dadosArea.map((_, i) => <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Total de Badges por Área */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-4 text-xs font-semibold text-slate-600">Total de Badges por Área</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={dadosArea} margin={{ left: -10, right: 10, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="area" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-30} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="badges" name="Badges" radius={[4, 4, 0, 0]} barSize={28}>
                            {dadosArea.map((_, i) => <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* % Consultores por Nível */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-4 text-xs font-semibold text-slate-600">% Consultores por Nível</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={dadosNivel} margin={{ left: -10, right: 10, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="area" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-30} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" domain={[0, 100]} />
                          <Tooltip content={<CustomTooltip />} />
                          {['A', 'B', 'C', 'D', 'E'].map((n, i) => (
                            <Bar key={n} dataKey={n} name={`Nível ${n}`} stackId="a"
                              fill={AREA_COLORS[i % AREA_COLORS.length]}
                              radius={i === 4 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                      {/* Legenda */}
                      <div className="mt-2 flex flex-wrap justify-center gap-2">
                        {['A', 'B', 'C', 'D', 'E'].map((n, i) => (
                          <span key={n} className="flex items-center gap-1 text-[10px] text-slate-500">
                            <span className="h-2 w-2 rounded-sm inline-block" style={{ background: AREA_COLORS[i] }} />
                            Nível {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  );
}
