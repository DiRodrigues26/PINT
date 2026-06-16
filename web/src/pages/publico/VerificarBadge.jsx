import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award, BadgeCheck, Calendar, CheckCircle, Copy, ExternalLink,
  ShieldCheck, Star, TriangleAlert, User,
} from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

function formatarData(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
}

const NIVEL_BG = { A: 'bg-softinsa-600', B: 'bg-blue-500', C: 'bg-indigo-500', D: 'bg-violet-600', E: 'bg-purple-700' };

/* Divide texto (JSON array ou linhas) numa lista */
function paraLista(campo) {
  if (!campo) return [];
  try {
    const parsed = JSON.parse(campo);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* texto simples */ }
  return String(campo).split('\n').map(l => l.trim()).filter(Boolean);
}

export default function VerificarBadge() {
  const { token } = useParams();
  const [copiado, setCopiado] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['verificar-badge', token],
    queryFn: async () => {
      const { data } = await api.get(`/api/publico/badges/${token}`);
      return data;
    },
    retry: false,
  });

  const privado = error?.response?.status === 403;

  function copiarLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopiado(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopiado(false), 2000);
  }

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
        <h1 className="text-xl font-bold text-slate-800">
          {privado ? 'Badge não disponível publicamente' : 'Badge não encontrado'}
        </h1>
        <p className="max-w-md text-sm text-slate-500">
          {privado
            ? 'O titular deste badge ainda não autorizou a sua publicação. Não é possível verificá-lo publicamente.'
            : 'Este link de verificação não corresponde a nenhum badge válido na plataforma Softinsa.'}
        </p>
        <a href="https://www.softinsa.pt" target="_blank" rel="noreferrer" className="mt-2 text-sm font-semibold text-softinsa-600 hover:underline">
          Visitar softinsa.pt
        </a>
      </div>
    );
  }

  const b = data.badge;
  const expirado = data.expirado;
  const competencias = paraLista(b.competencias_certificadas);

  return (
    <div className="min-h-screen bg-[#f3f6fa] pb-16">
      {/* Topbar pública */}
      <header className="bg-softinsa-gradient">
        <div className="mx-auto flex h-[64px] max-w-4xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-base font-bold text-white">S</div>
            <div>
              <div className="text-sm font-bold text-white">Softinsa</div>
              <div className="text-[11px] text-white/60">Verificação de Badge</div>
            </div>
          </div>
          <a href="https://www.softinsa.pt" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white">
            softinsa.pt <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5">
        {/* Estado de verificação */}
        <div className={`mt-6 flex items-center gap-3 rounded-xl border px-5 py-3.5 text-sm font-semibold ${
          expirado ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          {expirado ? <TriangleAlert className="h-5 w-5 shrink-0" /> : <ShieldCheck className="h-5 w-5 shrink-0" />}
          {expirado
            ? 'Este badge é autêntico mas a sua validade expirou.'
            : 'Badge verificado e autêntico, emitido pela Softinsa.'}
        </div>

        {/* Cartão principal do badge */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col items-center border-b border-slate-100 px-6 py-8 text-center">
            <div className="relative">
              {b.imagem_url ? (
                <img src={b.imagem_url} alt={b.titulo} className="h-28 w-28 rounded-full object-cover ring-4 ring-softinsa-100" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-softinsa-100 ring-4 ring-softinsa-50">
                  <Award className="h-14 w-14 text-softinsa-500" strokeWidth={1.5} />
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ring-4 ring-white ${NIVEL_BG[b.codigo_nivel] || 'bg-softinsa-600'}`}>
                {b.codigo_nivel}
              </div>
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">{b.titulo}</h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-softinsa-600 px-3 py-0.5 text-xs font-semibold text-white">{b.nome_service_line}</span>
              <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-600">{b.nome_area}</span>
              <span className="text-xs font-semibold text-slate-600">Nível {b.codigo_nivel} — {b.nome_nivel}</span>
            </div>
            {b.pontos > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-amber-500">
                <Star className="h-4 w-4 fill-current" /> {b.pontos} pontos
              </p>
            )}
          </div>

          {/* Titular */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-softinsa-100 text-softinsa-600">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Titular do badge</p>
              <p className="text-base font-bold text-slate-900">{b.nome_consultor}</p>
            </div>
            {b.url_slug && (
              <Link to={`/perfil-publico/${b.url_slug}`}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-softinsa-300 hover:text-softinsa-700">
                <BadgeCheck className="h-4 w-4" /> Ver todos os badges
              </Link>
            )}
          </div>

          {/* Datas + código de verificação */}
          <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-3">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <Calendar className="h-3.5 w-3.5" /> Emitido em
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{formatarData(b.data_atribuicao)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <Calendar className="h-3.5 w-3.5" /> Validade
              </p>
              <p className={`mt-1 text-sm font-semibold ${expirado ? 'text-amber-600' : 'text-slate-800'}`}>
                {b.data_expiracao ? formatarData(b.data_expiracao) : 'Sem expiração'}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Código
              </p>
              <p className="mt-1 text-sm font-bold text-softinsa-600">{b.codigo_publico}</p>
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

        {/* Competências certificadas (req 27) */}
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

        {/* Verificação / partilha (req 26) */}
        <section className="mt-5 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Link de verificação único</h2>
            <p className="mt-1 text-xs text-slate-500">Qualquer pessoa com este link pode confirmar a autenticidade do badge.</p>
          </div>
          <button type="button" onClick={copiarLink}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700">
            {copiado ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiado ? 'Copiado' : 'Copiar link'}
          </button>
        </section>

        {/* Integração softinsa.pt (req 28) */}
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
