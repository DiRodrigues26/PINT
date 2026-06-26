import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award, CheckCircle, Crown, ExternalLink, Layers, Star, Timer, TriangleAlert,
} from 'lucide-react';
import { api } from '../../lib/api';

const NIVEL_BG = { A: 'bg-softinsa-600', B: 'bg-blue-500', C: 'bg-indigo-500', D: 'bg-violet-600', E: 'bg-purple-700' };

/* Divide texto (JSON array ou linhas) numa lista */
function paraLista(campo) {
  if (!campo) return [];
  try {
    const parsed = JSON.parse(campo);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* texto simples */ }
  return String(campo).split('\n').map((l) => l.trim()).filter(Boolean);
}

function mesesValidade(dias) {
  if (!dias) return null;
  return Math.round(Number(dias) / 30);
}

export default function BadgePublico() {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['badge-publico', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/publico/badge/${id}`);
      return data;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f6fa]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-softinsa-200 border-t-softinsa-600" />
      </div>
    );
  }

  if (isError || !data?.badge) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f3f6fa] px-6 text-center">
        <TriangleAlert className="h-14 w-14 text-amber-400" strokeWidth={1.5} />
        <h1 className="text-xl font-bold text-slate-800">Badge não encontrado</h1>
        <p className="max-w-md text-sm text-slate-500">
          Este badge não existe ou não está disponível na plataforma Softinsa.
        </p>
        <a href="https://www.softinsa.pt" target="_blank" rel="noreferrer" className="mt-2 text-sm font-semibold text-softinsa-600 hover:underline">
          Visitar softinsa.pt
        </a>
      </div>
    );
  }

  const b = data.badge;
  const requisitos = data.requisitos || [];
  const competencias = paraLista(b.competencias_certificadas);
  const beneficios = paraLista(b.beneficios);
  const meses = mesesValidade(b.validade_dias);
  const ehEspecial = !!b.is_conquista_especial;

  return (
    <div className="min-h-screen bg-[#f3f6fa] pb-16">
      {/* Topbar pública */}
      <header className="bg-softinsa-gradient">
        <div className="mx-auto flex h-[64px] max-w-4xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-base font-bold text-white">S</div>
            <div>
              <div className="text-sm font-bold text-white">Softinsa</div>
              <div className="text-[11px] text-white/60">Badge da Plataforma</div>
            </div>
          </div>
          <a href="https://www.softinsa.pt" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white">
            softinsa.pt <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5">
        {/* Cartão principal do badge */}
        <div className={`mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm ${ehEspecial ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}>
          <div className={`flex flex-col items-center border-b border-slate-100 px-6 py-8 text-center ${ehEspecial ? 'bg-gradient-to-b from-amber-50/60 to-white' : ''}`}>
            <div className="relative">
              {b.imagem_url ? (
                <img src={b.imagem_url} alt={b.titulo} className={`h-28 w-28 rounded-full object-cover ring-4 ${ehEspecial ? 'ring-amber-100' : 'ring-softinsa-100'}`} />
              ) : (
                <div className={`flex h-28 w-28 items-center justify-center rounded-full ring-4 ${ehEspecial ? 'bg-gradient-to-br from-amber-400 to-amber-600 ring-amber-50' : 'bg-softinsa-100 ring-softinsa-50'}`}>
                  {ehEspecial
                    ? <Crown className="h-14 w-14 text-white" strokeWidth={1.5} />
                    : <Award className="h-14 w-14 text-softinsa-500" strokeWidth={1.5} />}
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ring-4 ring-white ${NIVEL_BG[b.codigo_nivel] || 'bg-softinsa-600'}`}>
                {b.codigo_nivel}
              </div>
            </div>

            {ehEspecial && (
              <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                <Crown className="h-3.5 w-3.5" strokeWidth={2} /> Badge Premium
              </span>
            )}

            <h1 className="mt-3 text-2xl font-bold text-slate-900">{b.titulo}</h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-softinsa-600 px-3 py-0.5 text-xs font-semibold text-white">{b.nome_service_line}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-600">
                <Layers className="h-3 w-3" /> {b.nome_area}
              </span>
              <span className="text-xs font-semibold text-slate-600">Nível {b.codigo_nivel} — {b.nome_nivel}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
              {b.pontos > 0 && (
                <p className="flex items-center gap-1.5 text-sm font-bold text-amber-500">
                  <Star className="h-4 w-4 fill-current" /> {b.pontos} pontos
                </p>
              )}
              {meses > 0 && (
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                  <Timer className="h-4 w-4 text-amber-500" /> Válido {meses} {meses === 1 ? 'mês' : 'meses'}
                </p>
              )}
            </div>
          </div>

          {/* Hierarquia */}
          <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Learning Path</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{b.nome_learning_path}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Service Line</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{b.nome_service_line}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Área</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{b.nome_area}</p>
            </div>
          </div>
        </div>

        {/* Descrição */}
        {b.descricao && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Sobre este badge</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{b.descricao}</p>
          </section>
        )}

        {/* Competências certificadas */}
        {(competencias.length > 0 || b.sobre_certificacao) && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Competências certificadas</h2>
            {competencias.length > 0 && (
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {competencias.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            )}
            {b.sobre_certificacao && (
              <p className="mt-3 text-sm leading-6 text-slate-600">{b.sobre_certificacao}</p>
            )}
          </section>
        )}

        {/* Benefícios */}
        {beneficios.length > 0 && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Benefícios</h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {beneficios.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" strokeWidth={2} />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Requisitos */}
        {requisitos.length > 0 && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Requisitos para obter este badge</h2>
            <div className="mt-3 space-y-2">
              {requisitos.map((r) => (
                <div key={r.id_requisito} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="mt-0.5 flex h-6 min-w-[2rem] shrink-0 items-center justify-center rounded-full bg-softinsa-600 px-2 text-[11px] font-bold text-white">
                    {r.codigo_requisito}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{r.titulo}</p>
                    {r.descricao && <p className="mt-0.5 text-xs text-slate-500">{r.descricao}</p>}
                    {r.tipo_evidencia && (
                      <p className="mt-1 text-[11px] font-medium text-slate-400">Evidência: {r.tipo_evidencia}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Integração softinsa.pt */}
        <section className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Competências Softinsa</h2>
            <p className="mt-1 text-xs text-slate-500">Saiba mais sobre as competências técnicas da Softinsa.</p>
          </div>
          <a href="https://www.softinsa.pt" target="_blank" rel="noreferrer"
            className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-softinsa-300 hover:text-softinsa-700">
            <ExternalLink className="h-4 w-4" /> Visitar softinsa.pt
          </a>
        </section>
      </main>
    </div>
  );
}
