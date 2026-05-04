import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Award, Copy, ExternalLink, FileText, KeyRound, Lock, Pencil, Shield, Trophy, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Perfil() {
  const { utilizador, recarregar } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const nome = utilizador?.nome || '';
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
  const slug = utilizador?.url_slug || nome.toLowerCase().replace(/\s+/g, '-');
  const urlPublica = `softinsa.pt/badges/${slug}`;

  /* ── Dados complementares ─────────────────────────────────────────────── */
  const { data: statsData } = useQuery({
    queryKey: ['dashboard-consultor'],
    queryFn: async () => { const { data } = await api.get('/api/estatisticas/consultor'); return data; },
    staleTime: 60_000,
  });

  const { data: prefData } = useQuery({
    queryKey: ['preferencias'],
    queryFn: async () => { const { data } = await api.get('/api/preferencias'); return data; },
    staleTime: 60_000,
  });

  const { data: rgpdData } = useQuery({
    queryKey: ['rgpd'],
    queryFn: async () => { const { data } = await api.get('/api/rgpd'); return data; },
    staleTime: 60_000,
  });

  /* ── Estado local das preferências ────────────────────────────────────── */
  const [idioma, setIdioma] = useState('pt');
  const [prefs, setPrefs] = useState({
    email_aprovacao_badge: true,
    notif_expiracao: true,
    notif_recomendacoes: false,
  });
  const [rgpd, setRgpd] = useState({
    publicacao_badge: false,
    partilha_linkedin: false,
    partilha_auto_linkedin: false,
    tratamento_dados: false,
  });

  useEffect(() => {
    if (prefData?.preferencias) {
      const p = prefData.preferencias;
      setPrefs({
        email_aprovacao_badge: !!p.email_aprovacao_badge,
        notif_expiracao: !!p.notif_expiracao,
        notif_recomendacoes: !!p.notif_recomendacoes,
      });
    }
  }, [prefData]);

  useEffect(() => {
    if (rgpdData?.consentimentos) {
      const c = {};
      for (const r of rgpdData.consentimentos) c[r.tipo_consentimento] = !!r.aceite;
      setRgpd(prev => ({ ...prev, ...c }));
    }
  }, [rgpdData]);

  /* ── Mutações ─────────────────────────────────────────────────────────── */
  const guardarPrefs = useMutation({
    mutationFn: () => api.put('/api/preferencias', prefs),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['preferencias'] }); toast.success('Preferências guardadas.'); },
    onError: () => toast.error('Erro ao guardar preferências.'),
  });

  const guardarRgpd = useMutation({
    mutationFn: (payload) => api.post('/api/rgpd', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rgpd'] }); toast.success('Preferências RGPD guardadas.'); },
    onError: () => toast.error('Erro ao guardar RGPD.'),
  });

  function toggleRgpd(tipo, valor) {
    setRgpd(prev => ({ ...prev, [tipo]: valor }));
    guardarRgpd.mutate({ tipo_consentimento: tipo, aceite: valor, versao_politica: '1.0' });
  }

  function copiarLink() {
    navigator.clipboard.writeText(`https://${urlPublica}`);
    toast.success('Link copiado!');
  }

  const ano = utilizador?.created_at
    ? new Date(utilizador.created_at).getFullYear()
    : new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <ConsultorSidebar />
      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo="Perfil e preferências" />

        <main className="px-5 py-8 lg:px-10 pb-24 lg:pb-10">
          <h2 className="text-2xl font-bold text-slate-900">Perfil</h2>
          <p className="mt-1 text-sm text-slate-500">Gerencie as suas informações pessoais e preferências da plataforma.</p>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* ── Coluna Esquerda ─────────────────────────────────────────── */}
            <div className="space-y-6">
              {/* Informações do Consultor */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-softinsa-700 uppercase tracking-wide">Informações do Consultor</h3>
                <div className="mt-4 flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-softinsa-600 text-xl font-bold text-white">
                    {iniciais}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-bold text-slate-900">{utilizador?.nome}</p>
                        <p className="text-xs text-slate-500">{utilizador?.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {}}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} /> Editar Perfil
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <span className="text-slate-400">Área:</span>
                        <p className="font-semibold text-slate-700">{utilizador?.nome_area || '—'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Service Line:</span>
                        <p className="font-semibold text-slate-700">{utilizador?.nome_service_line || '—'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Consultor desde:</span>
                        <p className="font-semibold text-slate-700">{ano}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* URL pública */}
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Perfil Público de Certificações</p>
                  <p className="text-xs font-medium text-slate-500 mb-2">Public profile URL:</p>
                  <p className="text-xs font-semibold text-softinsa-600 mb-3 break-all">{urlPublica}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(`https://${urlPublica}`, '_blank')}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Ver Página Pública
                    </button>
                    <button
                      type="button"
                      onClick={copiarLink}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copiar Link
                    </button>
                  </div>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-softinsa-700 uppercase tracking-wide">Estatísticas</h3>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { icon: Award,      label: 'Badges Obtidos',     valor: statsData?.badges_obtidos ?? 0,       cor: 'text-softinsa-600' },
                    { icon: TrendingUp, label: 'Total Pontos',        valor: (statsData?.pontos_totais ?? 0).toLocaleString('pt-PT'), cor: 'text-amber-500' },
                    { icon: FileText,   label: 'Candidaturas Ativas', valor: statsData?.badges_em_processo ?? 0,  cor: 'text-blue-600' },
                    { icon: Trophy,     label: 'Conquistas',          valor: statsData?.conquistas ?? 0,           cor: 'text-violet-600' },
                  ].map(({ icon: Icon, label, valor, cor }) => (
                    <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <Icon className={`h-6 w-6 ${cor}`} strokeWidth={1.5} />
                      <p className="mt-2 text-xs text-slate-500">{label}</p>
                      <p className={`mt-1 text-2xl font-bold ${cor}`}>{valor}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/meus-badges')}
                  className="mt-4 flex items-center gap-1 text-sm font-semibold text-softinsa-600 hover:underline"
                >
                  Ver os meus badges →
                </button>
              </div>

              {/* Privacidade e RGPD */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-softinsa-700 uppercase tracking-wide">Privacidade e RGPD</h3>
                <div className="mt-4 space-y-3">
                  {[
                    { tipo: 'publicacao_badge',       label: 'Permitir publicação de badges na galeria pública' },
                    { tipo: 'partilha_linkedin',       label: 'Permitir partilha de badges no LinkedIn' },
                    { tipo: 'partilha_auto_linkedin',  label: 'Permitir partilha automática de novas certificações no LinkedIn' },
                  ].map(({ tipo, label }) => (
                    <label key={tipo} className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!rgpd[tipo]}
                        onChange={e => toggleRgpd(tipo, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-softinsa-600 focus:ring-softinsa-400"
                      />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  ))}
                  <p className="text-xs text-slate-400 italic">
                    Apenas badges aprovados serão visíveis publicamente na página pública do consultor.
                  </p>
                  <label className="flex cursor-pointer items-center gap-3 pt-2 border-t border-slate-100">
                    <input
                      type="checkbox"
                      checked={!!rgpd.tratamento_dados}
                      onChange={e => toggleRgpd('tratamento_dados', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-softinsa-600 focus:ring-softinsa-400"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Consinto o tratamento dos meus dados pessoais de acordo com o RGPD
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* ── Coluna Direita ──────────────────────────────────────────── */}
            <div className="space-y-6">
              {/* Preferências */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-softinsa-700 uppercase tracking-wide">Preferências</h3>

                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Idioma da Plataforma</label>
                  <select
                    value={idioma}
                    onChange={e => setIdioma(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none focus:border-softinsa-400"
                  >
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div className="mt-5">
                  <p className="text-sm font-semibold text-slate-700">Preferências de Notificações</p>
                  <div className="mt-3 space-y-3">
                    {[
                      { key: 'email_aprovacao_badge',  label: 'Receber email de aprovação de badges' },
                      { key: 'notif_expiracao',         label: 'Receber notificações de expiração de certificações' },
                      { key: 'notif_recomendacoes',     label: 'Receber recomendações de novos badges' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={!!prefs[key]}
                          onChange={e => setPrefs(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="h-4 w-4 rounded border-slate-300 text-softinsa-600 focus:ring-softinsa-400"
                        />
                        <span className="text-sm text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-400 italic">
                    Estas preferências controlam como recebe notificações sobre o progresso das suas certificações.
                  </p>
                  <button
                    type="button"
                    onClick={() => guardarPrefs.mutate()}
                    disabled={guardarPrefs.isPending}
                    className="mt-4 rounded-lg bg-softinsa-600 px-5 py-2 text-sm font-semibold text-white hover:bg-softinsa-700 transition disabled:opacity-60"
                  >
                    {guardarPrefs.isPending ? 'A guardar...' : 'Guardar Preferências'}
                  </button>
                </div>
              </div>

              {/* Segurança */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-softinsa-700 uppercase tracking-wide">Segurança</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <KeyRound className="h-5 w-5 text-slate-500" strokeWidth={1.8} />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Alterar Password</p>
                        <p className="text-xs text-slate-500">Atualize a sua palavra-passe</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/alterar-password-inicial')}
                      className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Alterar
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-slate-500" strokeWidth={1.8} />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Autenticação de Dois Fatores{' '}
                          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            {utilizador?.totp_ativo ? 'Ativo' : 'Desativado'}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">Adicione segurança extra à sua conta</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {}}
                      className="rounded-lg bg-softinsa-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-softinsa-700 transition"
                    >
                      {utilizador?.totp_ativo ? 'Gerir' : 'Ativar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
