import { useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppSidebar, AppTopbar, ShellIcon } from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const ADMIN_MENU = [
  { chave: 'dashboard', labelKey: 'admin_menu_dashboard', icon: 'grid', to: '/admin', end: true },
  { chave: 'candidaturas', labelKey: 'admin_menu_candidaturas', icon: 'doc', to: '/admin/candidaturas' },
  { chave: 'utilizadores', labelKey: 'admin_menu_utilizadores', shortKey: 'admin_short_utilizadores', icon: 'users', to: '/admin/utilizadores' },
  { chave: 'learning-paths', labelKey: 'admin_menu_learning_paths', shortKey: 'admin_short_learning_paths', icon: 'doc', to: '/admin/learning-paths' },
  { chave: 'service-lines', labelKey: 'admin_menu_service_lines', shortKey: 'admin_short_service_lines', icon: 'pulse', to: '/admin/service-lines' },
  { chave: 'areas', labelKey: 'admin_menu_areas', shortKey: 'admin_short_areas', icon: 'doc', to: '/admin/areas' },
  { chave: 'niveis', labelKey: 'admin_menu_niveis', shortKey: 'admin_short_niveis', icon: 'trend', to: '/admin/niveis' },
  { chave: 'badges', labelKey: 'admin_menu_badges', shortKey: 'admin_short_badges', icon: 'badge', to: '/admin/badges' },
  { chave: 'requisitos', labelKey: 'admin_menu_requisitos', shortKey: 'admin_short_requisitos', icon: 'doc', to: '/admin/requisitos' },
  { chave: 'eventos', labelKey: 'admin_menu_eventos', shortKey: 'admin_short_eventos', icon: 'calendar', to: '/admin/eventos' },
  { chave: 'pontos', labelKey: 'admin_menu_pontos', shortKey: 'admin_short_pontos', icon: 'trophy', to: '/admin/pontos' },
  { chave: 'sla', labelKey: 'admin_menu_sla', shortKey: 'admin_short_sla', icon: 'clock', to: '/admin/sla' },
  { chave: 'notificacoes', labelKey: 'admin_menu_notificacoes', icon: 'bell', to: '/admin/notificacoes' },
  { chave: 'relatorios', labelKey: 'admin_menu_relatorios', shortKey: 'admin_short_relatorios', icon: 'trend', to: '/admin/relatorios' },
  { chave: 'avisos', labelKey: 'admin_menu_avisos', shortKey: 'admin_short_avisos', icon: 'info', to: '/admin/avisos' },
  { chave: 'rgpd', labelKey: 'admin_menu_rgpd', shortKey: 'admin_short_rgpd', icon: 'shield', to: '/admin/rgpd' },
  { chave: 'perfil', labelKey: 'admin_menu_perfil', icon: 'users', to: '/admin/perfil' },
];

export function caminhoAdmin(chave) {
  return ADMIN_MENU.find((item) => item.chave === chave)?.to || '/admin';
}

function saudacaoKey() {
  const h = new Date().getHours();
  if (h < 12) return 'admin_greeting_morning';
  if (h < 20) return 'admin_greeting_afternoon';
  return 'admin_greeting_night';
}

function secaoPorPath(pathname) {
  const segmentos = pathname.split('/').filter(Boolean);
  return segmentos[0] === 'admin' && segmentos[1] ? segmentos[1] : 'dashboard';
}

function mainClass(vistaAtiva) {
  if (vistaAtiva === 'utilizadores') return 'max-w-[1720px] px-5 lg:px-8 xl:px-10';
  if (vistaAtiva === 'pontos') return 'max-w-[1660px] px-5 lg:px-8 xl:px-10';
  if (['candidaturas', 'learning-paths', 'service-lines', 'areas', 'niveis', 'badges', 'eventos', 'requisitos', 'sla', 'avisos', 'rgpd'].includes(vistaAtiva)) {
    return 'max-w-[1560px] px-5 lg:px-10 xl:px-16';
  }
  return 'max-w-[1760px] px-5 lg:px-8 xl:px-10 2xl:px-12';
}

export default function AdminLayout() {
  const { utilizador, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mostrarLogout, setMostrarLogout] = useState(false);

  const vistaAtiva = secaoPorPath(location.pathname);
  const menuTraduzido = useMemo(
    () => ADMIN_MENU.map((item) => ({
      ...item,
      label: t(item.labelKey),
      mobileLabel: item.shortKey ? t(item.shortKey) : t(item.labelKey),
    })),
    [t],
  );
  const vista = useMemo(
    () => menuTraduzido.find((item) => item.chave === vistaAtiva),
    [menuTraduzido, vistaAtiva],
  );

  if (!vista) {
    return <Navigate to="/admin" replace />;
  }

  function confirmarLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  let subtitulo;
  if (vistaAtiva === 'dashboard') {
    subtitulo = t('admin_subtitle_dashboard');
  } else if (location.pathname.replace(/\/$/, '').endsWith('/notificacoes/definicoes')) {
    subtitulo = t('admin_subtitle_notif_settings');
  } else {
    subtitulo = `${vista.label} - ${t('admin_role_long')}`;
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-slate-900">
      <AppSidebar
        menu={menuTraduzido}
        ativo={vistaAtiva}
        onSelect={(chave) => navigate(caminhoAdmin(chave))}
        utilizador={utilizador}
        onLogout={() => setMostrarLogout(true)}
      />
      <div className="lg:pl-[260px]">
        <AppTopbar
          titulo={`${t(saudacaoKey())}, ${t('admin_role_short')}!`}
          subtitulo={subtitulo}
          utilizador={utilizador}
          onLogout={() => setMostrarLogout(true)}
          notificacoesTo="/admin/notificacoes"
        />
        <main className={`mx-auto pb-28 pt-8 lg:pb-8 ${mainClass(vistaAtiva)}`}>
          <Outlet />
        </main>
      </div>

      {mostrarLogout && (
        <div className="fixed inset-x-0 -top-8 bottom-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 pt-8">
          <section className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-bold text-slate-900">{t('admin_logout_title')}</h2>
              <button
                type="button"
                onClick={() => setMostrarLogout(false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label={t('admin_close')}
              >
                <ShellIcon nome="x" className="h-7 w-7" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-slate-600">{t('admin_logout_question')}</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button type="button" className="btn-secondary" onClick={() => setMostrarLogout(false)}>
                {t('admin_cancel')}
              </button>
              <button type="button" className="btn-primary" onClick={confirmarLogout}>
                {t('admin_logout_title')}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
