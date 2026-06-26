import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Award, Activity, Star, Target, CheckCircle, Send, Sparkles, Calendar, Trophy, ListTodo, Plus, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';
import BadgeModal from '../../components/BadgeModal';
import { useLanguage } from '../../context/LanguageContext';
import ItemLembrete from '../../components/lembretes/ItemLembrete';

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard-consultor'],
    queryFn: async () => {
      const { data } = await api.get('/api/estatisticas/consultor');
      return data;
    },
    staleTime: 60_000,
  });
}

/* ─── KPI Card ─────────────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, iconBg, label, valor }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900">{valor}</p>
      </div>
    </div>
  );
}

function ordenarLembretesPendentes(lista) {
  return [...lista]
    .filter((lembrete) => !lembrete.concluido)
    .sort((a, b) => {
      const dataA = a.data_limite ? new Date(a.data_limite).getTime() : Number.MAX_SAFE_INTEGER;
      const dataB = b.data_limite ? new Date(b.data_limite).getTime() : Number.MAX_SAFE_INTEGER;
      return dataA - dataB;
    });
}

function WidgetLembretes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['lembretes', 'pendentes'],
    queryFn: async () => {
      const { data } = await api.get('/api/lembretes?concluidos=0');
      return data;
    },
    staleTime: 60_000,
  });

  const toggleLembrete = useMutation({
    mutationFn: (lembrete) => api.put(`/api/lembretes/${lembrete.id_lembrete}`, { concluido: !lembrete.concluido }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lembretes'] }),
  });

  const lembretes = ordenarLembretesPendentes(data?.dados ?? []).slice(0, 3);

  return (
    <section className="mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-softinsa-100 text-softinsa-700">
              <ListTodo className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Próximos lembretes</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">Tarefas pessoais pendentes com maior prioridade temporal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/lembretes')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ver todos
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/lembretes')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-softinsa-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700"
          >
            <Plus className="h-4 w-4" />
            Novo
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[120px] items-center justify-center">
          <Carregando />
        </div>
      ) : lembretes.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          Não tens lembretes pendentes.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-3">
          {lembretes.map((lembrete) => (
            <ItemLembrete
              key={lembrete.id_lembrete}
              lembrete={lembrete}
              compacto
              onToggle={(item) => toggleLembrete.mutate(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Barra de Progresso por Nível ─────────────────────────────────────── */
const NIVEL_BG = { A: 'bg-softinsa-600', B: 'bg-blue-500', C: 'bg-indigo-500', D: 'bg-violet-600', E: 'bg-purple-700' };

function BarraProgresso({ nivel }) {
  const { t } = useLanguage();
  const cor = NIVEL_BG[nivel.codigo_nivel] || 'bg-softinsa-600';
  const total = nivel.total_requisitos || 0;
  const cumpridos = nivel.requisitos_cumpridos || 0;
  const pct = nivel.percentagem || 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cor} text-sm font-bold text-white`}>
            {nivel.codigo_nivel}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{nivel.nome_nivel}</p>
            {total > 0 && (
              <p className="text-xs text-slate-500">
                {cumpridos} de {total} {t('requisitos_cumpridos')}
              </p>
            )}
          </div>
        </div>
        <span className="text-lg font-bold text-softinsa-700">{pct}%</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-softinsa-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Barra de Progresso por Service Line (Learning Path) ──────────────── */
function BarraServiceLine({ sl }) {
  const total = sl.total_badges || 0;
  const obtidos = sl.badges_obtidos || 0;
  const pct = sl.percentagem || 0;
  const concluida = !!sl.concluida;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${concluida ? 'bg-emerald-500' : 'bg-softinsa-600'}`}>
            {concluida ? <CheckCircle className="h-5 w-5" strokeWidth={2} /> : <Award className="h-5 w-5" strokeWidth={1.8} />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{sl.nome_service_line}</p>
            <p className="text-xs text-slate-500">{obtidos}/{total} badges</p>
          </div>
        </div>
        <span className={`text-lg font-bold ${concluida ? 'text-emerald-600' : 'text-softinsa-700'}`}>{pct}%</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${concluida ? 'bg-emerald-500' : 'bg-softinsa-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Badge Card ────────────────────────────────────────────────────────── */
function BadgeCard({ badge, onCandidatar }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Conquista Especial — topo direito do card */}
      {badge.is_conquista_especial ? (
        <div className="absolute right-4 top-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            <Sparkles className="h-3 w-3" />
            {t('conquista_especial')}
          </span>
        </div>
      ) : null}

      {/* Imagem + nível badge */}
      <div className="relative w-fit">
        {badge.imagem_url ? (
          <img src={badge.imagem_url} alt={badge.titulo} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-softinsa-100">
            <Award className="h-8 w-8 text-softinsa-600" strokeWidth={1.5} />
          </div>
        )}
        {/* Nível no canto inferior direito da imagem */}
        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-softinsa-600 text-[11px] font-bold text-white ring-2 ring-white">
          {badge.codigo_nivel}
        </div>
      </div>

      {/* Título */}
      <h3 className="mt-3 text-sm font-bold text-slate-900 leading-snug pr-2">{badge.titulo}</h3>

      {/* Tags Service Line + Área */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
          Service Line: {badge.nome_service_line}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
          Área: {badge.nome_area}
        </span>
      </div>

      {/* Nível + Pontos */}
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-full bg-softinsa-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
          Nível {badge.codigo_nivel}
        </span>
        {badge.pontos > 0 && (
          <span className="flex items-center gap-1 text-[12px] font-semibold text-amber-600">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {badge.pontos} pontos
          </span>
        )}
      </div>

      {/* Botões */}
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onCandidatar(badge.id_badge)}
          className="w-full rounded-lg bg-softinsa-600 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700"
        >
          {t('candidatar')}
        </button>
        <button
          type="button"
          onClick={() => navigate(`/badges/${badge.id_badge}`)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 transition hover:border-softinsa-300 hover:text-softinsa-700"
        >
          {t('ver_detalhes')}
        </button>
      </div>
    </div>
  );
}

/* ─── Atividade Recente ─────────────────────────────────────────────────── */
const CONFIG_ATIVIDADE = {
  APPROVED:  { icon: CheckCircle, cor: 'bg-emerald-100 text-emerald-600', titulo: 'Badge aprovado',        desc: (b) => `${b} foi aprovado.` },
  SUBMITTED: { icon: Send,         cor: 'bg-azulciano-100 text-azulciano-600', titulo: 'Candidatura submetida', desc: (b) => `${b} foi submetida.` },
  default:   { icon: Sparkles,     cor: 'bg-amber-100 text-amber-600',    titulo: 'Novo badge recomendado', desc: (b) => `${b} está disponível.` },
};

function tempoRelativo(dataStr) {
  const diff = Date.now() - new Date(dataStr).getTime();
  const dias = Math.floor(diff / 86_400_000);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Há 1 dia';
  if (dias < 7) return `Há ${dias} dias`;
  const semanas = Math.floor(dias / 7);
  return semanas === 1 ? 'Há 1 semana' : `Há ${semanas} semanas`;
}

function ItemAtividade({ item }) {
  const cfg = CONFIG_ATIVIDADE[item.estado_destino] || CONFIG_ATIVIDADE.default;
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cfg.cor}`}>
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-800">{cfg.titulo}</p>
        <p className="mt-0.5 text-xs text-slate-500">{cfg.desc(item.badge_titulo)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
        <Calendar className="h-3.5 w-3.5" strokeWidth={1.8} />
        <span>{tempoRelativo(item.data_evento)}</span>
      </div>
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────────── */
export default function ConsultorDashboard() {
  const { data, isLoading } = useDashboard();
  const [modalBadgeId, setModalBadgeId] = useState(null);
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      {modalBadgeId && (
        <BadgeModal idBadge={modalBadgeId} onFechar={() => setModalBadgeId(null)} />
      )}
      <ConsultorSidebar />

      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo={t('subtitulo_dashboard')} />

        <main className="px-5 py-8 lg:px-10 pb-24 lg:pb-10">
          {isLoading ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <Carregando />
            </div>
          ) : (
            <>
              {/* KPIs */}
              <section>
                <h2 className="text-lg font-bold text-slate-900">{t('resumo_progresso')}</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <KpiCard icon={Award}    iconBg="bg-softinsa-700" label={t('total_obtidos')}    valor={data?.badges_obtidos ?? 0} />
                  <KpiCard icon={Activity} iconBg="bg-azulciano-500" label={t('badges_processo')}  valor={data?.badges_em_processo ?? 0} />
                  <KpiCard icon={Star}     iconBg="bg-softinsa-700" label={t('total_pontos')}      valor={(data?.pontos_totais ?? 0).toLocaleString('pt-PT')} />
                  <KpiCard icon={Target}   iconBg="bg-azulciano-500" label={t('proximo_nivel')}    valor={`${data?.proximo_nivel_progresso ?? 0}%`} />
                </div>
              </section>

              <WidgetLembretes />

              {/* Progresso do Learning Path (por Service Line) */}
              {data?.progresso_service_lines?.length > 0 && (
                <section className="mt-10">
                  <h2 className="text-lg font-bold text-slate-900">{t('progresso_lp')}</h2>
                  {data.nome_learning_path && (
                    <p className="mt-0.5 text-sm text-slate-500">Learning Path: {data.nome_learning_path}</p>
                  )}
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {data.progresso_service_lines.map((sl) => (
                      <BarraServiceLine key={sl.id_service_line} sl={sl} />
                    ))}
                  </div>
                </section>
              )}

              {/* Badges Recomendados */}
              {data?.badges_recomendados?.length > 0 && (
                <section className="mt-10">
                  <h2 className="text-lg font-bold text-slate-900">{t('badges_recomendados')}</h2>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.badges_recomendados.map((badge) => (
                      <BadgeCard key={badge.id_badge} badge={badge} onCandidatar={setModalBadgeId} />
                    ))}
                  </div>
                </section>
              )}

              {/* Marcos & Celebrações (req 16) */}
              {(() => {
                const n = data?.badges_obtidos ?? 0;
                const marcos = [
                  { min: 1,  max: 1,  emoji: '🎉', titulo: 'Primeiro Badge!',          desc: 'Obtiveste o teu primeiro badge. Continua assim!' },
                  { min: 3,  max: 4,  emoji: '🚀', titulo: 'A ganhar ritmo!',          desc: `${n} badges obtidos. Estás no bom caminho!` },
                  { min: 5,  max: 9,  emoji: '⭐', titulo: 'Consultor em destaque!',   desc: `${n} badges obtidos. O teu perfil está a crescer.` },
                  { min: 10, max: 19, emoji: '🏆', titulo: 'Especialista reconhecido!',desc: `${n} badges — marca impressionante!` },
                  { min: 20, max: Infinity, emoji: '💎', titulo: 'Elite da Softinsa!', desc: `${n} badges. Estás entre os melhores consultores!` },
                ];
                const marco = marcos.find(m => n >= m.min && n <= m.max);
                if (!marco) return null;
                return (
                  <section className="mt-10">
                    <h2 className="text-lg font-bold text-slate-900">{t('marco_alcancado')}</h2>
                    <div className="mt-4 flex items-center gap-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-5 shadow-sm">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-100 text-2xl">
                        {marco.emoji}
                      </div>
                      <div>
                        <p className="text-base font-bold text-amber-800">{marco.titulo}</p>
                        <p className="mt-0.5 text-sm text-amber-700">{marco.desc}</p>
                      </div>
                      <Trophy className="ml-auto h-8 w-8 shrink-0 text-amber-400" strokeWidth={1.5} />
                    </div>
                  </section>
                );
              })()}

              {/* Atividade Recente */}
              {data?.atividade_recente?.length > 0 && (
                <section className="mt-10">
                  <h2 className="text-lg font-bold text-slate-900">{t('atividade_recente')}</h2>
                  <div className="mt-4 space-y-3">
                    {data.atividade_recente.map((item, i) => (
                      <ItemAtividade key={i} item={item} />
                    ))}
                  </div>
                </section>
              )}

              {/* Estado vazio */}
              {!isLoading && !data?.progresso_service_lines?.length && !data?.atividade_recente?.length && (
                <div className="mt-16 flex flex-col items-center text-center">
                  <Award className="h-14 w-14 text-slate-300" strokeWidth={1} />
                  <p className="mt-4 text-base font-semibold text-slate-600">{t('sem_atividade')}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {t('sem_atividade_desc')}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/badges')}
                    className="mt-5 rounded-lg bg-softinsa-600 px-5 py-2 text-sm font-semibold text-white hover:bg-softinsa-700"
                  >
                    {t('ver_catalogo')}
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
