import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';
import InputPassword from '../../components/InputPassword';
import { useLanguage } from '../../context/LanguageContext';

function usePerfil() {
  return useQuery({
    queryKey: ['sl-perfil-completo'],
    queryFn: async () => {
      const { data } = await api.get('/api/utilizadores/eu/perfil-completo');
      return data.utilizador;
    },
  });
}

function formatarData(data) {
  if (!data) return '—';
  return new Date(data).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ─── Campo de perfil read-only ─────────────────────────────────────── */
function Campo({ label, valor }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
        {valor || '—'}
      </div>
    </div>
  );
}

/* ─── Secção Informações Pessoais ───────────────────────────────────── */
function SecçãoInformacoes({ utilizador, isLoading }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [emEdicao, setEmEdicao] = useState(false);
  const [nome, setNome] = useState('');

  useEffect(() => {
    if (utilizador?.nome) setNome(utilizador.nome);
  }, [utilizador?.nome]);

  const mutation = useMutation({
    mutationFn: () => api.put('/api/utilizadores/eu/perfil', { nome }),
    onSuccess: () => {
      toast.success(t('sl_perfil_toast_ok'));
      queryClient.invalidateQueries({ queryKey: ['sl-perfil-completo'] });
      setEmEdicao(false);
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  function cancelar() {
    setNome(utilizador?.nome || '');
    setEmEdicao(false);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-base font-semibold text-slate-800">{t('sl_perfil_info_titulo')}</h2>

      {isLoading ? (
        <Carregando />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('sl_perfil_nome_label')}</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              readOnly={!emEdicao}
              className={`input transition-colors ${emEdicao ? 'bg-white border-softinsa-400' : 'bg-slate-50 cursor-default'}`}
            />
          </div>
          <Campo label={t('sl_perfil_email')} valor={utilizador?.email} />
          <Campo label={t('sl_perfil_sl')} valor={utilizador?.service_line?.nome_service_line} />
          <Campo label={t('sl_perfil_area')} valor={utilizador?.area?.nome_area} />
          <Campo label={t('sl_perfil_cargo')} valor={t('sl_perfil_cargo_val')} />
          <Campo label={t('sl_perfil_data_reg')} valor={formatarData(utilizador?.created_at)} />
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        {!emEdicao ? (
          <button
            type="button"
            onClick={() => setEmEdicao(true)}
            disabled={isLoading}
            className="btn-primary"
          >
            {t('sl_perfil_editar')}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !nome.trim()}
              className="btn-primary"
            >
              {mutation.isPending ? t('sl_perfil_a_guardar') : t('sl_perfil_guardar')}
            </button>
            <button
              type="button"
              onClick={cancelar}
              disabled={mutation.isPending}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              {t('sl_perfil_cancelar')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Secção Segurança ──────────────────────────────────────────────── */
function SecçãoSegurança() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ password_atual: '', nova_password: '', confirmar: '' });
  const [erroConfirmar, setErroConfirmar] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.put('/api/utilizadores/eu/password', {
      password_atual: form.password_atual,
      nova_password: form.nova_password,
    }),
    onSuccess: () => {
      toast.success(t('sl_perfil_toast_pass_ok'));
      setForm({ password_atual: '', nova_password: '', confirmar: '' });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  function submeter(e) {
    e.preventDefault();
    if (form.nova_password !== form.confirmar) {
      setErroConfirmar(t('sl_perfil_pass_nao_coinc'));
      return;
    }
    setErroConfirmar('');
    mutation.mutate();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-base font-semibold text-slate-800">{t('sl_perfil_seg_titulo')}</h2>
      <form onSubmit={submeter} className="space-y-4 max-w-md">
        <div>
          <label className="label">{t('sl_perfil_pass_atual')}</label>
          <InputPassword
            value={form.password_atual}
            onChange={e => setForm(f => ({ ...f, password_atual: e.target.value }))}
            placeholder={t('sl_perfil_pass_atual_ph')}
          />
        </div>
        <div>
          <label className="label">{t('sl_perfil_nova_pass')}</label>
          <InputPassword
            value={form.nova_password}
            onChange={e => setForm(f => ({ ...f, nova_password: e.target.value }))}
            placeholder={t('sl_perfil_nova_pass_ph')}
          />
        </div>
        <div>
          <label className="label">{t('sl_perfil_conf_pass')}</label>
          <InputPassword
            value={form.confirmar}
            onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))}
            placeholder={t('sl_perfil_conf_pass_ph')}
          />
          {erroConfirmar && <p className="mt-1 text-xs text-rose-500">{erroConfirmar}</p>}
        </div>
        <button
          type="submit"
          disabled={mutation.isPending || !form.password_atual || !form.nova_password || !form.confirmar}
          className="btn-primary mt-2"
        >
          {mutation.isPending ? t('sl_perfil_a_atualizar') : t('sl_perfil_atualizar')}
        </button>
      </form>
    </div>
  );
}

/* ─── Toggle ────────────────────────────────────────────────────────── */
function Toggle({ ativo, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      role="switch"
      aria-checked={ativo}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${ativo ? 'bg-softinsa-600' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${ativo ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

/* ─── Secção Preferências de Notificação ────────────────────────────── */
function SecçãoNotificacoes() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['sl-preferencias'],
    queryFn: async () => {
      const { data } = await api.get('/api/preferencias');
      return data.preferencias;
    },
  });

  const mutation = useMutation({
    mutationFn: (patch) => api.put('/api/preferencias', patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['sl-preferencias'] });
      const anterior = queryClient.getQueryData(['sl-preferencias']);
      queryClient.setQueryData(['sl-preferencias'], (old) => ({ ...old, ...patch }));
      return { anterior };
    },
    onError: (err, _patch, ctx) => {
      if (ctx?.anterior) queryClient.setQueryData(['sl-preferencias'], ctx.anterior);
      toast.error(extrairErro(err));
    },
    onSuccess: () => toast.success(t('sl_perfil_notif_toast_ok')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['sl-preferencias'] }),
  });

  function toggle(campo) {
    if (!prefs) return;
    mutation.mutate({ [campo]: prefs[campo] ? 0 : 1 });
  }

  const linhas = [
    { campo: 'email_aprovacao_badge', titulo: t('sl_perfil_notif_email_badge'),  desc: t('sl_perfil_notif_email_badge_desc') },
    { campo: 'notif_expiracao',       titulo: t('sl_perfil_notif_expiracao'),    desc: t('sl_perfil_notif_expiracao_desc') },
    { campo: 'notif_recomendacoes',   titulo: t('sl_perfil_notif_recomendacoes'), desc: t('sl_perfil_notif_recomendacoes_desc') },
  ];

  return (
    <div id="preferencias-notificacao" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm scroll-mt-24">
      <h2 className="text-base font-semibold text-slate-800">{t('sl_perfil_notif_titulo')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('sl_perfil_notif_desc')}</p>

      {isLoading ? (
        <div className="mt-5"><Carregando /></div>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {linhas.map(l => (
            <div key={l.campo} className="flex items-center justify-between py-3.5">
              <div className="pr-4">
                <p className="text-sm font-medium text-slate-800">{l.titulo}</p>
                <p className="text-xs text-slate-500">{l.desc}</p>
              </div>
              <Toggle ativo={!!prefs?.[l.campo]} onToggle={() => toggle(l.campo)} disabled={mutation.isPending} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────── */
export default function ServiceLinePerfil() {
  const { t } = useLanguage();
  const { data: utilizador, isLoading } = usePerfil();

  useEffect(() => {
    if (window.location.hash === '#preferencias-notificacao') {
      const el = document.getElementById('preferencias-notificacao');
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo={t('sl_perfil_subtitulo')} />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8 space-y-6 max-w-3xl">
          <SecçãoInformacoes utilizador={utilizador} isLoading={isLoading} />
          <SecçãoNotificacoes />
          <SecçãoSegurança />
        </main>
      </div>
    </div>
  );
}
