import { Navigate, Route, Routes } from 'react-router-dom';
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
import Admin from './pages/admin/Admin';
import ConsultorDashboard from './pages/consultor/Dashboard';
import CatalogoBadges from './pages/consultor/CatalogoBadges';
import MeusBadges from './pages/consultor/MeusBadges';

function PerfilEmDesenvolvimento() {
  const { utilizador } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f6fa] px-6 text-slate-900">
      <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-softinsa-600 text-lg font-bold text-white">
          S
        </div>
        <h1 className="mt-5 text-2xl font-bold">Perfil em desenvolvimento</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          A experiência para o perfil {utilizador?.perfis?.join(', ') || 'utilizador'} ainda está a ser construída.
          Neste momento, o foco ativo é o perfil de Administrador.
        </p>
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
  return <PerfilEmDesenvolvimento />;
}

export default function App() {
  return (
    <Routes>
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
        <RotaProtegida perfis={['Administrador']}><Admin /></RotaProtegida>
      } />
      {/* Rotas do Consultor */}
      <Route path="/dashboard" element={
        <RotaProtegida perfis={['Consultor', 'Administrador']}><ConsultorDashboard /></RotaProtegida>
      } />
      <Route path="/badges" element={<RotaProtegida><CatalogoBadges /></RotaProtegida>} />
      <Route path="/badges/:id" element={<RotaProtegida><PerfilEmDesenvolvimento /></RotaProtegida>} />
      <Route path="/candidaturas" element={<RotaProtegida><PerfilEmDesenvolvimento /></RotaProtegida>} />
      <Route path="/candidaturas/:id" element={<RotaProtegida><PerfilEmDesenvolvimento /></RotaProtegida>} />
      <Route path="/candidaturas/nova" element={<RotaProtegida><PerfilEmDesenvolvimento /></RotaProtegida>} />
      <Route path="/meus-badges" element={<RotaProtegida><MeusBadges /></RotaProtegida>} />
      <Route path="/conquistas" element={<RotaProtegida><PerfilEmDesenvolvimento /></RotaProtegida>} />
      <Route path="/notificacoes" element={<RotaProtegida><PerfilEmDesenvolvimento /></RotaProtegida>} />
      <Route path="/perfil" element={<RotaProtegida><PerfilEmDesenvolvimento /></RotaProtegida>} />
      <Route path="/gestao" element={<RotaProtegida><PerfilEmDesenvolvimento /></RotaProtegida>} />

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
