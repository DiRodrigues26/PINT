import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Lock, Shield, Sparkles, Star, Trophy, Zap, Copy } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../lib/api';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import toast from 'react-hot-toast';

function formatarData(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ICONES_CONQUISTA = [Trophy, Shield, Sparkles, Zap, Star];
const CORES_CONQUISTA = [
  { border: 'border-softinsa-400', bg: 'bg-softinsa-100', icon: 'text-softinsa-600', data: 'text-softinsa-600', barHex: '#1C7FD6' },
  { border: 'border-blue-400',     bg: 'bg-blue-100',     icon: 'text-blue-600',     data: 'text-blue-600',     barHex: '#3B82F6' },
  { border: 'border-amber-400',    bg: 'bg-amber-100',    icon: 'text-amber-600',    data: 'text-amber-600',    barHex: '#F59E0B' },
  { border: 'border-violet-400',   bg: 'bg-violet-100',   icon: 'text-violet-600',   data: 'text-violet-600',   barHex: '#8B5CF6' },
  { border: 'border-emerald-400',  bg: 'bg-emerald-100',  icon: 'text-emerald-600',  data: 'text-emerald-600',  barHex: '#10B981' },
];

function corPorIndice(i) { return CORES_CONQUISTA[i % CORES_CONQUISTA.length]; }
function iconePorIndice(i) { return ICONES_CONQUISTA[i % ICONES_CONQUISTA.length]; }

/* ─── Card conquistada ─────────────────────────────────────────────────── */
function CardDesbloqueada({ conquista, index }) {
  const { t } = useLanguage();
  const cor = corPorIndice(index);
  const Icon = iconePorIndice(index);
  return (
    <div className={`flex flex-col rounded-xl border-2 ${cor.border} bg-white p-5 shadow-sm`}>
      <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-xl ${cor.bg}`}>
        <Icon className={`h-8 w-8 ${cor.icon}`} strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 text-center text-sm font-bold text-slate-900">{conquista.nome}</h3>
      <p className="mt-1 text-center text-xs text-slate-500">{conquista.descricao}</p>
      <div className={`mt-4 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold ${cor.bg} ${cor.data}`}>
        <Star className="h-3.5 w-3.5 fill-current" />
        {t('desbloqueada_em')} {formatarData(conquista.data_atribuicao || conquista.data_conquista)}
      </div>
    </div>
  );
}

/* ─── Item em progresso ────────────────────────────────────────────────── */
function ItemProgresso({ conquista, index }) {
  const cor = corPorIndice(index);
  const Icon = iconePorIndice(index);
  const atual = Number(conquista.progresso_atual) || 0;
  const objetivo = Number(conquista.progresso_objetivo ?? conquista.valor_objetivo) || 1;
  const pct = Math.min(Math.round((atual / objetivo) * 100), 100);

  let unidade = '';
  if (conquista.tipo_criterio === 'BADGES_AREA' || conquista.tipo_criterio === 'BADGES_TOTAL') unidade = 'badges';
  else if (conquista.tipo_criterio === 'PONTOS') unidade = 'pontos';

  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${cor.bg}`}>
        <Icon className={`h-6 w-6 ${cor.icon} opacity-40`} strokeWidth={1.5} />
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow ring-1 ring-slate-100">
          <Lock className="h-3 w-3 text-slate-400" strokeWidth={2} />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-800">{conquista.nome}</h3>
          <span className={`shrink-0 text-xs font-bold ${cor.data}`}>{pct}%</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{conquista.descricao}</p>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-slate-500">Progresso</span>
            <span className="text-xs font-semibold text-slate-700">
              {atual} / {objetivo}{unidade ? ` ${unidade}` : ''}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: cor.barHex }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Conquistas() {
  const { t } = useLanguage();
  const { utilizador } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [perfilPublico, setPerfilPublico] = useState(true);

  const { data: minhasData, isLoading: loadMinhas } = useQuery({
    queryKey: ['minhas-conquistas'],
    queryFn: async () => { const { data } = await api.get('/api/conquistas/minhas'); return data; },
    staleTime: 60_000,
  });

  const { data: progressoData, isLoading: loadProgresso } = useQuery({
    queryKey: ['conquistas-progresso'],
    queryFn: async () => { const { data } = await api.get('/api/conquistas/progresso'); return data; },
    staleTime: 60_000,
  });

  const isLoading = loadMinhas || loadProgresso;
  const conquistadas = minhasData?.dados ?? [];
  // "Em progresso" = conquistas ativas ainda NÃO obtidas (evita duplicar com as desbloqueadas)
  const emProgresso = (progressoData?.dados ?? []).filter(c => !Number(c.obtida));
  const slug = utilizador?.url_slug || utilizador?.nome?.toLowerCase().replace(/\s+/g, '-') || 'perfil';
  const linkGaleria = `${window.location.origin}/perfil-publico/${slug}`;
  const urlPublica = `${window.location.host}/perfil-publico/${slug}`;

  function copiarLink() {
    navigator.clipboard.writeText(linkGaleria);
    toast.success('Link copiado!');
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <ConsultorSidebar />
      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo="Conquistas e reconhecimentos" />

        <main className="px-5 py-8 lg:px-10 pb-24 lg:pb-10">
          <h2 className="text-2xl font-bold text-slate-900">{t('titulo_conquistas')}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t('desc_conquistas')}
          </p>

          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center"><Carregando /></div>
          ) : (
            <>
              {/* Conquistas Desbloqueadas */}
              {conquistadas.length > 0 && (
                <section className="mt-8">
                  <h3 className="text-base font-bold text-slate-800">{t('desbloqueadas')}</h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {conquistadas.map((c, i) => <CardDesbloqueada key={c.id_conquista} conquista={c} index={i} />)}
                  </div>
                </section>
              )}

              {/* Conquistas em Progresso */}
              {emProgresso.length > 0 && (
                <section className="mt-8">
                  <h3 className="text-base font-bold text-slate-800">{t('em_progresso_s')}</h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {emProgresso.map((c, i) => <ItemProgresso key={c.id_conquista} conquista={c} index={i} />)}
                  </div>
                </section>
              )}

              {/* Vazio */}
              {conquistadas.length === 0 && emProgresso.length === 0 && (
                <div className="mt-16 flex flex-col items-center text-center">
                  <Trophy className="h-14 w-14 text-slate-300" strokeWidth={1} />
                  <p className="mt-4 text-base font-semibold text-slate-600">{t('sem_conquistas')}</p>
                  <p className="mt-1 text-sm text-slate-400">{t('sem_conquistas_desc')}</p>
                </div>
              )}

              {/* Galeria Pública */}
              <section className="mt-10">
                <h3 className="text-base font-bold text-slate-800">{t('galeria_publica')}</h3>
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-softinsa-100">
                        <ExternalLink className="h-6 w-6 text-softinsa-600" strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Partilhe as suas conquistas</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 max-w-lg">
                          Ative o seu perfil público para partilhar as suas conquistas e badges com colegas,
                          recrutadores e a comunidade técnica. A sua página pública mostra todas as certificações
                          obtidas e o progresso na jornada técnica.
                        </p>
                        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-600">
                          Nota: Apenas badges aprovados e conquistas desbloqueadas serão visíveis publicamente.
                          As suas candidaturas em processo permanecem privadas.
                        </div>
                      </div>
                    </div>

                    <div className="lg:w-64 space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{t('perfil_pub_toggle')}</p>
                            <p className="text-xs text-slate-500">{t('tornar_visivel')}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPerfilPublico(v => !v)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${perfilPublico ? 'bg-softinsa-600' : 'bg-slate-300'}`}
                          >
                            <span className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${perfilPublico ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('url_publica')}</p>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <span className="flex-1 truncate text-xs text-slate-600">{urlPublica}</span>
                          <button type="button" onClick={copiarLink} className="text-slate-400 hover:text-softinsa-600">
                            <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.open(linkGaleria, '_blank')}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-softinsa-700 py-2.5 text-sm font-semibold text-white hover:bg-softinsa-800 transition"
                      >
                        <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
                        {t('ver_pagina_pub_btn')}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
