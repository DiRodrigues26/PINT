import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, FileText, Award, BarChart3, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../lib/api';
import { UserMenu } from './UserMenu';
import { ConfirmarLogoutModal } from './ConfirmarLogoutModal';

const MENU = [
  { key: 'dashboard',     to: '/tm/dashboard',    icon: LayoutDashboard },
  { key: 'candidaturas',  to: '/tm/candidaturas', icon: FileText },
  { key: 'tm_badges',     to: '/tm/badges',       icon: Award },
  { key: 'tm_relatorios', to: '/tm/relatorios',   icon: BarChart3 },
  { key: 'notificacoes',  to: '/tm/notificacoes', icon: Bell },
  { key: 'perfil',        to: '/tm/perfil',       icon: User },
];

export function TalentManagerSidebar() {
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
      {/* Desktop sidebar (branca) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[240px] flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-[88px] items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-softinsa-700 text-base font-bold text-white">S</div>
          <div>
            <div className="text-sm font-bold text-slate-800">Softinsa</div>
            <div className="text-[11px] text-slate-400">Badges Platform</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {MENU.map(({ key, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-softinsa-50 text-softinsa-700'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                <span>{t(key)}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={() => setConfirmarLogout(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-softinsa-300 hover:bg-[#eaf3ff] hover:text-softinsa-700"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.8} />
            {t('admin_logout_title')}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {MENU.map(({ key, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium transition ${
                  isActive ? 'bg-softinsa-50 text-softinsa-700' : 'text-slate-500 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
              <span className="line-clamp-1 max-w-[60px] text-center">{t(key)}</span>
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

export function TalentManagerTopbar({ titulo = 'Dashboard Talent Manager', subtitulo }) {
  const { utilizador, logout } = useAuth();
  const { idioma, mudarIdioma } = useLanguage();
  const navigate = useNavigate();
  const nome = utilizador?.nome || 'Utilizador';
  const perfilLabel = utilizador?.perfis?.join(', ') || 'Talent Manager';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const IDIOMAS = ['pt', 'en', 'es'];

  const { data: notifData } = useQuery({
    queryKey: ['tm-notif-nao-lidas'],
    queryFn: async () => { const { data } = await api.get('/api/notificacoes?por_pagina=1'); return data; },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const naoLidas = notifData?.nao_lidas ?? 0;

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-[#e8f1fc] to-[#f4f9ff]">
      <div className="flex h-[88px] items-center justify-between px-5 lg:px-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{titulo}</h1>
          {subtitulo && <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p>}
        </div>
        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-2 text-sm font-semibold sm:flex">
            {IDIOMAS.map((lang, i) => (
              <span key={lang} className="flex items-center gap-2">
                {i > 0 && <span className="h-4 w-px bg-slate-300" />}
                <button
                  type="button"
                  onClick={() => mudarIdioma(lang)}
                  className={`transition ${idioma === lang ? 'text-softinsa-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {lang.toUpperCase()}
                </button>
              </span>
            ))}
          </div>
          <NavLink to="/tm/notificacoes" className="relative text-slate-500 hover:text-slate-800" aria-label="Notificações">
            <Bell className="h-5 w-5" strokeWidth={1.8} />
            {naoLidas > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {naoLidas > 9 ? '9+' : naoLidas}
              </span>
            )}
          </NavLink>
          <div className="hidden text-sm font-semibold text-slate-700 sm:block">{nome}</div>
          <UserMenu utilizador={utilizador} perfilLabel={perfilLabel} profileTo="/tm/perfil" onLogout={handleLogout} />
        </div>
      </div>
    </header>
  );
}
