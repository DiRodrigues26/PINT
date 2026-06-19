import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import RotaProtegida from './components/RotaProtegida';
import { useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';
import Registo from './pages/auth/Registo';
import VerificarEmail from './pages/auth/VerificarEmail';
import ConfirmarEmail from './pages/auth/ConfirmarEmail';
import CompletarPerfil from './pages/auth/CompletarPerfil';
import RecuperarPassword from './pages/auth/RecuperarPassword';
import NovaPassword from './pages/auth/NovaPassword';
import AlterarPasswordInicial from './pages/auth/AlterarPasswordInicial';
import AdminAreas from './pages/admin/AdminAreas';
import AdminAvisos from './pages/admin/AdminAvisos';
import AdminBadges from './pages/admin/AdminBadges';
import AdminCandidaturas from './pages/admin/AdminCandidaturas';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEventosEspeciais from './pages/admin/AdminEventosEspeciais';
import AdminLayout from './pages/admin/AdminLayout';
import AdminLearningPaths from './pages/admin/AdminLearningPaths';
import AdminNiveis from './pages/admin/AdminNiveis';
import AdminNotificacoes from './pages/admin/AdminNotificacoes';
import AdminNotificacoesDefinicoes from './pages/admin/AdminNotificacoesDefinicoes';
import AdminPerfil from './pages/admin/AdminPerfil';
import AdminRelatorios from './pages/admin/AdminRelatorios';
import AdminPontos from './pages/admin/AdminPontos';
import AdminRequisitos from './pages/admin/AdminRequisitos';
import AdminRGPD from './pages/admin/AdminRGPD';
import AdminServiceLines from './pages/admin/AdminServiceLines';
import AdminSLA from './pages/admin/AdminSLA';
import AdminUtilizadores from './pages/admin/AdminUtilizadores';
import ServiceLineDashboard from './pages/serviceLine/Dashboard';
import ServiceLinePerfil from './pages/serviceLine/Perfil';
import ServiceLineNotificacoes from './pages/serviceLine/Notificacoes';
import ServiceLinePedidos from './pages/serviceLine/Pedidos';
import ServiceLinePedidoDetalhe from './pages/serviceLine/PedidoDetalhe';
import ServiceLineBadges from './pages/serviceLine/Badges';
import ServiceLineBadgeDetalhe from './pages/serviceLine/BadgeDetalhe';
import ServiceLineConsultores from './pages/serviceLine/Consultores';
import ServiceLineConsultorPerfil from './pages/serviceLine/ConsultorPerfil';
import ServiceLineRelatorios from './pages/serviceLine/Relatorios';
import ServiceLineRanking from './pages/serviceLine/RankingPontos';
import ServiceLineHistorico from './pages/serviceLine/Historico';
import ServiceLineConquistas from './pages/serviceLine/Conquistas';
import ConsultorDashboard from './pages/consultor/Dashboard';
import CatalogoBadges from './pages/consultor/CatalogoBadges';
import MeusBadges from './pages/consultor/MeusBadges';
import Candidaturas from './pages/consultor/Candidaturas';
import CandidaturaDetalhe from './pages/consultor/CandidaturaDetalhe';
import Conquistas from './pages/consultor/Conquistas';
import Notificacoes from './pages/consultor/Notificacoes';
import Perfil from './pages/consultor/Perfil';
import BadgeDetalhe from './pages/consultor/BadgeDetalhe';
import AssinaturaEmail from './pages/consultor/AssinaturaEmail';
import VerificarBadge from './pages/publico/VerificarBadge';
import PerfilPublico from './pages/publico/PerfilPublico';
import TalentDashboard from './pages/talentManager/Dashboard';
import TalentCandidaturas from './pages/talentManager/Candidaturas';
import TalentBadges from './pages/talentManager/Badges';
import TalentBadgeDetalhe from './pages/talentManager/BadgeDetalhe';
import TalentRelatorios from './pages/talentManager/Relatorios';
import TalentNotificacoes from './pages/talentManager/Notificacoes';
import TalentPerfil from './pages/talentManager/Perfil';
import TalentPedidos from './pages/talentManager/Pedidos';
import TalentPedidoDetalhe from './pages/talentManager/PedidoDetalhe';

function PerfilEmDesenvolvimento() {
  const { utilizador, logout } = useAuth();
  const navigate = useNavigate();
  const semPerfil = !utilizador?.perfis?.length;

  function terminarSessao() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f6fa] px-6 text-slate-900">
      <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-softinsa-600 text-lg font-bold text-white">
          S
        </div>
        <h1 className="mt-5 text-2xl font-bold">
          {semPerfil ? 'Conta sem perfil atribuído' : 'Perfil em desenvolvimento'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {semPerfil
            ? 'A tua conta ainda não tem um perfil (Consultor, Service Line, Talent Manager...). Termina sessão e completa o registo, ou pede ao administrador para te atribuir um perfil.'
            : `A experiência para o perfil ${utilizador?.perfis?.join(', ')} ainda está a ser construída.`}
        </p>
        <button
          type="button"
          onClick={terminarSessao}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-softinsa-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-softinsa-700"
        >
          Terminar sessão
        </button>
      </section>
    </div>
  );
}

function Inicio() {
  const { utilizador } = useAuth();
  if (utilizador?.perfis?.includes('Administrador')) {
    return <Navigate to="/admin" replace />;
  }
  if (utilizador?.perfis?.includes('Consultor')) {
    return <Navigate to="/dashboard" replace />;
  }
  if (utilizador?.perfis?.includes('Service Line')) {
    return <Navigate to="/sl/dashboard" replace />;
  }
  if (utilizador?.perfis?.includes('Talent Manager')) {
    return <Navigate to="/tm/dashboard" replace />;
  }
  return <PerfilEmDesenvolvimento />;
}

function AdminPontosRoute() {
  const navigate = useNavigate();

  return (
    <AdminPontos
      onEditarBadge={(idBadge) => navigate('/admin/badges', { state: { editarBadgeId: idBadge } })}
    />
  );
}

export default function App() {
  return (
    <Routes>
      {/* Páginas públicas (sem autenticação) */}
      <Route path="/verificar/:token" element={<VerificarBadge />} />
      <Route path="/perfil-publico/:slug" element={<PerfilPublico />} />

      <Route path="/login" element={<Login />} />
      <Route path="/registo" element={<Registo />} />
      <Route path="/verificar-email" element={<VerificarEmail />} />
      <Route path="/confirmar-email/:token" element={<ConfirmarEmail />} />
      <Route path="/completar-perfil/:token" element={<CompletarPerfil />} />
      <Route path="/recuperar" element={<RecuperarPassword />} />
      <Route path="/redefinir-password/:token" element={<NovaPassword />} />
      <Route path="/alterar-password-inicial" element={
        <RotaProtegida><AlterarPasswordInicial /></RotaProtegida>
      } />

      <Route path="/" element={<RotaProtegida><Inicio /></RotaProtegida>} />
      <Route path="/admin" element={
        <RotaProtegida perfis={['Administrador']}><AdminLayout /></RotaProtegida>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="candidaturas" element={<AdminCandidaturas />} />
        <Route path="utilizadores" element={<AdminUtilizadores />} />
        <Route path="learning-paths" element={<AdminLearningPaths />} />
        <Route path="service-lines" element={<AdminServiceLines />} />
        <Route path="areas" element={<AdminAreas />} />
        <Route path="niveis" element={<AdminNiveis />} />
        <Route path="badges" element={<AdminBadges />} />
        <Route path="requisitos" element={<AdminRequisitos />} />
        <Route path="eventos" element={<AdminEventosEspeciais />} />
        <Route path="pontos" element={<AdminPontosRoute />} />
        <Route path="sla" element={<AdminSLA />} />
        <Route path="notificacoes" element={<AdminNotificacoes />} />
        <Route path="notificacoes/definicoes" element={<AdminNotificacoesDefinicoes />} />
        <Route path="relatorios" element={<AdminRelatorios />} />
        <Route path="avisos" element={<AdminAvisos />} />
        <Route path="rgpd" element={<AdminRGPD />} />
        <Route path="perfil" element={<AdminPerfil />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
      {/* Rotas do Consultor */}
      <Route path="/dashboard" element={
        <RotaProtegida perfis={['Consultor']}><ConsultorDashboard /></RotaProtegida>
      } />
      <Route path="/badges" element={<RotaProtegida perfis={['Consultor']}><CatalogoBadges /></RotaProtegida>} />
      <Route path="/badges/:id" element={<RotaProtegida perfis={['Consultor']}><BadgeDetalhe /></RotaProtegida>} />
      <Route path="/candidaturas" element={<RotaProtegida perfis={['Consultor']}><Candidaturas /></RotaProtegida>} />
      <Route path="/candidaturas/nova" element={<Navigate to="/badges" replace />} />
      <Route path="/candidaturas/:id" element={<RotaProtegida perfis={['Consultor']}><CandidaturaDetalhe /></RotaProtegida>} />
      <Route path="/meus-badges" element={<RotaProtegida perfis={['Consultor']}><MeusBadges /></RotaProtegida>} />
      <Route path="/assinatura-email" element={<RotaProtegida perfis={['Consultor']}><AssinaturaEmail /></RotaProtegida>} />
      <Route path="/conquistas" element={<RotaProtegida perfis={['Consultor']}><Conquistas /></RotaProtegida>} />
      <Route path="/notificacoes" element={<RotaProtegida perfis={['Consultor']}><Notificacoes /></RotaProtegida>} />
      <Route path="/perfil" element={<RotaProtegida perfis={['Consultor']}><Perfil /></RotaProtegida>} />
      <Route path="/gestao" element={<RotaProtegida perfis={['Administrador']}><PerfilEmDesenvolvimento /></RotaProtegida>} />

      {/* Rotas da Service Line */}
      <Route path="/sl/dashboard" element={
        <RotaProtegida perfis={['Service Line']}><ServiceLineDashboard /></RotaProtegida>
      } />
      <Route path="/sl/perfil" element={
        <RotaProtegida perfis={['Service Line']}><ServiceLinePerfil /></RotaProtegida>
      } />
      <Route path="/sl/notificacoes" element={
        <RotaProtegida perfis={['Service Line']}><ServiceLineNotificacoes /></RotaProtegida>
      } />
      <Route path="/sl/pedidos" element={
        <RotaProtegida perfis={['Service Line']}><ServiceLinePedidos /></RotaProtegida>
      } />
      <Route path="/sl/pedidos/:id" element={
        <RotaProtegida perfis={['Service Line']}><ServiceLinePedidoDetalhe /></RotaProtegida>
      } />
      <Route path="/sl/badges" element={
        <RotaProtegida perfis={['Service Line']}><ServiceLineBadges /></RotaProtegida>
      } />
      <Route path="/sl/badges/:id" element={
        <RotaProtegida perfis={['Service Line']}><ServiceLineBadgeDetalhe /></RotaProtegida>
      } />
      <Route path="/sl/consultores" element={
        <RotaProtegida perfis={['Service Line']}><ServiceLineConsultores /></RotaProtegida>
      } />
      <Route path="/sl/consultores/:id" element={
        <RotaProtegida perfis={['Service Line']}><ServiceLineConsultorPerfil /></RotaProtegida>
      } />
      <Route path="/sl/relatorios" element={
        <RotaProtegida perfis={['Service Line']}><ServiceLineRelatorios /></RotaProtegida>
      } />
      <Route path="/sl/ranking" element={
        <RotaProtegida perfis={['Service Line']}><ServiceLineRanking /></RotaProtegida>
      } />
      <Route path="/sl/historico" element={
        <RotaProtegida perfis={['Service Line']}><ServiceLineHistorico /></RotaProtegida>
      } />
      <Route path="/sl/conquistas" element={
        <RotaProtegida perfis={['Service Line']}><ServiceLineConquistas /></RotaProtegida>
      } />
      <Route path="/sl/*" element={
        <RotaProtegida perfis={['Service Line']}><PerfilEmDesenvolvimento /></RotaProtegida>
      } />

      {/* Rotas do Talent Manager */}
      <Route path="/tm/dashboard" element={
        <RotaProtegida perfis={['Talent Manager']}><TalentDashboard /></RotaProtegida>
      } />
      <Route path="/tm/candidaturas" element={
        <RotaProtegida perfis={['Talent Manager']}><TalentCandidaturas /></RotaProtegida>
      } />
      <Route path="/tm/badges" element={
        <RotaProtegida perfis={['Talent Manager']}><TalentBadges /></RotaProtegida>
      } />
      <Route path="/tm/badges/:id" element={
        <RotaProtegida perfis={['Talent Manager']}><TalentBadgeDetalhe /></RotaProtegida>
      } />
      <Route path="/tm/relatorios" element={
        <RotaProtegida perfis={['Talent Manager']}><TalentRelatorios /></RotaProtegida>
      } />
      <Route path="/tm/notificacoes" element={
        <RotaProtegida perfis={['Talent Manager']}><TalentNotificacoes /></RotaProtegida>
      } />
      <Route path="/tm/perfil" element={
        <RotaProtegida perfis={['Talent Manager']}><TalentPerfil /></RotaProtegida>
      } />
      <Route path="/tm/pedidos" element={
        <RotaProtegida perfis={['Talent Manager']}><TalentPedidos /></RotaProtegida>
      } />
      <Route path="/tm/pedidos/:id" element={
        <RotaProtegida perfis={['Talent Manager']}><TalentPedidoDetalhe /></RotaProtegida>
      } />
      <Route path="/tm/*" element={
        <RotaProtegida perfis={['Talent Manager']}><PerfilEmDesenvolvimento /></RotaProtegida>
      } />

      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center text-slate-500">
          <div className="text-center">
            <div className="text-6xl">🔍</div>
            <div className="mt-3 text-lg font-semibold">Página não encontrada</div>
            <a href="/" className="link text-sm">Voltar ao início</a>
          </div>
        </div>
      } />
    </Routes>
  );
}
