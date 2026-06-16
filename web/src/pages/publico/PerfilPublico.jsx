import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, Calendar, ExternalLink, ShieldCheck, Star, TriangleAlert, User } from 'lucide-react';
import { api } from '../../lib/api';

function formatarData(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const NIVEL_BG = { A: 'bg-softinsa-600', B: 'bg-blue-500', C: 'bg-indigo-500', D: 'bg-violet-600', E: 'bg-purple-700' };

export default function PerfilPublico() {
  const { slug } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['perfil-publico', slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/publico/perfis/${slug}`);
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

  if (isError || !data?.perfil) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f3f6fa] px-6 text-center">
        <TriangleAlert className="h-14 w-14 text-amber-400" strokeWidth={1.5} />
        <h1 className="text-xl font-bold text-slate-800">Perfil não encontrado</h1>
        <p className="max-w-md text-sm text-slate-500">Este perfil público não existe ou não tem badges publicados.</p>
      </div>
    );
  }

  const { perfil, badges } = data;
  const totalPontos = badges.reduce((s, b) => s + (Number(b.pontos) || 0), 0);
  const iniciais = perfil.nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');

  return (
    <div className="min-h-screen bg-[#f3f6fa] pb-16">
      {/* Topbar pública */}
      <header className="bg-softinsa-gradient">
        <div className="mx-auto flex h-[64px] max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-base font-bold text-white">S</div>
            <div>
              <div className="text-sm font-bold text-white">Softinsa</div>
              <div className="text-[11px] text-white/60">Galeria pública de badges</div>
            </div>
          </div>
          <a href="https://www.softinsa.pt" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white">
            softinsa.pt <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        {/* Cabeçalho do perfil */}
        <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:flex-row sm:text-left">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-softinsa-gradient text-2xl font-bold text-white">
            {iniciais || <User className="h-8 w-8" />}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{perfil.nome}</h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-500 sm:justify-start">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Consultor certificado Softinsa
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-softinsa-700">{badges.length}</p>
              <p className="text-xs text-slate-500">Badges</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">{totalPontos.toLocaleString('pt-PT')}</p>
              <p className="text-xs text-slate-500">Pontos</p>
            </div>
          </div>
        </div>

        {/* Grelha de badges */}
        {badges.length === 0 ? (
          <div className="mt-10 flex flex-col items-center text-center">
            <Award className="h-14 w-14 text-slate-300" strokeWidth={1} />
            {data.consentido === false ? (
              <>
                <p className="mt-4 text-base font-semibold text-slate-600">Perfil privado</p>
                <p className="mt-1 max-w-sm text-sm text-slate-400">
                  Este consultor ainda não autorizou a publicação dos seus badges na galeria pública.
                </p>
              </>
            ) : (
              <p className="mt-4 text-base font-semibold text-slate-600">Ainda sem badges públicos</p>
            )}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map(b => (
              <Link key={b.id_badge_atribuido} to={`/verificar/${b.token_publico}`}
                className="group flex flex-col items-center rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:border-softinsa-300 hover:shadow-md">
                <div className="relative">
                  {b.imagem_url ? (
                    <img src={b.imagem_url} alt={b.titulo} className="h-20 w-20 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-softinsa-100">
                      <Award className="h-10 w-10 text-softinsa-500" strokeWidth={1.5} />
                    </div>
                  )}
                  <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white ${NIVEL_BG[b.codigo_nivel] || 'bg-softinsa-600'}`}>
                    {b.codigo_nivel}
                  </div>
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-900 leading-snug">{b.titulo}</h3>
                <p className="mt-1 text-xs text-slate-500">{b.nome_area}</p>
                <p className="mt-0.5 text-xs text-slate-400">Nível {b.codigo_nivel} — {b.nome_nivel}</p>
                {b.pontos > 0 && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-current" /> {b.pontos} pontos
                  </p>
                )}
                <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                  <Calendar className="h-3 w-3" /> {formatarData(b.data_atribuicao)}
                </p>
                <span className="mt-3 text-xs font-semibold text-softinsa-600 opacity-0 transition group-hover:opacity-100">
                  Ver verificação →
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
