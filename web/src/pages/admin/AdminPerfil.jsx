import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Shield, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ModalAlterarPassword, Modal2FA, ModalDesativar2FA } from '../../components/PerfilSeguranca';

function ModalEditarNome({ utilizador, onFechar, onSucesso }) {
  const { t } = useLanguage();
  const [nome, setNome] = useState(utilizador?.nome || '');

  const guardar = useMutation({
    mutationFn: () => api.put('/api/utilizadores/eu/perfil', { nome: nome.trim() }),
    onSuccess: () => { toast.success(t('admin_perfil_sucesso_atualizado')); onSucesso(); onFechar(); },
    onError: (err) => toast.error(extrairErro(err, t('admin_perfil_erro_atualizar'))),
  });

  return (
    <div className="fixed inset-x-0 -top-8 bottom-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 pt-8" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('admin_perfil_editar_titulo')}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{t('admin_perfil_editar_subtitulo')}</p>
          </div>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('admin_perfil_nome_completo')}</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400 focus:ring-2 focus:ring-softinsa-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('admin_perfil_email')}</label>
            <input
              value={utilizador?.email || ''}
              disabled
              className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-400"
            />
            <p className="mt-1 text-[11px] text-slate-400">{t('admin_perfil_email_aviso')}</p>
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onFechar} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            {t('admin_perfil_cancelar')}
          </button>
          <button
            type="button"
            onClick={() => guardar.mutate()}
            disabled={guardar.isPending || !nome.trim()}
            className="flex-1 rounded-lg bg-softinsa-700 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-800 disabled:opacity-60"
          >
            {guardar.isPending ? t('admin_perfil_a_guardar') : t('admin_perfil_guardar_alteracoes')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPerfil() {
  const { utilizador, recarregar } = useAuth();
  const { idioma, mudarIdioma, t } = useLanguage();
  const queryClient = useQueryClient();

  const [modalEditar, setModalEditar] = useState(false);
  const [modalPassword, setModalPassword] = useState(false);
  const [modal2FA, setModal2FA] = useState(false);
  const [modalDesativar2FA, setModalDesativar2FA] = useState(false);

  const nome = utilizador?.nome || 'Admin';
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('');
  const perfis = utilizador?.perfis?.join(', ') || t('admin_role_long');

  const { data: totpData, refetch: refetchTotp } = useQuery({
    queryKey: ['totp-estado'],
    queryFn: async () => (await api.get('/api/totp/estado')).data,
    staleTime: 30_000,
  });
  const totpAtivo = totpData?.ativo ?? !!utilizador?.totp_ativo;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      {modalEditar && <ModalEditarNome utilizador={utilizador} onFechar={() => setModalEditar(false)} onSucesso={recarregar} />}
      {modalPassword && <ModalAlterarPassword onFechar={() => setModalPassword(false)} />}
      {modal2FA && <Modal2FA onFechar={() => setModal2FA(false)} onSucesso={() => { refetchTotp(); recarregar(); queryClient.invalidateQueries({ queryKey: ['totp-estado'] }); }} />}
      {modalDesativar2FA && <ModalDesativar2FA onFechar={() => setModalDesativar2FA(false)} onSucesso={() => { refetchTotp(); recarregar(); queryClient.invalidateQueries({ queryKey: ['totp-estado'] }); }} />}

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin_perfil_titulo')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('admin_perfil_subtitulo')}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Informações */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-softinsa-700">{t('admin_perfil_info_conta')}</p>
          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-softinsa-600 text-xl font-bold text-white">
              {iniciais}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-softinsa-700">{nome}</p>
                  <p className="truncate text-xs text-slate-500">{utilizador?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalEditar(true)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} /> {t('admin_perfil_editar_perfil')}
                </button>
              </div>
              <div className="mt-3 text-xs">
                <span className="text-slate-400">{t('admin_perfil_perfil_label')}</span>
                <p className="font-semibold text-slate-700">{perfis}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Preferências */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-softinsa-700">{t('admin_perfil_preferencias')}</p>
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('admin_perfil_idioma_plataforma')}</label>
            <select
              value={idioma}
              onChange={(e) => mudarIdioma(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-softinsa-400"
            >
              <option value="pt">Português</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </section>
      </div>

      {/* Segurança */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-softinsa-700">{t('admin_perfil_seguranca')}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Alterar Password */}
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white">
                <KeyRound className="h-5 w-5 text-slate-500" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{t('admin_perfil_alterar_password')}</p>
                <p className="text-xs text-slate-500">{t('admin_perfil_atualize_password')}</p>
              </div>
            </div>
            <button type="button" onClick={() => setModalPassword(true)} className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              {t('admin_perfil_alterar')}
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
                  {t('admin_perfil_2fa_titulo')}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${totpAtivo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {totpAtivo ? t('admin_perfil_2fa_ativo') : t('admin_perfil_2fa_desativado')}
                  </span>
                </p>
                <p className="text-xs text-slate-500">{totpAtivo ? t('admin_perfil_2fa_protegida') : t('admin_perfil_2fa_adicionar_camada')}</p>
              </div>
            </div>
            {totpAtivo ? (
              <button type="button" onClick={() => setModalDesativar2FA(true)} className="rounded-lg border border-red-200 bg-white px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition">
                {t('admin_perfil_desativar')}
              </button>
            ) : (
              <button type="button" onClick={() => setModal2FA(true)} className="rounded-lg bg-softinsa-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-softinsa-800 transition">
                {t('admin_perfil_ativar')}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
