import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Award, Users, BarChart2, Trophy, Bell, User, LogOut, History, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { saudacaoTexto } from '../lib/saudacao';
import { UserMenu } from './UserMenu';
import { ConfirmarLogoutModal } from './ConfirmarLogoutModal';

const MENU_KEYS = [
  { key: 'sl_menu_dashboard',  to: '/sl/dashboard',     icon: LayoutDashboard },
  { key: 'sl_menu_pedidos',    to: '/sl/pedidos',       icon: FileText },
  { key: 'sl_menu_badges',     to: '/sl/badges',        icon: Award },
  { key: 'sl_menu_consult',    to: '/sl/consultores',   icon: Users },
  { key: 'sl_menu_historico',  to: '/sl/historico',     icon: History },
  { key: 'sl_menu_conquistas', to: '/sl/conquistas',    icon: Star },
  { key: 'sl_menu_relatorios', to: '/sl/relatorios',    icon: BarChart2 },
  { key: 'sl_menu_ranking',    to: '/sl/ranking',       icon: Trophy },
  { key: 'notificacoes',       to: '/sl/notificacoes',  icon: Bell },
  { key: 'perfil',             to: '/sl/perfil',        icon: User },
];

export function ServiceLineSidebar() {
  const { utilizador, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [confirmarLogout, setConfirmarLogout] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[260px] bg-softinsa-gradient lg:flex lg:flex-col">
        <div className="flex h-[72px] items-center gap-3 px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 text-base font-bold text-white">S</div>
          <div>
            <div className="text-sm font-bold text-white">Softinsa</div>
            <div className="text-[11px] text-white/60">Badges Platform</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            {MENU_KEYS.map(({ key, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-white/15 text-white shadow-[inset_3px_0_0_rgba(255,255,255,0.7)]'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                <span>{t(key)}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="border-t border-white/10 px-5 py-5">
          <div className="truncate text-sm font-semibold text-white">{utilizador?.nome || 'Utilizador'}</div>
          <div className="mt-0.5 truncate text-[11px] text-white/50">{utilizador?.email || '-'}</div>
          <div className="mt-1.5 truncate text-[11px] font-medium text-white/60">Service Line</div>
          <button
            type="button"
            onClick={() => setConfirmarLogout(true)}
            className="mt-4 flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white transition"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.8} />
            {t('terminar_sessao')}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {MENU_KEYS.map(({ key, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-w-[60px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium transition ${
                  isActive ? 'bg-softinsa-100 text-softinsa-700' : 'text-slate-600 hover:bg-slate-50 hover:text-softinsa-700'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
              <span className="line-clamp-1 max-w-[56px] text-center">{t(key)}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {confirmarLogout && (
        <ConfirmarLogoutModal
          onConfirmar={() => { setConfirmarLogout(false); handleLogout(); }}
          onCancelar={() => setConfirmarLogout(false)}
        />
      )}
    </>
  );
}

export function ServiceLineTopbar({ subtitulo }) {
  const { utilizador, logout } = useAuth();
  const { idioma, mudarIdioma, t } = useLanguage();
  const navigate = useNavigate();
  const nome = utilizador?.nome || 'Utilizador';
  const saudacao = `${saudacaoTexto(t)}, ${nome}!`;
  const perfilLabel = utilizador?.perfis?.join(', ') || 'Service Line';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const IDIOMAS = ['pt', 'en', 'es'];

  return (
    <header className="sticky top-0 z-10 bg-softinsa-gradient">
      <div className="flex h-[72px] items-center justify-between gap-3 px-5 lg:px-8">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-white sm:text-lg">{saudacao}</h1>
          {subtitulo && <p className="mt-0.5 truncate text-xs text-white/60">{subtitulo}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <div className="hidden items-center gap-2 text-sm font-semibold sm:flex">
            {IDIOMAS.map((lang, i) => (
              <span key={lang} className="flex items-center gap-2">
                {i > 0 && <span className="h-4 w-px bg-white/30" />}
                <button
                  type="button"
                  onClick={() => mudarIdioma(lang)}
                  className={`transition ${idioma === lang ? 'text-white' : 'text-white/40 hover:text-white/80'}`}
                >
                  {lang.toUpperCase()}
                </button>
              </span>
            ))}
          </div>
          <NavLink to="/sl/notificacoes" className="relative text-white/70 hover:text-white" aria-label="Notificações">
            <Bell className="h-5 w-5" strokeWidth={1.8} />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
          </NavLink>
          <div className="hidden text-sm font-semibold text-white sm:block">{nome}</div>
          <UserMenu utilizador={utilizador} perfilLabel={perfilLabel} onLogout={handleLogout} />
        </div>
      </div>
    </header>
  );
}
