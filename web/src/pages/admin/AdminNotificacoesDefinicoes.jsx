import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Save, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';

/* Toggles de eventos de notificação (ordem do mockup) */
const EVENTOS = [
  { chave: 'email_confirmacao_registo', titulo: 'Email de confirmação de registo', descricao: 'Enviado automaticamente quando um utilizador se regista na plataforma' },
  { chave: 'email_redefinicao_password', titulo: 'Email de redefinição de password', descricao: 'Enviado quando o utilizador solicita recuperação de senha' },
  { chave: 'email_candidatura_badge', titulo: 'Email de candidatura a badge', descricao: 'Notifica o utilizador quando submete uma candidatura' },
  { chave: 'notif_aprovacao_badge', titulo: 'Notificação de aprovação de badge', descricao: 'Enviado quando uma candidatura é aprovada' },
  { chave: 'notif_rejeicao_badge', titulo: 'Notificação de rejeição de badge', descricao: 'Enviado quando uma candidatura é rejeitada' },
  { chave: 'alerta_sla_ultrapassado', titulo: 'Alertas de SLA ultrapassado', descricao: 'Alerta quando um processo ultrapassa o SLA definido' },
];

const CANAIS = [
  { chave: 'canal_email', label: 'Email' },
  { chave: 'canal_plataforma', label: 'Notificação na plataforma' },
  { chave: 'canal_push', label: 'Push notification' },
];

function Toggle({ ativo, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      onClick={() => onChange(!ativo)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${ativo ? 'bg-softinsa-600' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${ativo ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function AdminNotificacoesDefinicoes() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [emailTeste, setEmailTeste] = useState('');

  const config = useQuery({
    queryKey: ['admin', 'config-notificacao'],
    queryFn: async () => (await api.get('/api/config-notificacao')).data,
  });

  useEffect(() => {
    if (config.data?.config && !form) {
      setForm(config.data.config);
    }
  }, [config.data, form]);

  const guardar = useMutation({
    mutationFn: async () => (await api.put('/api/config-notificacao', form)).data,
    onSuccess: () => {
      toast.success('Configuração guardada.');
      qc.invalidateQueries({ queryKey: ['admin', 'config-notificacao'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const enviarTeste = useMutation({
    mutationFn: async () => (await api.post('/api/config-notificacao/teste', { email: emailTeste.trim() })).data,
    onSuccess: (data) => { toast.success(data.mensagem || 'Email de teste enviado.'); setEmailTeste(''); },
    onError: (err) => toast.error(extrairErro(err)),
  });

  function alternar(chave, valor) {
    setForm((atual) => ({ ...atual, [chave]: valor ? 1 : 0 }));
  }

  if (config.isLoading || !form) {
    return <div className="mx-auto max-w-[1100px] py-16 text-center text-slate-500">A carregar definições...</div>;
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/notificacoes')}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-softinsa-700"
            title="Voltar às notificações"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={1.8} />
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Definições de Notificações</h1>
        </div>
        <button type="button" className="btn-primary" disabled={guardar.isPending} onClick={() => guardar.mutate()}>
          <Save className="h-4 w-4" /> {guardar.isPending ? 'A guardar...' : 'Guardar Alterações'}
        </button>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Configuração de Notificações</h2>
        <div className="mt-5 space-y-4">
          {EVENTOS.map((ev) => (
            <div key={ev.chave} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-slate-800">{ev.titulo}</div>
                <div className="mt-0.5 text-xs text-slate-500">{ev.descricao}</div>
              </div>
              <Toggle ativo={Boolean(form[ev.chave])} onChange={(v) => alternar(ev.chave, v)} />
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Configuração de Canais</h2>
          <div className="mt-5 space-y-4">
            {CANAIS.map((canal) => (
              <label key={canal.chave} className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-slate-300 text-softinsa-600 focus:ring-softinsa-500"
                  checked={Boolean(form[canal.chave])}
                  onChange={(e) => alternar(canal.chave, e.target.checked)}
                />
                {canal.label}
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Teste de Notificação</h2>
          <p className="mt-2 text-sm text-slate-500">Envie um email de teste para verificar o template</p>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => { e.preventDefault(); if (emailTeste.trim()) enviarTeste.mutate(); }}
          >
            <label className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                className="input pl-10"
                placeholder="email@exemplo.com"
                value={emailTeste}
                onChange={(e) => setEmailTeste(e.target.value)}
              />
            </label>
            <button type="submit" className="btn-primary shrink-0" disabled={!emailTeste.trim() || enviarTeste.isPending}>
              <Send className="h-4 w-4" /> {enviarTeste.isPending ? 'A enviar...' : 'Enviar teste'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
