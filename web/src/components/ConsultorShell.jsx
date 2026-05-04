import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Award, Bell, BookOpen, FileText, LayoutDashboard, LogOut, Trophy, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MENU = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Catálogo de Badges', to: '/badges', icon: BookOpen },
  { label: 'Os Meus Badges', to: '/meus-badges', icon: Award },
  { label: 'Candidaturas', to: '/candidaturas', icon: FileText },
  { label: 'Conquistas', to: '/conquistas', icon: Trophy },
  { label: 'Notificações', to: '/notificacoes', icon: Bell },
  { label: 'Perfil', to: '/perfil', icon: User },
];

function getSaudacao(nome) {
  const h = new Date().getHours();
  const cumprimento = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  return `${cumprimento}, ${nome}!`;
}

export function ConsultorSidebar() {
  const { utilizador, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[260px] bg-softinsa-gradient lg:flex lg:flex-col">
        {/* Logo */}
        <div className="flex h-[72px] items-center gap-3 px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 text-base font-bold text-white">
            S
          </div>
          <div>
            <div className="text-sm font-bold text-white">Softinsa</div>
            <div className="text-[11px] text-white/60">Badges Platform</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            {MENU.map(({ label, to, icon: Icon }) => (
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
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 px-5 py-5">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/75 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.8} />
            Terminar sessão
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {MENU.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-w-[60px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium transition ${
                  isActive
                    ? 'bg-softinsa-100 text-softinsa-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-softinsa-700'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
              <span className="line-clamp-1 max-w-[56px] text-center">{label.replace('Catálogo de ', '')}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}

export function ConsultorTopbar({ subtitulo }) {
  const { utilizador, logout } = useAuth();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const nome = utilizador?.nome || 'Utilizador';
  const perfis = utilizador?.perfis?.join(', ') || 'Consultor';
  const saudacao = getSaudacao(nome);
  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  function handleLogout() {
    setAberto(false);
    logout();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-10 bg-softinsa-gradient">
      <div className="flex h-[72px] items-center justify-between px-5 lg:px-8">
        <div>
          <h1 className="text-lg font-bold text-white">{saudacao}</h1>
          {subtitulo && <p className="mt-0.5 text-xs text-white/60">{subtitulo}</p>}
        </div>
        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-3 text-lg sm:flex">
            <span title="Português" aria-label="Português" className="leading-none">🇵🇹</span>
            <span title="English" aria-label="English" className="leading-none opacity-70">🇬🇧</span>
            <span title="Español" aria-label="Español" className="leading-none opacity-70">🇪🇸</span>
          </div>
          <NavLink to="/notificacoes" className="relative text-white/70 hover:text-white" aria-label="Notificações">
            <Bell className="h-5 w-5" strokeWidth={1.8} />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
          </NavLink>
          <div className="relative">
            <button
              type="button"
              onClick={() => setAberto((valor) => !valor)}
              className="flex items-center gap-3 rounded-full border border-transparent px-2.5 py-1.5 transition hover:border-white/20 hover:bg-white/10 hover:shadow-sm"
              aria-haspopup="menu"
              aria-expanded={aberto}
            >
              <span className="hidden max-w-[180px] truncate pl-1 text-sm font-semibold text-white sm:block">{nome}</span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-softinsa-500 text-sm font-bold text-white">
                {iniciais}
              </span>
            </button>

            {aberto && (
              <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-xl border border-white/10 bg-slate-950 text-white shadow-lg" role="menu">
                <div className="border-b border-white/10 px-4 py-4">
                  <div className="truncate text-sm font-bold">{nome}</div>
                  <div className="mt-1 truncate text-xs text-white/55">{utilizador?.email || '-'}</div>
                  <div className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                    {perfis}
                  </div>
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.8} />
                  Terminar sessão
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
