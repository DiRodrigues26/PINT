import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RotaProtegida from './components/RotaProtegida';
import Login from './pages/Login';
import Registo from './pages/Registo';
import VerificarEmail from './pages/VerificarEmail';
import ConfirmarEmail from './pages/ConfirmarEmail';
import CompletarPerfil from './pages/CompletarPerfil';
import RecuperarPassword from './pages/RecuperarPassword';
import NovaPassword from './pages/NovaPassword';
import AlterarPasswordInicial from './pages/AlterarPasswordInicial';
import Dashboard from './pages/Dashboard';
import Badges from './pages/Badges';
import BadgeDetalhe from './pages/BadgeDetalhe';
import Candidaturas from './pages/Candidaturas';
import CandidaturaDetalhe from './pages/CandidaturaDetalhe';
import MeusBadges from './pages/MeusBadges';
import Conquistas from './pages/Conquistas';
import Notificacoes from './pages/Notificacoes';
import Admin from './pages/Admin';
import Gestao from './pages/Gestao';

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

      <Route path="/" element={<RotaProtegida><Layout /></RotaProtegida>}>
        <Route index element={<Dashboard />} />
        <Route path="badges" element={<Badges />} />
        <Route path="badges/:id" element={<BadgeDetalhe />} />
        <Route path="candidaturas" element={<Candidaturas />} />
        <Route path="candidaturas/:id" element={<CandidaturaDetalhe />} />
        <Route path="meus-badges" element={<MeusBadges />} />
        <Route path="conquistas" element={<Conquistas />} />
        <Route path="notificacoes" element={<Notificacoes />} />
        <Route path="admin" element={
          <RotaProtegida perfis={['Administrador']}><Admin /></RotaProtegida>
        } />
        <Route path="gestao" element={
          <RotaProtegida perfis={['Administrador', 'Talent Manager', 'Service Line']}><Gestao /></RotaProtegida>
        } />
      </Route>

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
