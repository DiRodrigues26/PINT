import { LogOut, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/* Modal de confirmação de logout (reutilizável por todos os perfis). */
export function ConfirmarLogoutModal({ onConfirmar, onCancelar }) {
  const { t } = useLanguage();

  return (
    <div
      className="fixed inset-x-0 -top-8 bottom-0 z-[60] flex items-center justify-center bg-slate-950/85 px-4 pt-8"
      onClick={onCancelar}
    >
      <section
        className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50">
              <LogOut className="h-5 w-5 text-rose-500" strokeWidth={1.8} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{t('admin_logout_title')}</h2>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            className="text-slate-400 hover:text-slate-700"
            aria-label={t('admin_close')}
          >
            <X className="h-7 w-7" strokeWidth={1.8} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-slate-600">{t('admin_logout_question')}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t('sl_logout_desc')}</p>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onCancelar} className="btn-secondary">
            {t('admin_cancel')}
          </button>
          <button type="button" onClick={onConfirmar} className="btn-primary">
            {t('admin_logout_title')}
          </button>
        </div>
      </section>
    </div>
  );
}
