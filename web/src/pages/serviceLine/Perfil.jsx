import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { ServiceLineSidebar, ServiceLineTopbar } from '../../components/ServiceLineShell';
import Carregando from '../../components/Carregando';
import InputPassword from '../../components/InputPassword';

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
  const queryClient = useQueryClient();
  const [emEdicao, setEmEdicao] = useState(false);
  const [nome, setNome] = useState('');

  useEffect(() => {
    if (utilizador?.nome) setNome(utilizador.nome);
  }, [utilizador?.nome]);

  const mutation = useMutation({
    mutationFn: () => api.put('/api/utilizadores/eu/perfil', { nome }),
    onSuccess: () => {
      toast.success('Perfil atualizado.');
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
      <h2 className="mb-5 text-base font-semibold text-slate-800">Informações Pessoais</h2>

      {isLoading ? (
        <Carregando />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nome Completo</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              readOnly={!emEdicao}
              className={`input transition-colors ${emEdicao ? 'bg-white border-softinsa-400' : 'bg-slate-50 cursor-default'}`}
            />
          </div>
          <Campo label="Email" valor={utilizador?.email} />
          <Campo label="Service Line" valor={utilizador?.service_line?.nome_service_line} />
          <Campo label="Área" valor={utilizador?.area?.nome_area} />
          <Campo label="Cargo" valor="Service Line Leader" />
          <Campo label="Data de Registo" valor={formatarData(utilizador?.created_at)} />
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
            Editar Perfil
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !nome.trim()}
              className="btn-primary"
            >
              {mutation.isPending ? 'A guardar…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={cancelar}
              disabled={mutation.isPending}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Secção Segurança ──────────────────────────────────────────────── */
function SecçãoSegurança() {
  const [form, setForm] = useState({ password_atual: '', nova_password: '', confirmar: '' });
  const [erroConfirmar, setErroConfirmar] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.put('/api/utilizadores/eu/password', {
      password_atual: form.password_atual,
      nova_password: form.nova_password,
    }),
    onSuccess: () => {
      toast.success('Password atualizada com sucesso.');
      setForm({ password_atual: '', nova_password: '', confirmar: '' });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  function submeter(e) {
    e.preventDefault();
    if (form.nova_password !== form.confirmar) {
      setErroConfirmar('As passwords não coincidem.');
      return;
    }
    setErroConfirmar('');
    mutation.mutate();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-base font-semibold text-slate-800">Segurança</h2>
      <form onSubmit={submeter} className="space-y-4 max-w-md">
        <div>
          <label className="label">Password Atual</label>
          <InputPassword
            value={form.password_atual}
            onChange={e => setForm(f => ({ ...f, password_atual: e.target.value }))}
            placeholder="Password atual"
          />
        </div>
        <div>
          <label className="label">Nova Password</label>
          <InputPassword
            value={form.nova_password}
            onChange={e => setForm(f => ({ ...f, nova_password: e.target.value }))}
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <div>
          <label className="label">Confirmar Password</label>
          <InputPassword
            value={form.confirmar}
            onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))}
            placeholder="Repita a nova password"
          />
          {erroConfirmar && <p className="mt-1 text-xs text-rose-500">{erroConfirmar}</p>}
        </div>
        <button
          type="submit"
          disabled={mutation.isPending || !form.password_atual || !form.nova_password || !form.confirmar}
          className="btn-primary mt-2"
        >
          {mutation.isPending ? 'A atualizar…' : 'Atualizar Password'}
        </button>
      </form>
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────────── */
export default function ServiceLinePerfil() {
  const { data: utilizador, isLoading } = usePerfil();

  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <ServiceLineSidebar />

      <div className="flex flex-1 flex-col lg:pl-[260px]">
        <ServiceLineTopbar subtitulo="Configurações da Conta" />

        <main className="flex-1 px-5 py-6 lg:px-8 pb-24 lg:pb-8 space-y-6 max-w-3xl">
          <SecçãoInformacoes utilizador={utilizador} isLoading={isLoading} />
          <SecçãoSegurança />
        </main>
      </div>
    </div>
  );
}
