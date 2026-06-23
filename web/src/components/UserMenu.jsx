import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ConfirmarLogoutModal } from './ConfirmarLogoutModal';

export function UserMenu({ utilizador, perfilLabel, onLogout }) {
  const [aberto, setAberto] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const { t } = useLanguage();
  const nome = utilizador?.nome || 'Utilizador';
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('');

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-softinsa-500 text-sm font-bold text-white transition hover:bg-softinsa-400"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={nome}
      >
        {iniciais}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute right-0 z-20 mt-3 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg" role="menu">
            <div className="border-b border-slate-100 px-4 py-4">
              <div className="truncate text-sm font-bold text-slate-900">{nome}</div>
              <div className="mt-1 truncate text-xs text-slate-500">{utilizador?.email || '-'}</div>
              <div className="mt-2 inline-flex rounded-full bg-[#eaf3ff] px-3 py-1 text-xs font-semibold text-softinsa-700">
                {perfilLabel}
              </div>
            </div>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-softinsa-700"
              onClick={() => {
                setAberto(false);
                setConfirmar(true);
              }}
            >
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
              {t('terminar_sessao')}
            </button>
          </div>
        </>
      )}

      {confirmar && (
        <ConfirmarLogoutModal
          onConfirmar={() => { setConfirmar(false); onLogout?.(); }}
          onCancelar={() => setConfirmar(false)}
        />
      )}
    </div>
  );
}
