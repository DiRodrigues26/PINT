import { Component, lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import RotaProtegida from './components/RotaProtegida';
import Carregando from './components/Carregando';
import { useAuth } from './context/AuthContext';

function erroCarregamentoChunk(error) {
  const mensagem = String(error?.message || error || '').toLowerCase();
  return mensagem.includes('failed to fetch dynamically imported module')
    || mensagem.includes('loading chunk')
    || mensagem.includes('importing a module script failed')
    || mensagem.includes('dynamically imported module');
}

class LazyErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro) {
    if (erroCarregamentoChunk(erro) && sessionStorage.getItem('chunk_reload_tentado') !== '1') {
      sessionStorage.setItem('chunk_reload_tentado', '1');
      window.location.reload();
    }
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#f3f6fa] px-6 text-center">
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-bold text-slate-900">Não foi possível carregar a página</h1>
            <p className="mt-2 text-sm text-slate-500">
              Atualize a página para carregar a versão mais recente da aplicação.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-softinsa-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700"
            >
              Atualizar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Importações Lazy das páginas por perfil
// Auth
const Login = lazy(() => import('./pages/auth/Login'));
const Registo = lazy(() => import('./pages/auth/Registo'));
const VerificarEmail = lazy(() => import('./pages/auth/VerificarEmail'));
const ConfirmarEmail = lazy(() => import('./pages/auth/ConfirmarEmail'));
const CompletarPerfil = lazy(() => import('./pages/auth/CompletarPerfil'));
const RecuperarPassword = lazy(() => import('./pages/auth/RecuperarPassword'));
const NovaPassword = lazy(() => import('./pages/auth/NovaPassword'));
const AlterarPasswordInicial = lazy(() => import('./pages/auth/AlterarPasswordInicial'));

// Admin
const AdminAreas = lazy(() => import('./pages/admin/AdminAreas'));
const AdminAvisos = lazy(() => import('./pages/admin/AdminAvisos'));
const AdminBadges = lazy(() => import('./pages/admin/AdminBadges'));
const AdminCandidaturas = lazy(() => import('./pages/admin/AdminCandidaturas'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminEventosEspeciais = lazy(() => import('./pages/admin/AdminEventosEspeciais'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminLearningPaths = lazy(() => import('./pages/admin/AdminLearningPaths'));
const AdminNiveis = lazy(() => import('./pages/admin/AdminNiveis'));
const AdminNotificacoes = lazy(() => import('./pages/admin/AdminNotificacoes'));
const AdminNotificacoesDefinicoes = lazy(() => import('./pages/admin/AdminNotificacoesDefinicoes'));
const AdminPerfil = lazy(() => import('./pages/admin/AdminPerfil'));
const AdminRelatorios = lazy(() => import('./pages/admin/AdminRelatorios'));
const AdminPontos = lazy(() => import('./pages/admin/AdminPontos'));
const AdminRequisitos = lazy(() => import('./pages/admin/AdminRequisitos'));
const AdminRGPD = lazy(() => import('./pages/admin/AdminRGPD'));
const AdminServiceLines = lazy(() => import('./pages/admin/AdminServiceLines'));
const AdminSLA = lazy(() => import('./pages/admin/AdminSLA'));
const AdminTemplatesEmail = lazy(() => import('./pages/admin/AdminTemplatesEmail'));
const AdminUtilizadores = lazy(() => import('./pages/admin/AdminUtilizadores'));

// Service Line
const ServiceLineDashboard = lazy(() => import('./pages/serviceLine/Dashboard'));
const ServiceLinePerfil = lazy(() => import('./pages/serviceLine/Perfil'));
const ServiceLineNotificacoes = lazy(() => import('./pages/serviceLine/Notificacoes'));
const ServiceLinePedidos = lazy(() => import('./pages/serviceLine/Pedidos'));
const ServiceLinePedidoDetalhe = lazy(() => import('./pages/serviceLine/PedidoDetalhe'));
const ServiceLineBadges = lazy(() => import('./pages/serviceLine/Badges'));
const ServiceLineBadgeDetalhe = lazy(() => import('./pages/serviceLine/BadgeDetalhe'));
const ServiceLineConsultores = lazy(() => import('./pages/serviceLine/Consultores'));
const ServiceLineConsultorPerfil = lazy(() => import('./pages/serviceLine/ConsultorPerfil'));
const ServiceLineRelatorios = lazy(() => import('./pages/serviceLine/Relatorios'));
const ServiceLineRanking = lazy(() => import('./pages/serviceLine/RankingPontos'));
const ServiceLineHistorico = lazy(() => import('./pages/serviceLine/Historico'));
const ServiceLineConquistas = lazy(() => import('./pages/serviceLine/Conquistas'));
const ServiceLineAvisos = lazy(() => import('./pages/serviceLine/Avisos'));

// Consultor
const ConsultorDashboard = lazy(() => import('./pages/consultor/Dashboard'));
const CatalogoBadges = lazy(() => import('./pages/consultor/CatalogoBadges'));
const MeusBadges = lazy(() => import('./pages/consultor/MeusBadges'));
const Candidaturas = lazy(() => import('./pages/consultor/Candidaturas'));
const CandidaturaDetalhe = lazy(() => import('./pages/consultor/CandidaturaDetalhe'));
const Conquistas = lazy(() => import('./pages/consultor/Conquistas'));
const ObjetivosConsultor = lazy(() => import('./pages/consultor/Objetivos'));
const Lembretes = lazy(() => import('./pages/consultor/Lembretes'));
const Notificacoes = lazy(() => import('./pages/consultor/Notificacoes'));
const Perfil = lazy(() => import('./pages/consultor/Perfil'));
const BadgeDetalhe = lazy(() => import('./pages/consultor/BadgeDetalhe'));
const AssinaturaEmail = lazy(() => import('./pages/consultor/AssinaturaEmail'));

// Público
const VerificarBadge = lazy(() => import('./pages/publico/VerificarBadge'));
const BadgePublico = lazy(() => import('./pages/publico/BadgePublico'));
const PerfilPublico = lazy(() => import('./pages/publico/PerfilPublico'));
const Microsite = lazy(() => import('./pages/publico/Microsite'));

// Talent Manager
const TalentDashboard = lazy(() => import('./pages/talentManager/Dashboard'));
const TalentCandidaturas = lazy(() => import('./pages/talentManager/Candidaturas'));
const TalentBadges = lazy(() => import('./pages/talentManager/Badges'));
const TalentBadgeDetalhe = lazy(() => import('./pages/talentManager/BadgeDetalhe'));
const TalentRelatorios = lazy(() => import('./pages/talentManager/Relatorios'));
const TalentHistorico = lazy(() => import('./pages/talentManager/Historico'));
const TalentNotificacoes = lazy(() => import('./pages/talentManager/Notificacoes'));
const TalentPerfil = lazy(() => import('./pages/talentManager/Perfil'));

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
    <LazyErrorBoundary>
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f3f6fa]">
          <Carregando texto="A carregar a plataforma..." />
        </div>
      }>
        <Routes>
        {/* Páginas públicas (sem autenticação) */}
        <Route path="/microsite" element={<Microsite />} />
        <Route path="/projeto" element={<Navigate to="/microsite" replace />} />
        <Route path="/verificar/:token" element={<VerificarBadge />} />
        <Route path="/badge/:id" element={<BadgePublico />} />
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
          <Route path="templates-email" element={<AdminTemplatesEmail />} />
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
      <Route path="/objetivos" element={<RotaProtegida perfis={['Consultor']}><ObjetivosConsultor /></RotaProtegida>} />
      <Route path="/lembretes" element={<RotaProtegida perfis={['Consultor']}><Lembretes /></RotaProtegida>} />
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
        <Route path="/sl/avisos" element={
          <RotaProtegida perfis={['Service Line']}><ServiceLineAvisos /></RotaProtegida>
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
        <Route path="/tm/historico" element={
          <RotaProtegida perfis={['Talent Manager']}><TalentHistorico /></RotaProtegida>
        } />
        <Route path="/tm/notificacoes" element={
          <RotaProtegida perfis={['Talent Manager']}><TalentNotificacoes /></RotaProtegida>
        } />
        <Route path="/tm/perfil" element={
          <RotaProtegida perfis={['Talent Manager']}><TalentPerfil /></RotaProtegida>
        } />
        {/* Ecrã antigo de "pedidos" substituído por "candidaturas" */}
        <Route path="/tm/pedidos" element={<Navigate to="/tm/candidaturas" replace />} />
        <Route path="/tm/pedidos/:id" element={<Navigate to="/tm/candidaturas" replace />} />
        {/* /tm e qualquer rota TM desconhecida → dashboard */}
        <Route path="/tm" element={<Navigate to="/tm/dashboard" replace />} />
        <Route path="/tm/*" element={<Navigate to="/tm/dashboard" replace />} />

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
      </Suspense>
    </LazyErrorBoundary>
  );
}
