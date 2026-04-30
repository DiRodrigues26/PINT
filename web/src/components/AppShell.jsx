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
  x: X,
};

export function ShellIcon({ nome, className = 'h-5 w-5' }) {
  const Componente = ICONES[nome] || LayoutDashboard;
  return <Componente className={className} aria-hidden="true" strokeWidth={1.8} />;
}

export function AppSidebar({ menu, ativo, onSelect, utilizador, onLogout }) {
  const perfis = utilizador?.perfis?.join(', ') || 'Utilizador';

  return (
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
        <div className="truncate text-sm font-bold text-slate-900">{utilizador?.nome || 'Utilizador'}</div>
        <div className="mt-1 truncate text-xs text-slate-500">{utilizador?.email || '-'}</div>
        <div className="mt-2 truncate text-xs font-medium text-softinsa-600">{perfis}</div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-4 w-full text-center text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-softinsa-700"
        >
          Terminar sessão
        </button>
      </div>
    </aside>
  );
}

export function AppTopbar({ titulo, subtitulo, utilizador }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-[#dceefa]/95 backdrop-blur">
      <div className="flex h-[92px] items-center justify-between px-5 lg:px-10">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{titulo}</h1>
          <p className="mt-1 text-sm text-slate-600">{subtitulo}</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-2 text-sm font-semibold sm:flex">
            <span className="text-softinsa-600">PT</span>
            <span className="h-5 w-px bg-slate-300" />
            <span className="text-slate-500">EN</span>
            <span className="h-5 w-px bg-slate-300" />
            <span className="text-slate-500">ES</span>
          </div>
          <Link to="/notificacoes" className="relative text-slate-700 hover:text-softinsa-700" aria-label="Notificações">
            <ShellIcon nome="bell" />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
          </Link>
          <div className="hidden text-sm font-semibold text-slate-900 sm:block">{utilizador?.nome || 'Admin'}</div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            {(utilizador?.nome || 'Admin').slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
