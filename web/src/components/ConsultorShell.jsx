import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, Bell, BookOpen, FileText, LayoutDashboard, ListTodo, LogOut, Target, Trophy, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../lib/api';
import { saudacaoTexto } from '../lib/saudacao';
import { UserMenu } from './UserMenu';
import { ConfirmarLogoutModal } from './ConfirmarLogoutModal';

export function ConsultorSidebar() {
  const { utilizador, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [confirmarLogout, setConfirmarLogout] = useState(false);

  const MENU = [
    { labelKey: 'dashboard',    to: '/dashboard',    icon: LayoutDashboard },
    { labelKey: 'catalogo',     to: '/badges',       icon: BookOpen },
    { labelKey: 'meus_badges',  to: '/meus-badges',  icon: Award },
    { labelKey: 'candidaturas', to: '/candidaturas', icon: FileText },
    { labelKey: 'conquistas',   to: '/conquistas',   icon: Trophy },
    { labelKey: 'objetivos',     to: '/objetivos',    icon: Target },
    { labelKey: 'tab_lembretes', to: '/lembretes',    icon: ListTodo },
    { labelKey: 'notificacoes', to: '/notificacoes', icon: Bell },
    { labelKey: 'perfil',       to: '/perfil',       icon: User },
  ];

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
            {MENU.map(({ labelKey, label, to, icon: Icon }) => (
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
                <span>{label || t(labelKey)}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="border-t border-white/10 px-5 py-5">
          <button
            type="button"
            onClick={() => setConfirmarLogout(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/15 hover:text-white"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.8} />
            {t('admin_logout_title')}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {MENU.map(({ labelKey, label, to, icon: Icon }) => (
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
              <span className="line-clamp-1 max-w-[56px] text-center">{label || t(labelKey)}</span>
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

export function ConsultorTopbar({ subtitulo }) {
  const { utilizador, logout } = useAuth();
  const { idioma, mudarIdioma, t } = useLanguage();
  const navigate = useNavigate();
  const nome = utilizador?.nome || 'Utilizador';
  const saudacao = `${saudacaoTexto(t)}, ${nome}!`;
  const perfilLabel = utilizador?.perfis?.join(', ') || 'Consultor';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const IDIOMAS = ['pt', 'en', 'es'];

  /* Contador de notificações não lidas — só mostra o indicador se houver */
  const { data: notifData } = useQuery({
    queryKey: ['notificacoes-nao-lidas'],
    queryFn: async () => { const { data } = await api.get('/api/notificacoes?por_pagina=1'); return data; },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const naoLidas = notifData?.nao_lidas ?? 0;

  return (
    <header className="sticky top-0 z-10 bg-softinsa-gradient">
      <div className="flex h-[72px] items-center justify-between px-5 lg:px-8">
        <div>
          <h1 className="text-lg font-bold text-white">{saudacao}</h1>
          {subtitulo && <p className="mt-0.5 text-xs text-white/60">{subtitulo}</p>}
        </div>
        <div className="flex items-center gap-5">
          {/* Seletor de idioma funcional */}
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

          <NavLink to="/notificacoes" className="relative text-white/70 hover:text-white" aria-label="Notificações">
            <Bell className="h-5 w-5" strokeWidth={1.8} />
            {naoLidas > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {naoLidas > 9 ? '9+' : naoLidas}
              </span>
            )}
          </NavLink>
          <div className="hidden text-sm font-semibold text-white sm:block">{nome}</div>
          <UserMenu utilizador={utilizador} perfilLabel={perfilLabel} profileTo="/perfil" onLogout={handleLogout} />
        </div>
      </div>
    </header>
  );
}
