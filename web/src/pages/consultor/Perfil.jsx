import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Award, Copy, ExternalLink, FileText,
  KeyRound, LogOut, Pencil, Shield, TrendingUp, Trophy, X,
} from 'lucide-react';
import { api, extrairErro } from '../../lib/api';
import { ModalAlterarPassword, Modal2FA, ModalDesativar2FA } from '../../components/PerfilSeguranca';
import { ConfirmarLogoutModal } from '../../components/ConfirmarLogoutModal';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════════════════════════
   Modal: Editar Perfil
═══════════════════════════════════════════════════════════════════════════ */
function ModalEditarPerfil({ utilizador, onFechar, onSucesso }) {
  const { t } = useLanguage();
  const idAreaAtual = utilizador?.id_area || utilizador?.area?.id_area || '';
  const [nome, setNome]       = useState(utilizador?.nome || '');
  const [idArea, setIdArea]   = useState(idAreaAtual ? String(idAreaAtual) : '');

  const { data: areasData } = useQuery({
    queryKey: ['areas-todas'],
    queryFn: async () => { const { data } = await api.get('/api/areas?por_pagina=100'); return data; },
    staleTime: 300_000,
  });

  const guardar = useMutation({
    mutationFn: () => {
      const areaAlterada = String(idArea || '') !== String(idAreaAtual || '');
      return api.put('/api/utilizadores/eu/perfil', {
        nome: nome.trim(),
        ...(areaAlterada && idArea ? { id_area: Number(idArea) } : {}),
      });
    },
    onSuccess: () => { toast.success('Perfil atualizado.'); onSucesso(); onFechar(); },
    onError: (err) => toast.error(extrairErro(err, 'Erro ao atualizar perfil.')),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('editar_perfil')}</h2>
            <p className="mt-0.5 text-xs text-slate-500">Atualize as suas informações pessoais e profissionais.</p>
          </div>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Nome Completo</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400 focus:ring-2 focus:ring-softinsa-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <input
              value={utilizador?.email || ''}
              disabled
              className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-400"
            />
            <p className="mt-1 text-[11px] text-slate-400">O email não pode ser alterado aqui.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Área Principal</label>
            <select
              value={idArea}
              onChange={e => setIdArea(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400"
            >
              {!idAreaAtual && <option value="">Escolha uma área</option>}
              {(areasData?.dados ?? []).map(a => (
                <option key={a.id_area} value={a.id_area}>{a.nome}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              A gravação só altera a associação se escolher uma área diferente.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Ano de Entrada</label>
            <input
              value={utilizador?.created_at ? new Date(utilizador.created_at).getFullYear() : '—'}
              disabled
              className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onFechar} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            {t('cancelar')}
          </button>
          <button
            type="button"
            onClick={() => guardar.mutate()}
            disabled={guardar.isPending || !nome.trim()}
            className="flex-1 rounded-lg bg-softinsa-700 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-800 disabled:opacity-60"
          >
            {guardar.isPending ? 'A guardar...' : t('guardar_alteracoes')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Modais de Password e 2FA → components/PerfilSeguranca.jsx (partilhados com o Admin) */

/* ═══════════════════════════════════════════════════════════════════════════
   Página principal
═══════════════════════════════════════════════════════════════════════════ */
export default function Perfil() {
  const { utilizador, recarregar, logout } = useAuth();
  const { idioma, mudarIdioma, t } = useLanguage();
  const navigate  = useNavigate();
  const queryClient = useQueryClient();

  const [modalEditar,   setModalEditar]   = useState(false);
  const [modalPassword, setModalPassword] = useState(false);
  const [modal2FA,      setModal2FA]      = useState(false);
  const [modalDesativar2FA, setModalDesativar2FA] = useState(false);
  const [confirmarLogout, setConfirmarLogout] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const nome     = utilizador?.nome || '';
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
  const slug     = utilizador?.url_slug || nome.toLowerCase().replace(/\s+/g, '-');
  const linkGaleria = `${window.location.origin}/perfil-publico/${slug}`;
  const urlPublica = `${window.location.host}/perfil-publico/${slug}`;
  const ano      = utilizador?.created_at ? new Date(utilizador.created_at).getFullYear() : '—';

  /* Dados */
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

  const { data: totpData, refetch: refetchTotp } = useQuery({
    queryKey: ['totp-estado'],
    queryFn: async () => { const { data } = await api.get('/api/totp/estado'); return data; },
    staleTime: 30_000,
  });

  const totpAtivo = totpData?.ativo ?? !!utilizador?.totp_ativo;

  /* Estado local preferências */
  const [prefs, setPrefs]   = useState({ email_aprovacao_badge: true, notif_expiracao: true, notif_recomendacoes: false });
  const [rgpd, setRgpd]     = useState({ publicacao_badge: false, partilha_linkedin: false, tratamento_dados: false });

  useEffect(() => {
    if (prefData?.preferencias) {
      const p = prefData.preferencias;
      setPrefs({ email_aprovacao_badge: !!p.email_aprovacao_badge, notif_expiracao: !!p.notif_expiracao, notif_recomendacoes: !!p.notif_recomendacoes });
    }
  }, [prefData]);

  useEffect(() => {
    // A API devolve { dados } ordenado por id DESC → o 1.º de cada tipo é o mais recente
    const lista = rgpdData?.dados ?? rgpdData?.consentimentos;
    if (lista) {
      const c = {};
      for (const r of lista) {
        if (!(r.tipo_consentimento in c)) c[r.tipo_consentimento] = !!r.aceite;
      }
      setRgpd(prev => ({ ...prev, ...c }));
    }
  }, [rgpdData]);

  const guardarPrefs = useMutation({
    mutationFn: () => api.put('/api/preferencias', prefs),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['preferencias'] }); toast.success('Preferências guardadas.'); },
    onError: () => toast.error('Erro ao guardar preferências.'),
  });

  const guardarRgpd = useMutation({
    mutationFn: (payload) => api.post('/api/rgpd', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rgpd'] }),
    onError: () => toast.error('Erro ao guardar RGPD.'),
  });

  function toggleRgpd(tipo, valor) {
    setRgpd(prev => ({ ...prev, [tipo]: valor }));
    guardarRgpd.mutate({ tipo_consentimento: tipo, aceite: valor, versao_politica: '1.0' });
  }

  function copiarLink() { navigator.clipboard.writeText(linkGaleria); toast.success('Link copiado!'); }

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      {modalEditar   && <ModalEditarPerfil   utilizador={utilizador} onFechar={() => setModalEditar(false)}   onSucesso={recarregar} />}
      {modalPassword && <ModalAlterarPassword                        onFechar={() => setModalPassword(false)} />}
      {modal2FA      && <Modal2FA                                    onFechar={() => setModal2FA(false)}      onSucesso={() => { refetchTotp(); recarregar(); }} />}
      {modalDesativar2FA && <ModalDesativar2FA onFechar={() => setModalDesativar2FA(false)} onSucesso={() => { refetchTotp(); recarregar(); }} />}

      <ConsultorSidebar />
      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo={t('sub_perfil')} />

        <main className="px-5 py-8 lg:px-10 pb-24 lg:pb-10">
          <h2 className="text-2xl font-bold text-slate-900">{t('titulo_perfil')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('desc_perfil')}</p>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* ── Coluna Esquerda ─────────────────────────────────── */}
            <div className="space-y-6">
              {/* Informações */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-softinsa-700">{t('info_consultor')}</p>
                <div className="mt-4 flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-softinsa-600 text-xl font-bold text-white">
                    {iniciais}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-bold text-softinsa-700">{utilizador?.nome}</p>
                        <p className="text-xs text-slate-500">{utilizador?.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModalEditar(true)}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} /> {t('editar_perfil')}
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <span className="text-slate-400">{t('area_label')}</span>
                        <p className="font-semibold text-slate-700">{utilizador?.nome_area || '—'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">{t('sl_label')}</span>
                        <p className="font-semibold text-slate-700">{utilizador?.nome_service_line || '—'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">{t('desde_label')}</span>
                        <p className="font-semibold text-slate-700">{ano}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* URL pública */}
                <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-600">{t('perfil_pub_cert')}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{t('public_url')}</p>
                  <p className="mt-0.5 text-xs font-semibold text-softinsa-600 break-all">{urlPublica}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => window.open(linkGaleria, '_blank')} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                      <ExternalLink className="h-3.5 w-3.5" /> {t('ver_pagina_pub')}
                    </button>
                    <button type="button" onClick={copiarLink} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                      <Copy className="h-3.5 w-3.5" /> {t('copiar_link')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-softinsa-700">{t('estatisticas')}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { icon: Award,      label: t('badges_obtidos_s'), valor: statsData?.badges_obtidos ?? 0,                                cor: 'text-softinsa-600' },
                    { icon: TrendingUp, label: t('total_pontos_s'),   valor: (statsData?.pontos_totais ?? 0).toLocaleString('pt-PT'),      cor: 'text-amber-500' },
                    { icon: FileText,   label: t('cands_ativas'),     valor: statsData?.badges_em_processo ?? 0,                          cor: 'text-blue-600' },
                    { icon: Trophy,     label: t('conquistas_s'),     valor: statsData?.conquistas ?? 0,                                   cor: 'text-violet-600' },
                  ].map(({ icon: Icon, label, valor, cor }) => (
                    <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <Icon className={`h-6 w-6 ${cor}`} strokeWidth={1.5} />
                      <p className="mt-2 text-xs text-slate-500">{label}</p>
                      <p className={`mt-1 text-2xl font-bold ${cor}`}>{valor}</p>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => navigate('/meus-badges')} className="mt-4 flex items-center gap-1 text-sm font-semibold text-softinsa-600 hover:underline">
                  {t('ver_meus_badges')}
                </button>
              </div>

              {/* RGPD */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-softinsa-700">{t('privacidade_rgpd')}</p>
                <div className="mt-4 space-y-3">
                  {[
                    { tipo: 'publicacao_badge',      label: t('rgpd_pub') },
                    { tipo: 'partilha_linkedin',      label: t('rgpd_linkedin') },
                  ].map(({ tipo, label }) => (
                    <label key={tipo} className="flex cursor-pointer items-center gap-3">
                      <input type="checkbox" checked={!!rgpd[tipo]} onChange={e => toggleRgpd(tipo, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-softinsa-600 focus:ring-softinsa-400" />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  ))}
                  <p className="text-xs italic text-slate-400">{t('rgpd_nota')}</p>
                  <label className="flex cursor-pointer items-center gap-3 border-t border-slate-100 pt-3">
                    <input type="checkbox" checked={!!rgpd.tratamento_dados} onChange={e => toggleRgpd('tratamento_dados', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-softinsa-600 focus:ring-softinsa-400" />
                    <span className="text-sm font-medium text-slate-700">{t('rgpd_consentimento')}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ── Coluna Direita ───────────────────────────────────── */}
            <div className="space-y-6">
              {/* Preferências */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-softinsa-700">{t('preferencias')}</p>
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('idioma_plataforma')}</label>
                  <select value={idioma} onChange={e => mudarIdioma(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400">
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
                <div className="mt-5">
                  <p className="text-sm font-semibold text-slate-700">{t('prefs_notif_titulo')}</p>
                  <div className="mt-3 space-y-3">
                    {[
                      { key: 'email_aprovacao_badge', label: t('pref_email_aprov') },
                      { key: 'notif_expiracao',        label: t('pref_notif_exp') },
                      { key: 'notif_recomendacoes',    label: t('pref_recomendacoes') },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex cursor-pointer items-center gap-3">
                        <input type="checkbox" checked={!!prefs[key]} onChange={e => setPrefs(prev => ({ ...prev, [key]: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-softinsa-600 focus:ring-softinsa-400" />
                        <span className="text-sm text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-xs italic text-slate-400">{t('pref_nota')}</p>
                  <button type="button" onClick={() => guardarPrefs.mutate()} disabled={guardarPrefs.isPending} className="mt-4 rounded-lg bg-softinsa-600 px-5 py-2 text-sm font-semibold text-white hover:bg-softinsa-700 transition disabled:opacity-60">
                    {guardarPrefs.isPending ? 'A guardar...' : t('guardar_prefs')}
                  </button>
                </div>
              </div>

              {/* Segurança */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-softinsa-700">{t('seguranca')}</p>
                <div className="mt-4 space-y-3">
                  {/* Alterar Password */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200">
                        <KeyRound className="h-5 w-5 text-slate-500" strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{t('alterar_pass')}</p>
                        <p className="text-xs text-slate-500">{t('alterar_pass_desc')}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setModalPassword(true)} className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                      {t('alterar_btn')}
                    </button>
                  </div>

                  {/* 2FA */}
                  <div className={`flex items-center justify-between rounded-xl border p-4 ${totpAtivo ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${totpAtivo ? 'border-emerald-200 bg-emerald-100' : 'border-slate-200 bg-white'}`}>
                        <Shield className={`h-5 w-5 ${totpAtivo ? 'text-emerald-600' : 'text-slate-500'}`} strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {t('autenticacao_2fa')}
                          <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${totpAtivo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                            {totpAtivo ? t('ativar') : 'Desativado'}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {totpAtivo ? t('conta_protegida') : t('adicionar_seg')}
                        </p>
                      </div>
                    </div>
                    {totpAtivo ? (
                      <button type="button" onClick={() => setModalDesativar2FA(true)} className="rounded-lg border border-red-200 bg-white px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition">
                        {t('desativar')}
                      </button>
                    ) : (
                      <button type="button" onClick={() => setModal2FA(true)} className="rounded-lg bg-softinsa-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-softinsa-800 transition">
                        {t('ativar')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Terminar sessão — visível no mobile, onde a sidebar (com logout) está escondida */}
          <button
            type="button"
            onClick={() => setConfirmarLogout(true)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 lg:hidden"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.8} />
            {t('terminar_sessao')}
          </button>
        </main>
      </div>

      {confirmarLogout && (
        <ConfirmarLogoutModal
          onConfirmar={() => { setConfirmarLogout(false); handleLogout(); }}
          onCancelar={() => setConfirmarLogout(false)}
        />
      )}
    </div>
  );
}
