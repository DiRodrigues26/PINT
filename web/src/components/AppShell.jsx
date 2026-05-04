import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Award,
  Bell,
  CalendarDays,
  Clock,
  FileText,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  TrendingUp,
  Trophy,
  Users,
  X,
} from 'lucide-react';

const ICONES = {
  grid: LayoutDashboard,
  users: Users,
  doc: FileText,
  pulse: Activity,
  trend: TrendingUp,
  calendar: CalendarDays,
  badge: Award,
  trophy: Trophy,
  clock: Clock,
  bell: Bell,
  info: Info,
  shield: Shield,
  logout: LogOut,
  x: X,
  menu: Menu,
};

export function ShellIcon({ nome, className = 'h-5 w-5' }) {
  const Componente = ICONES[nome] || LayoutDashboard;
  return <Componente className={className} aria-hidden="true" strokeWidth={1.8} />;
}

export function AppSidebar({ menu, ativo, onSelect, utilizador, onLogout }) {
  const perfis = utilizador?.perfis?.join(', ') || 'Utilizador';

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[260px] border-r border-slate-200 bg-white lg:block">
        <div className="flex h-[92px] items-center gap-3 border-b border-slate-200 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-softinsa-600 text-lg font-bold text-white">S</div>
          <div>
            <div className="text-sm font-bold text-softinsa-700">Softinsa</div>
            <div className="text-xs text-slate-500">Badges Platform</div>
          </div>
        </div>
        <nav className="h-[calc(100vh-224px)] overflow-y-auto px-4 py-6">
          <div className="space-y-1">
            {menu.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onSelect(item.chave)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                  ativo === item.chave
                    ? 'bg-[#eaf3ff] text-softinsa-700 shadow-[inset_3px_0_0_#39639c]'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-softinsa-700'
                }`}
              >
                <ShellIcon nome={item.icon} className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 px-5 py-5">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-softinsa-300 hover:bg-[#eaf3ff] hover:text-softinsa-700"
          >
            <ShellIcon nome="logout" className="h-4 w-4" />
            Terminar sessão
          </button>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {menu.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelect(item.chave)}
              className={`flex min-w-[76px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition ${
                ativo === item.chave
                  ? 'bg-[#eaf3ff] text-softinsa-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-softinsa-700'
              }`}
            >
              <ShellIcon nome={item.icon} className="h-5 w-5 shrink-0" />
              <span className="line-clamp-1 max-w-[68px]">{item.label.replace('Gestão de ', '')}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

export function AppTopbar({ titulo, subtitulo, utilizador, onLogout }) {
  const [aberto, setAberto] = useState(false);
  const perfis = utilizador?.perfis?.join(', ') || 'Utilizador';

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-[#dceefa]/95 backdrop-blur">
      <div className="flex h-[92px] items-center justify-between px-5 lg:px-10">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{titulo}</h1>
          <p className="mt-1 text-sm text-slate-600">{subtitulo}</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-3 text-lg sm:flex">
            <span title="Português" aria-label="Português" className="leading-none">🇵🇹</span>
            <span title="English" aria-label="English" className="leading-none opacity-70">🇬🇧</span>
            <span title="Español" aria-label="Español" className="leading-none opacity-70">🇪🇸</span>
          </div>
          <Link to="/notificacoes" className="relative text-slate-700 hover:text-softinsa-700" aria-label="Notificações">
            <ShellIcon nome="bell" />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setAberto((valor) => !valor)}
              className="flex items-center gap-3 rounded-full pr-1 transition hover:bg-white/40"
              aria-haspopup="menu"
              aria-expanded={aberto}
            >
              <span className="hidden text-sm font-semibold text-slate-900 sm:block">{utilizador?.nome || 'Admin'}</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {(utilizador?.nome || 'Admin').slice(0, 2).toUpperCase()}
              </span>
            </button>

            {aberto && (
              <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg" role="menu">
                <div className="border-b border-slate-100 px-4 py-4">
                  <div className="truncate text-sm font-bold text-slate-900">{utilizador?.nome || 'Utilizador'}</div>
                  <div className="mt-1 truncate text-xs text-slate-500">{utilizador?.email || '-'}</div>
                  <div className="mt-2 inline-flex rounded-full bg-[#eaf3ff] px-3 py-1 text-xs font-semibold text-softinsa-700">
                    {perfis}
                  </div>
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-softinsa-700"
                  onClick={() => {
                    setAberto(false);
                    onLogout?.();
                  }}
                >
                  <ShellIcon nome="logout" className="h-4 w-4" />
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
