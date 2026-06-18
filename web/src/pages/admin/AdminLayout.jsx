import { useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppSidebar, AppTopbar, ShellIcon } from '../../components/AppShell';
import { useAuth } from '../../context/AuthContext';

export const ADMIN_MENU = [
  { chave: 'dashboard', label: 'Dashboard', icon: 'grid', to: '/admin', end: true },
  { chave: 'candidaturas', label: 'Pedidos de Badges', icon: 'doc', to: '/admin/candidaturas' },
  { chave: 'utilizadores', label: 'Gestão de Utilizadores', icon: 'users', to: '/admin/utilizadores' },
  { chave: 'learning-paths', label: 'Gestão de Learning Paths', icon: 'doc', to: '/admin/learning-paths' },
  { chave: 'service-lines', label: 'Gestão de Service Lines', icon: 'pulse', to: '/admin/service-lines' },
  { chave: 'areas', label: 'Gestão de Áreas', icon: 'doc', to: '/admin/areas' },
  { chave: 'niveis', label: 'Gestão de Níveis', icon: 'trend', to: '/admin/niveis' },
  { chave: 'badges', label: 'Gestão de Badges', icon: 'badge', to: '/admin/badges' },
  { chave: 'requisitos', label: 'Gestão de Requisitos', icon: 'doc', to: '/admin/requisitos' },
  { chave: 'eventos', label: 'Gestão de Eventos Especiais', icon: 'calendar', to: '/admin/eventos' },
  { chave: 'pontos', label: 'Gestão de Pontos', icon: 'trophy', to: '/admin/pontos' },
  { chave: 'sla', label: 'Gestão de SLA', icon: 'clock', to: '/admin/sla' },
  { chave: 'notificacoes', label: 'Notificações', icon: 'bell', to: '/admin/notificacoes' },
  { chave: 'relatorios', label: 'Relatórios e Exportações', icon: 'trend', to: '/admin/relatorios' },
  { chave: 'avisos', label: 'Informações/Avisos', icon: 'info', to: '/admin/avisos' },
  { chave: 'rgpd', label: 'Configuração RGPD', icon: 'shield', to: '/admin/rgpd' },
  { chave: 'perfil', label: 'Perfil', icon: 'users', to: '/admin/perfil' },
];

export function caminhoAdmin(chave) {
  return ADMIN_MENU.find((item) => item.chave === chave)?.to || '/admin';
}

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 20) return 'Boa tarde';
  return 'Boa noite';
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
  const navigate = useNavigate();
  const location = useLocation();
  const [mostrarLogout, setMostrarLogout] = useState(false);

  const vistaAtiva = secaoPorPath(location.pathname);
  const vista = useMemo(
    () => ADMIN_MENU.find((item) => item.chave === vistaAtiva),
    [vistaAtiva],
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
    subtitulo = 'Dashboard - Administrador';
  } else if (location.pathname.replace(/\/$/, '').endsWith('/notificacoes/definicoes')) {
    subtitulo = 'Definições de Notificações - Administrador';
  } else {
    subtitulo = `${vista.label} - Administrador`;
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-slate-900">
      <AppSidebar
        menu={ADMIN_MENU}
        ativo={vistaAtiva}
        onSelect={(chave) => navigate(caminhoAdmin(chave))}
        utilizador={utilizador}
        onLogout={() => setMostrarLogout(true)}
      />
      <div className="lg:pl-[260px]">
        <AppTopbar
          titulo={`${saudacao()}, Admin!`}
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
              <h2 className="text-2xl font-bold text-slate-900">Terminar sessão</h2>
              <button
                type="button"
                onClick={() => setMostrarLogout(false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Fechar"
              >
                <ShellIcon nome="x" className="h-7 w-7" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-slate-600">Pretende terminar a sua sessão?</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button type="button" className="btn-secondary" onClick={() => setMostrarLogout(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={confirmarLogout}>
                Terminar sessão
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
