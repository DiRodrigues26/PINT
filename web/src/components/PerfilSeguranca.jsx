import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Copy, Eye, EyeOff, QrCode, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../lib/api';

/* ───────────────────────────────────────────────────────────────────────────
   Modal: Alterar Password (partilhado entre Perfil do Consultor e do Admin)
─────────────────────────────────────────────────────────────────────────── */
function CampoPassword({ label, value, onChange, mostrar, toggleMostrar }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <input
          type={mostrar ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm outline-none focus:border-softinsa-400 focus:ring-2 focus:ring-softinsa-100"
        />
        <button type="button" onClick={toggleMostrar} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {mostrar ? <EyeOff className="h-4 w-4" strokeWidth={1.8} /> : <Eye className="h-4 w-4" strokeWidth={1.8} />}
        </button>
      </div>
    </div>
  );
}

export function ModalAlterarPassword({ onFechar }) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verAtual, setVerAtual] = useState(false);
  const [verNova, setVerNova] = useState(false);
  const [verConf, setVerConf] = useState(false);

  const alterar = useMutation({
    mutationFn: () => api.put('/api/utilizadores/eu/password', { password_atual: atual, nova_password: nova }),
    onSuccess: () => { toast.success('Password alterada com sucesso.'); onFechar(); },
    onError: (err) => toast.error(extrairErro(err, 'Erro ao alterar password.')),
  });

  function handleSubmit() {
    if (!atual || !nova || !confirmar) { toast.error('Preenche todos os campos.'); return; }
    if (nova.length < 8) { toast.error('Nova password deve ter pelo menos 8 caracteres.'); return; }
    if (nova !== confirmar) { toast.error('As passwords não coincidem.'); return; }
    alterar.mutate();
  }

  return (
    <div className="fixed inset-x-0 -top-8 bottom-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 pt-8" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Alterar Password</h2>
            <p className="mt-0.5 text-xs text-slate-500">Crie uma nova password para proteger a sua conta.</p>
          </div>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <CampoPassword label="Password Atual" value={atual} onChange={setAtual} mostrar={verAtual} toggleMostrar={() => setVerAtual((v) => !v)} />
          <CampoPassword label="Nova Password" value={nova} onChange={setNova} mostrar={verNova} toggleMostrar={() => setVerNova((v) => !v)} />
          <CampoPassword label="Confirmar Nova Password" value={confirmar} onChange={setConfirmar} mostrar={verConf} toggleMostrar={() => setVerConf((v) => !v)} />
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onFechar} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={alterar.isPending}
            className="flex-1 rounded-lg bg-softinsa-700 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-800 disabled:opacity-60"
          >
            {alterar.isPending ? 'A alterar...' : 'Alterar Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Modal: Ativar 2FA (partilhado)
─────────────────────────────────────────────────────────────────────────── */
export function Modal2FA({ onFechar, onSucesso }) {
  const [codigo, setCodigo] = useState('');
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    api.post('/api/totp/setup')
      .then(({ data }) => { setQrCode(data.qr_code); setSecret(data.secret); })
      .catch(() => toast.error('Erro ao gerar QR Code.'))
      .finally(() => setLoading(false));
  }, []);

  const ativar = useMutation({
    mutationFn: () => api.post('/api/totp/ativar', { codigo }),
    onSuccess: () => { toast.success('2FA ativado com sucesso!'); onSucesso(); onFechar(); },
    onError: (err) => toast.error(extrairErro(err, 'Código inválido.')),
  });

  function copiarSecret() {
    navigator.clipboard.writeText(secret);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function handleInput(e) {
    setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6));
  }

  return (
    <div className="fixed inset-x-0 -top-8 bottom-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 pt-8" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Ativar Autenticação de Dois Fatores</h2>
            <p className="mt-0.5 text-xs text-slate-500">Adicione uma camada extra de segurança à sua conta.</p>
          </div>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-softinsa-100 border-t-softinsa-600" />
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center">
                {qrCode ? (
                  <img src={qrCode} alt="QR Code 2FA" className="h-44 w-44 rounded-xl border border-slate-200 p-2" />
                ) : (
                  <div className="flex h-44 w-44 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                    <QrCode className="h-12 w-12 text-slate-300" strokeWidth={1} />
                  </div>
                )}
                <p className="mt-3 text-center text-xs text-slate-500">
                  Escaneie este código QR com a sua aplicação de autenticação<br />
                  <span className="text-slate-400">(Google Authenticator, Authy, etc.)</span>
                </p>
              </div>

              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold text-slate-500 text-center">Ou insira manualmente:</p>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <code className="flex-1 text-center text-xs font-mono font-bold tracking-widest text-slate-700 break-all">
                    {secret}
                  </code>
                  <button type="button" onClick={copiarSecret} className="shrink-0 text-slate-400 hover:text-softinsa-600 transition" title="Copiar">
                    <Copy className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                </div>
                {copiado && <p className="mt-1 text-center text-[11px] text-emerald-600 font-semibold">Copiado!</p>}
              </div>

              <div className="mt-5">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Código de Verificação</label>
                <input
                  value={codigo}
                  onChange={handleInput}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  className="w-full rounded-lg border border-slate-200 px-3 py-3 text-center text-xl font-mono font-bold tracking-[0.5em] outline-none focus:border-softinsa-400 focus:ring-2 focus:ring-softinsa-100"
                />
                <p className="mt-1 text-center text-[11px] text-slate-400">
                  Insira o código de 6 dígitos da sua aplicação de autenticação
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onFechar} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => ativar.mutate()}
            disabled={codigo.length !== 6 || ativar.isPending || loading}
            className="flex-1 rounded-lg bg-softinsa-700 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-800 disabled:opacity-60"
          >
            {ativar.isPending ? 'A verificar...' : 'Ativar 2FA'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalDesativar2FA({ onFechar, onSucesso }) {
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);

  const desativar = useMutation({
    mutationFn: () => api.post('/api/totp/desativar', {
      codigo: codigo.length === 6 ? codigo : undefined,
      password_atual: password || undefined,
    }),
    onSuccess: () => {
      toast.success('2FA desativado.');
      onSucesso?.();
      onFechar();
    },
    onError: (err) => toast.error(extrairErro(err, 'Erro ao desativar 2FA.')),
  });

  const podeDesativar = codigo.length === 6 || password.length > 0;

  return (
    <div className="fixed inset-x-0 -top-8 bottom-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 pt-8" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Desativar Autenticação de Dois Fatores</h2>
            <p className="mt-0.5 text-xs text-slate-500">Confirme a operação com o código 2FA ou a password atual.</p>
          </div>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Código 2FA</label>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
              className="w-full rounded-lg border border-slate-200 px-3 py-3 text-center text-xl font-mono font-bold tracking-[0.5em] outline-none focus:border-softinsa-400 focus:ring-2 focus:ring-softinsa-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold uppercase text-slate-400">ou</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <CampoPassword
            label="Password Atual"
            value={password}
            onChange={setPassword}
            mostrar={verPassword}
            toggleMostrar={() => setVerPassword((v) => !v)}
          />
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onFechar} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => desativar.mutate()}
            disabled={!podeDesativar || desativar.isPending}
            className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {desativar.isPending ? 'A desativar...' : 'Desativar 2FA'}
          </button>
        </div>
      </div>
    </div>
  );
}
