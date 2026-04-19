import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ITENS_MENU = [
  { para: '/', label: 'Dashboard', emoji: '📊' },
  { para: '/badges', label: 'Badges', emoji: '🏅' },
  { para: '/candidaturas', label: 'Candidaturas', emoji: '📝' },
  { para: '/meus-badges', label: 'Os meus badges', emoji: '🎖️' },
  { para: '/conquistas', label: 'Conquistas', emoji: '🏆' },
  { para: '/notificacoes', label: 'Notificações', emoji: '🔔' },
  { para: '/admin', label: 'Administração', emoji: '⚙️', perfis: ['Administrador'] },
  { para: '/gestao', label: 'Gestão', emoji: '🧭', perfis: ['Administrador', 'Talent Manager', 'Service Line'] },
];

export default function Layout() {
  const { utilizador, logout, temPerfil } = useAuth();
  const navigate = useNavigate();

  function sair() {
    logout();
    navigate('/login');
  }

  const itensVisiveis = ITENS_MENU.filter((i) => !i.perfis || temPerfil(...i.perfis));

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-xl font-extrabold text-white">Softinsa</div>
          <div className="text-xs text-softinsa-300">Plataforma de Badges</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {itensVisiveis.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end={item.para === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-softinsa-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="text-sm font-semibold text-white truncate">{utilizador?.nome}</div>
          <div className="text-xs text-slate-400 truncate">{utilizador?.email}</div>
          <div className="mt-2 text-xs text-softinsa-300">
            {utilizador?.perfis?.join(', ')}
          </div>
          <button onClick={sair} className="mt-3 w-full text-xs text-slate-300 hover:text-white underline">
            Terminar sessão
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
