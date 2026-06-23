import { LogOut } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/* Modal de confirmação de logout (reutilizável por todos os perfis). */
export function ConfirmarLogoutModal({ onConfirmar, onCancelar }) {
  const { t } = useLanguage();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      onClick={onCancelar}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50">
            <LogOut className="h-5 w-5 text-rose-500" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{t('sl_logout_titulo')}</h3>
            <p className="mt-0.5 text-sm text-slate-500">{t('sl_logout_desc')}</p>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t('sl_logout_cancelar')}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            {t('sl_logout_confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
}
